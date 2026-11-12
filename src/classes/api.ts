/* Mentor class codes: the only thing in Nebula that talks to a server.

   The server is a Supabase project set up by supabase/migrations/0001_classes.sql. The browser
   calls its database functions over plain fetch with the public "anon" key (no SDK, so no new
   dependency). The tables themselves are closed to that key; every function checks a secret
   first. See docs/CLASSES.md for what is stored and why.

   With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY unset (the default, and every local
   checkout), classesEnabled() is false and nothing here is ever called. */

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const classesEnabled = (): boolean => URL_ !== '' && KEY !== '';

export interface ClassReport {
  code: string;
  name: string;
  members: { id: string; nickname: string; joined_at: string; passes: { lesson_id: string; passed_at: string }[] }[];
}
export interface Joined { member_id: string; token: string; code: string; class_name: string; nickname: string }
export interface Created { code: string; mentor_key: string; name: string }
export interface MemberStatus { code: string; class_name: string; nickname: string }

/** A failed call, with a sentence a kid or mentor can act on. */
export class ClassError extends Error {
  constructor(readonly reason: string, message: string) { super(message); }
}

const MESSAGES: Record<string, string> = {
  no_such_class: 'There is no class with that code. Check the letters with your mentor.',
  nickname_taken: 'Someone in this class already has that nickname. Try another one.',
  bad_nickname: 'A nickname needs 1 to 24 letters.',
  bad_name: 'A class name needs 1 to 60 letters.',
  class_full: 'This class is full. Ask your mentor about it.',
  not_your_class: 'That class code and key do not match. Check both and try again.',
  not_a_member: 'You are no longer in that class.',
  wrong_passphrase: 'That mentor password is not right. Ask your lead mentor for it.',
  classes_locked: 'Making classes is not switched on yet. Ask whoever set up Nebula for your team.',
  network: 'Nebula could not reach the class server. Your progress is safe here; it will try again later.',
};

async function rpc<T>(fn: string, args: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<T> {
  if (!classesEnabled()) throw new ClassError('disabled', 'Classes are not set up on this copy of Nebula.');
  let response: Response;
  try {
    response = await fetchImpl(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    throw new ClassError('network', MESSAGES.network!);
  }
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const reason = (body as { message?: string } | null)?.message ?? 'unknown';
    throw new ClassError(reason, MESSAGES[reason] ?? 'Something went wrong with the class server. Try again in a minute.');
  }
  return body as T;
}

export const api = {
  createClass: (name: string, passphrase: string) => rpc<Created>('nebula_create_class', { p_name: name, p_passphrase: passphrase }),
  classReport: (code: string, key: string) => rpc<ClassReport>('nebula_class_report', { p_code: code, p_key: key }),
  removeMember: (code: string, key: string, member: string) => rpc<null>('nebula_remove_member', { p_code: code, p_key: key, p_member: member }),
  deleteClass: (code: string, key: string) => rpc<null>('nebula_delete_class', { p_code: code, p_key: key }),
  joinClass: (code: string, nickname: string) => rpc<Joined>('nebula_join_class', { p_code: code, p_nickname: nickname }),
  recordPasses: (member: string, token: string, passes: { lesson_id: string; passed_at: string }[]) =>
    rpc<null>('nebula_record_passes', { p_member: member, p_token: token, p_passes: passes }),
  memberStatus: (member: string, token: string) => rpc<MemberStatus | null>('nebula_member_status', { p_member: member, p_token: token }),
  leaveClass: (member: string, token: string) => rpc<null>('nebula_leave_class', { p_member: member, p_token: token }),
};

/** For tests: the same call with a stand-in fetch. */
export const rpcForTest = rpc;
