# Privacy audit: what the built site sends, and where

Kids use this site, so it is treated as child-directed under COPPA principles: collect nothing,
set no cookies, load no third-party scripts or fonts, keep progress on the device. This file
records how that was checked, so it can be checked again.

## How to re-run it

1. `npm run build` with the same settings as the live site (`.env.local` holding the Supabase
   URL and anon key, as GitHub Actions has).
2. `npx vite preview --port 5200`.
3. In a fresh browser profile, open every route (`#/`, `#/chart`, two lessons, `#/progress`,
   `#/mentor`, a mentor guide, `#/about`, `#/class/<code>`), scroll the home page to the end,
   run lesson 1 and press Check, and record every request, cookie and storage key.

## Result, 2026-11-12

Before: every page load fetched two stylesheets from `fonts.googleapis.com` and three font files
from `fonts.gstatic.com`. That sends the visitor's IP address, browser and the page's address to
Google on every visit. Fixed by serving the three faces from `public/fonts/` (OFL licences beside
them).

After, on every route:

| Goes to | What | When |
|---|---|---|
| this site only | the page, its scripts, one stylesheet, images, 3 font files | every visit |
| nobody else | nothing | never, unless a class code is used (below) |

- Cookies: none. sessionStorage: none. Service workers: none. No analytics, no third-party script,
  no font or image from another origin.
- localStorage, on this device only: `nebula.progress.v1` (passed lessons, drafts of code, mode,
  display settings; exported and imported as a file from Progress), and only if classes are used,
  `nebula-class-v1` (the kid's class code, nickname, member id and secret token) and
  `nebula-mentor-classes-v1` (classes this mentor made, with their mentor keys).

## The one exception: mentor class codes (opt-in)

When a mentor makes a class, or a kid joins one with a code, the browser calls our Supabase
project (`<project>.supabase.co`, in the US) directly. Nothing is sent before someone chooses to
do that: the code checks for a stored class before every call (`src/classes/membership.ts`).
What it sends and stores is in docs/CLASSES.md: a class name, a nickname the kid types, which
lessons they passed and when. Supabase, as the host, also sees the device's IP address on those
calls, as any server does; we do not store it. With the Supabase settings left out of the build,
the feature does not exist and the table above is the whole story.

This is the part a reviewer should look at hardest: a nickname tied to a class and a lesson list
is small, but it is information about a child that leaves the device.
