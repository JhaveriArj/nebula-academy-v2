import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pathway } from '../src/content/loader';

/* Mentor class codes, against a stand-in for the Supabase REST endpoint. The SQL itself is in
   supabase/migrations/0001_classes.sql; these check the browser side: nothing is called when
   classes are not configured, errors become sentences, and only lesson ids and times leave
   the browser. */

const lessonA = pathway.tiers[0]!.lessons[0]!.id;
const lessonB = pathway.tiers[0]!.lessons[1]!.id;

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

type Call = { url: string; body: Record<string, unknown> };

function fakeServer(handlers: Record<string, (body: Record<string, unknown>) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push({ url, body });
    const fn = url.split('/rpc/')[1]!;
    const handler = handlers[fn];
    if (!handler) return new Response(JSON.stringify({ message: 'unknown' }), { status: 404 });
    const { status = 200, json } = handler(body);
    return new Response(json === null ? '' : JSON.stringify(json), { status });
  });
  return { calls, fetchFn };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('classes switched off', () => {
  it('reports disabled and calls nothing when the Supabase settings are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { fetchFn } = fakeServer({});
    vi.stubGlobal('fetch', fetchFn);
    const { classesEnabled } = await import('../src/classes/api');
    const { syncPasses } = await import('../src/classes/membership');
    expect(classesEnabled()).toBe(false);
    await syncPasses();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('classes switched on', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co/');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('turns a server error into a sentence a kid can act on', async () => {
    const { fetchFn } = fakeServer({ nebula_join_class: () => ({ status: 400, json: { message: 'nickname_taken' } }) });
    vi.stubGlobal('fetch', fetchFn);
    const { joinClass } = await import('../src/classes/membership');
    await expect(joinClass('abc234', 'Ada')).rejects.toThrow(/already has that nickname/);
  });

  it('says the server could not be reached when fetch fails, and keeps the passes queued', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const { joinClass } = await import('../src/classes/membership');
    await expect(joinClass('ABC234', 'Ada')).rejects.toThrow(/could not reach the class server/);
  });

  it('joins with an upper-case code, then sends only lesson ids and times, once each', async () => {
    const { calls, fetchFn } = fakeServer({
      nebula_join_class: (b) => ({ json: { member_id: 'm1', token: 't1', code: String(b.p_code), class_name: 'Tuesday', nickname: String(b.p_nickname) } }),
      nebula_record_passes: () => ({ json: null }),
    });
    vi.stubGlobal('fetch', fetchFn);
    const store = await import('../src/progress/store');
    store.markPassed(lessonA);
    store.setDraft(lessonA, 'secret code the mentor never sees');
    const { joinClass, syncPasses, membership } = await import('../src/classes/membership');

    const m = await joinClass(' abc234 ', ' Ada ');
    expect(calls[0]!.url).toBe('https://example.supabase.co/rest/v1/rpc/nebula_join_class');
    expect(calls[0]!.body).toEqual({ p_code: 'ABC234', p_nickname: 'Ada' });
    expect(m.className).toBe('Tuesday');

    const sent = calls.find((c) => c.url.endsWith('nebula_record_passes'))!;
    expect(sent.body.p_member).toBe('m1');
    expect(sent.body.p_token).toBe('t1');
    const passes = sent.body.p_passes as Record<string, unknown>[];
    expect(passes.map((p) => p.lesson_id)).toEqual([lessonA]);
    expect(Object.keys(passes[0]!).sort()).toEqual(['lesson_id', 'passed_at']);
    expect(JSON.stringify(calls)).not.toContain('secret code');
    expect(membership()!.sent).toEqual([lessonA]);

    // Nothing new: no call. A new pass: only that one.
    const before = calls.length;
    await syncPasses();
    expect(calls.length).toBe(before);
    store.markPassed(lessonB);
    await syncPasses();
    const last = calls[calls.length - 1]!;
    expect((last.body.p_passes as { lesson_id: string }[]).map((p) => p.lesson_id)).toEqual([lessonB]);
  });

  it('forgets the class here when the mentor has removed the kid', async () => {
    const { fetchFn } = fakeServer({
      nebula_join_class: () => ({ json: { member_id: 'm1', token: 't1', code: 'ABC234', class_name: 'Tuesday', nickname: 'Ada' } }),
      nebula_record_passes: () => ({ json: null }),
      nebula_member_status: () => ({ json: null }),
    });
    vi.stubGlobal('fetch', fetchFn);
    const { joinClass, refreshMembership, membership } = await import('../src/classes/membership');
    await joinClass('ABC234', 'Ada');
    expect(membership()).not.toBeNull();
    expect(await refreshMembership()).toBeNull();
    expect(membership()).toBeNull();
  });

  it('keeps a made class and its key in this browser only', async () => {
    const { fetchFn, calls } = fakeServer({ nebula_create_class: () => ({ json: { code: 'XYZ789', mentor_key: 'k'.repeat(36), name: 'Tuesday' } }) });
    vi.stubGlobal('fetch', fetchFn);
    const { createClass, mentorClasses } = await import('../src/classes/membership');
    const store = await import('../src/progress/store');
    await createClass('Tuesday', 'pass-word');
    expect(calls[0]!.body).toEqual({ p_name: 'Tuesday', p_passphrase: 'pass-word' });
    expect(mentorClasses()).toEqual([{ code: 'XYZ789', name: 'Tuesday', key: 'k'.repeat(36) }]);
    expect(store.exportJson()).not.toContain('k'.repeat(36));
  });

  it('needs the mentor password to make a class, and never keeps it', async () => {
    const { fetchFn } = fakeServer({ nebula_create_class: () => ({ status: 400, json: { message: 'wrong_passphrase' } }) });
    vi.stubGlobal('fetch', fetchFn);
    const { createClass, mentorClasses } = await import('../src/classes/membership');
    await expect(createClass('Tuesday', 'not-it')).rejects.toThrow('mentor password is not right');
    expect(mentorClasses()).toEqual([]);
    const store = await import('../src/progress/store');
    const stored = [localStorage.getItem('nebula-mentor-classes-v1'), localStorage.getItem('nebula-class-v1'), store.exportJson()].join('');
    expect(stored).not.toContain('not-it');
  });
});
