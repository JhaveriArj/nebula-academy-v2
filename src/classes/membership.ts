import { api, classesEnabled, ClassError } from './api';
import { load } from '../progress/store';

/* What this browser remembers about classes, kept apart from the progress file so a saved
   progress file never carries a class secret to another computer.

   A kid: which class they joined, their nickname, the secret token that proves it is them,
   and which passes have already been sent. A mentor: the classes they made, each with its
   secret key. Both live in localStorage only. */

const KID_KEY = 'nebula-class-v1';
const MENTOR_KEY = 'nebula-mentor-classes-v1';

export interface Membership { code: string; className: string; nickname: string; memberId: string; token: string; sent: string[] }
export interface MentorClass { code: string; name: string; key: string }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the class link is lost for this visit, the lessons are not.
  }
}

export const membership = (): Membership | null => read<Membership | null>(KID_KEY, null);

export async function joinClass(code: string, nickname: string): Promise<Membership> {
  const joined = await api.joinClass(code.trim().toUpperCase(), nickname.trim());
  const m: Membership = { code: joined.code, className: joined.class_name, nickname: joined.nickname, memberId: joined.member_id, token: joined.token, sent: [] };
  write(KID_KEY, m);
  await syncPasses();
  return m;
}

export async function leaveClass(): Promise<void> {
  const m = membership();
  if (!m) return;
  try {
    await api.leaveClass(m.memberId, m.token);
  } catch (error) {
    // Already removed by the mentor: leaving here is all that is left to do.
    if (!(error instanceof ClassError && error.reason === 'not_a_member')) throw error;
  }
  write(KID_KEY, null);
}

/** Checks the kid is still in the class; forgets it here if the mentor removed them. */
export async function refreshMembership(): Promise<Membership | null> {
  const m = membership();
  if (!m || !classesEnabled()) return m;
  const status = await api.memberStatus(m.memberId, m.token);
  if (!status) {
    write(KID_KEY, null);
    return null;
  }
  const next = { ...m, className: status.class_name, nickname: status.nickname };
  write(KID_KEY, next);
  return next;
}

let syncing: Promise<void> | null = null;
let again = false;

/** Sends every passed lesson the class has not heard about yet. Safe to call often; a
    failure leaves them queued for the next call. Only lesson ids and times are sent. A call
    that lands while a send is running is not lost: it runs once more when that one ends. */
export function syncPasses(): Promise<void> {
  if (syncing) { again = true; return syncing; }
  syncing = (async () => {
    const m = membership();
    if (!m || !classesEnabled()) return;
    const lessons = load().lessons;
    const unsent = Object.entries(lessons)
      .filter(([id, l]) => l.passed && !m.sent.includes(id))
      .map(([id, l]) => ({ lesson_id: id, passed_at: l.passedAt ?? new Date().toISOString() }));
    if (unsent.length === 0) return;
    try {
      await api.recordPasses(m.memberId, m.token, unsent);
      const latest = membership();
      if (latest && latest.memberId === m.memberId) write(KID_KEY, { ...latest, sent: [...new Set([...latest.sent, ...unsent.map((u) => u.lesson_id)])] });
    } catch (error) {
      if (error instanceof ClassError && error.reason === 'not_a_member') write(KID_KEY, null);
    }
  })().finally(() => {
    syncing = null;
    if (again) { again = false; void syncPasses(); }
  });
  return syncing;
}

export const mentorClasses = (): MentorClass[] => read<MentorClass[]>(MENTOR_KEY, []);

/** Makes a class. The mentor password is sent once and never kept in this browser. */
export async function createClass(name: string, passphrase: string): Promise<MentorClass> {
  const created = await api.createClass(name.trim(), passphrase);
  const c: MentorClass = { code: created.code, name: created.name, key: created.mentor_key };
  write(MENTOR_KEY, [...mentorClasses().filter((x) => x.code !== c.code), c]);
  return c;
}

/** A class made on another computer: the mentor types its code and key. */
export async function addExistingClass(code: string, key: string): Promise<MentorClass> {
  const report = await api.classReport(code.trim().toUpperCase(), key.trim());
  const c: MentorClass = { code: report.code, name: report.name, key: key.trim() };
  write(MENTOR_KEY, [...mentorClasses().filter((x) => x.code !== c.code), c]);
  return c;
}

export function forgetClass(code: string): void {
  write(MENTOR_KEY, mentorClasses().filter((c) => c.code !== code));
}

export async function deleteClass(c: MentorClass): Promise<void> {
  await api.deleteClass(c.code, c.key);
  forgetClass(c.code);
}
