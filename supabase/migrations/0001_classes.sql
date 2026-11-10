-- Nebula Academy: mentor class codes.
--
-- What is stored, and nothing else:
--   classes  a name the mentor typed, a six-letter code, and a hash of the mentor's key
--   members  a nickname the kid typed, the class it belongs to, and a hash of the kid's token
--   passes   which lesson a member passed, and when
-- No emails, no real names asked for, no code, no IP addresses, no analytics.
--
-- The browser talks to Supabase with the public "anon" key, so the tables are closed to it
-- entirely (row level security on, no policies, privileges revoked). Everything goes through
-- the functions at the bottom, which run as the owner and check a secret first: the mentor's
-- key for anything about a whole class, the kid's token for anything about one kid.
--
-- Run this once in the Supabase SQL editor (or `supabase db push`). It is safe to re-run.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.classes (
  code            text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name            text not null check (char_length(name) between 1 and 60),
  mentor_key_hash text not null,
  created_at      timestamptz not null default now()
);

create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  class_code  text not null references public.classes (code) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 24),
  token_hash  text not null,
  joined_at   timestamptz not null default now(),
  unique (class_code, nickname)
);

create table if not exists public.passes (
  member_id  uuid not null references public.members (id) on delete cascade,
  lesson_id  text not null check (lesson_id ~ '^t[0-5]-[a-z0-9-]{1,60}$'),
  passed_at  timestamptz not null,
  primary key (member_id, lesson_id)
);

alter table public.classes enable row level security;
alter table public.members enable row level security;
alter table public.passes  enable row level security;
revoke all on public.classes, public.members, public.passes from anon, authenticated, public;

-- ---------------------------------------------------------------- helpers (not callable)

create or replace function public._nebula_hash(secret text) returns text
language sql immutable as $$
  select encode(extensions.digest(secret, 'sha256'), 'hex')
$$;

create or replace function public._nebula_secret() returns text
language sql volatile as $$
  select encode(extensions.gen_random_bytes(18), 'hex')
$$;

create or replace function public._nebula_mentor_ok(p_code text, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes
    where code = upper(p_code) and mentor_key_hash = _nebula_hash(coalesce(p_key, ''))
  )
$$;

create or replace function public._nebula_member_ok(p_member uuid, p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = p_member and token_hash = _nebula_hash(coalesce(p_token, ''))
  )
$$;

-- ---------------------------------------------------------------- mentor

-- Makes a class. Returns its code (to hand out) and the mentor key (shown once, kept in the
-- mentor's browser; only its hash is stored).
create or replace function public.nebula_create_class(p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_key  text := _nebula_secret();
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) not between 1 and 60 then
    raise exception 'bad_name';
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from classes where code = v_code);
  end loop;
  insert into classes (code, name, mentor_key_hash) values (v_code, v_name, _nebula_hash(v_key));
  return json_build_object('code', v_code, 'mentor_key', v_key, 'name', v_name);
end
$$;

-- Everything a mentor sees: the class name, and per kid their nickname and passes.
create or replace function public.nebula_class_report(p_code text, p_key text) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not _nebula_mentor_ok(p_code, p_key) then
    raise exception 'not_your_class';
  end if;
  return (
    select json_build_object(
      'code', c.code,
      'name', c.name,
      'members', coalesce((
        select json_agg(json_build_object(
          'id', m.id,
          'nickname', m.nickname,
          'joined_at', m.joined_at,
          'passes', coalesce((
            select json_agg(json_build_object('lesson_id', p.lesson_id, 'passed_at', p.passed_at) order by p.passed_at)
            from passes p where p.member_id = m.id
          ), '[]'::json)
        ) order by lower(m.nickname))
        from members m where m.class_code = c.code
      ), '[]'::json)
    )
    from classes c where c.code = upper(p_code)
  );
end
$$;

create or replace function public.nebula_remove_member(p_code text, p_key text, p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _nebula_mentor_ok(p_code, p_key) then
    raise exception 'not_your_class';
  end if;
  delete from members where id = p_member and class_code = upper(p_code);
end
$$;

-- Deletes the class and, by cascade, every member and pass in it.
create or replace function public.nebula_delete_class(p_code text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _nebula_mentor_ok(p_code, p_key) then
    raise exception 'not_your_class';
  end if;
  delete from classes where code = upper(p_code);
end
$$;

-- ---------------------------------------------------------------- kid

create or replace function public.nebula_join_class(p_code text, p_nickname text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_class classes%rowtype;
  v_token text := _nebula_secret();
  v_nick  text := btrim(coalesce(p_nickname, ''));
  v_id    uuid;
begin
  select * into v_class from classes where code = upper(btrim(coalesce(p_code, '')));
  if not found then
    raise exception 'no_such_class';
  end if;
  if char_length(v_nick) not between 1 and 24 then
    raise exception 'bad_nickname';
  end if;
  if (select count(*) from members where class_code = v_class.code) >= 80 then
    raise exception 'class_full';
  end if;
  if exists (select 1 from members where class_code = v_class.code and lower(nickname) = lower(v_nick)) then
    raise exception 'nickname_taken';
  end if;
  insert into members (class_code, nickname, token_hash)
    values (v_class.code, v_nick, _nebula_hash(v_token))
    returning id into v_id;
  return json_build_object('member_id', v_id, 'token', v_token, 'code', v_class.code, 'class_name', v_class.name, 'nickname', v_nick);
end
$$;

-- Records passes. Idempotent; a time in the future is taken as now.
create or replace function public.nebula_record_passes(p_member uuid, p_token text, p_passes json) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _nebula_member_ok(p_member, p_token) then
    raise exception 'not_a_member';
  end if;
  insert into passes (member_id, lesson_id, passed_at)
  select p_member, x.lesson_id, least(coalesce(x.passed_at, now()), now())
  from json_to_recordset(p_passes) as x(lesson_id text, passed_at timestamptz)
  where x.lesson_id ~ '^t[0-5]-[a-z0-9-]{1,60}$'
  limit 100
  on conflict do nothing;
end
$$;

-- Whether this kid is still in the class (the mentor may have removed them).
create or replace function public.nebula_member_status(p_member uuid, p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not _nebula_member_ok(p_member, p_token) then
    return null;
  end if;
  return (
    select json_build_object('code', c.code, 'class_name', c.name, 'nickname', m.nickname)
    from members m join classes c on c.code = m.class_code where m.id = p_member
  );
end
$$;

-- Leaving deletes the kid's nickname and every pass with it.
create or replace function public.nebula_leave_class(p_member uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not _nebula_member_ok(p_member, p_token) then
    raise exception 'not_a_member';
  end if;
  delete from members where id = p_member;
end
$$;

-- ---------------------------------------------------------------- who may call what

revoke all on function
  public._nebula_hash(text), public._nebula_secret(),
  public._nebula_mentor_ok(text, text), public._nebula_member_ok(uuid, text),
  public.nebula_create_class(text), public.nebula_class_report(text, text),
  public.nebula_remove_member(text, text, uuid), public.nebula_delete_class(text, text),
  public.nebula_join_class(text, text), public.nebula_record_passes(uuid, text, json),
  public.nebula_member_status(uuid, text), public.nebula_leave_class(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.nebula_create_class(text), public.nebula_class_report(text, text),
  public.nebula_remove_member(text, text, uuid), public.nebula_delete_class(text, text),
  public.nebula_join_class(text, text), public.nebula_record_passes(uuid, text, json),
  public.nebula_member_status(uuid, text), public.nebula_leave_class(uuid, text)
to anon, authenticated;
