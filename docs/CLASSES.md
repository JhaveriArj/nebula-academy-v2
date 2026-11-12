# Mentor class codes

A mentor makes a class (with the mentor password) and hands out a six-character code. Kids join from their Progress page
with the code and a nickname. The mentor then sees, per nickname, which lessons have passed
and when. There are no accounts, no emails and no passwords.

The feature is optional. With no Supabase settings at build time it does not appear, and the
site is exactly the offline, localStorage-only site described in CLAUDE.md.

## What is stored, and where

On the server (a Supabase Postgres database, `supabase/migrations/0001_classes.sql`):

| Table | Holds |
|---|---|
| `classes` | the class name the mentor typed, its code, a SHA-256 hash of the mentor key |
| `members` | the nickname the kid typed, which class, a SHA-256 hash of the kid's token, when they joined |
| `passes` | member, lesson id, when it passed |
| `nebula_settings` | one row: a bcrypt hash of the mentor password |

Never stored: emails, real names (the join form asks for a first name or a made-up name),
lesson code, drafts, mode, IP addresses, analytics. Leaving a class deletes the kid's nickname
and passes; deleting a class deletes everything in it.

In the browser (localStorage, never in the exported progress file):
`nebula-class-v1` (the kid's class, nickname, member id, token, which passes were sent) and
`nebula-mentor-classes-v1` (each class the mentor made, with its mentor key).

## How it is locked down

The site calls Supabase with the public anon key, which anyone can read from the page. So the
three tables have row level security on, no policies, and all privileges revoked: the anon key
cannot read or write them at all. The browser can only call eight database functions, which
run as the owner and check a secret first:

- whole-class actions (`nebula_class_report`, `nebula_remove_member`, `nebula_delete_class`)
  need the mentor key;
- one kid's actions (`nebula_record_passes`, `nebula_member_status`, `nebula_leave_class`) need
  that kid's token;
- `nebula_create_class` needs the mentor password, checked against its bcrypt hash;
- `nebula_join_class` needs the class code.

The mentor password stops anyone who opens the Mentor page from making classes. It is never in
this repo or the built site, and the browser does not keep it after a class is made. Until it
is set, nobody can make a class.

Known limits: anyone who has the mentor password can make classes, and anyone with a class code can join it (as anyone
with a club's room number can walk in). A class holds at most 80 members. A mentor who loses
the mentor key can no longer open the class; it can only be deleted from the Supabase
dashboard.

## Setting it up

1. Make a free project at supabase.com.
2. In the project's SQL editor, paste and run `supabase/migrations/0001_classes.sql`.
3. Set the mentor password, in the same SQL editor (pick your own; never commit it):

   ```sql
   insert into public.nebula_settings (id, mentor_passphrase_hash)
   values (true, extensions.crypt('YOUR PASSWORD', extensions.gen_salt('bf')))
   on conflict (id) do update set mentor_passphrase_hash = excluded.mentor_passphrase_hash;
   ```

   Run it again with a new password to change it. Classes already made keep working; only
   making new ones needs the new password. Give it to your mentors, not to kids.
4. From Settings › API, copy the Project URL and the anon public key.
5. Locally: copy `.env.example` to `.env.local` and fill both in, then `npm run dev`.
6. For the live site: in the GitHub repo, Settings › Secrets and variables › Actions ›
   Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then re-run the deploy.

The anon key is meant to be public; it is safe in the built site because of the lockdown above.
Never put the service role key anywhere in this repo.

## Before you use it with kids under 13

Storing even a nickname and lesson list for a child in a US class can bring COPPA into play, and
schools often have their own rules. The design keeps the data as small as it can be, but check
with your team's lead mentor or school about consent before running a class for younger kids.
