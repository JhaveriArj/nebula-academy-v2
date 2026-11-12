# Agent skills: research and install log

Skills are instructions for the coding agent (Claude Code). They are not part of the site: nothing
here ships to kids, and `npm run build` never reads `.claude/`. Vetted and installed 2026-11-12.

How they were installed: the `skills` CLI (npm `skills@1.8.1`, from vercel-labs/skills), project
scope, Claude Code only, telemetry off. The CLI sends anonymous install counts to skills.sh unless
`DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set (its README says so); we set both. It copies each
skill folder into `.claude/skills/<name>/` and records the source and a hash in `skills-lock.json`.
It adds no hooks and changes no settings (checked after install).

`.claude/skills/` is gitignored (anatomy alone is 27 MB of examples). `skills-lock.json` is
committed, so the same versions can be put back with `npx skills experimental_install`.

How each was vetted: shallow clone, read SKILL.md and README, every script the skill can tell the
agent to run, and every hook file; grep for network calls and child processes; license, last
commit and open issues from the GitHub API; installed files diffed against the vetted clone
(identical).

## Installed

### ponytail and ponytail-audit
- **What:** makes the agent write the smallest complete change and reuse what the codebase, the
  platform or the standard library already has; `ponytail-audit` is a one-shot, read-only repo
  audit ranked by importance.
- **Why:** this site's rule is "simpler for a 10-year-old"; ponytail keeps code and dependencies
  small, and its own rules never cut validation, error handling, security or accessibility.
- **Command:** `DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx -y skills@1.8.1 add DietrichGebert/ponytail --skill ponytail ponytail-audit --agent claude-code -y`

Vetting: MIT, commit 96608e0 (2026-10-29), 91 open issues. The two skill folders are one SKILL.md
each, plain instructions. The repo's Claude *plugin* (not installed) adds SessionStart,
SubagentStart and UserPromptSubmit hooks, a per-turn "ledger" written to `~/.config/ponytail/`,
and an optional webhook that sends task rows off the machine. Installing with `--skill` leaves all
of that out. Open issues about hooks (#1311, #1400) apply only to the plugin.

### anatomy
- **What:** builds detailed, interactive isometric SVG figures of a real-looking machine whose
  working is the concept, with a live readout and eased motion.
- **Why:** one figure per tier for the hardest ideas (motor and setPower, mecanum strafing, the
  OpMode lifecycle), embedded from `src/figures/`.
- **Command:** `DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx -y skills@1.8.1 add wheresryan22/anatomy --skill anatomy --agent claude-code -y`

Vetting: MIT, commit 1482e84 (2026-10-18), 16 open issues. Needs Node 20.10+ (we have 26) and
Chrome for its checks. Its scripts only start a local headless Chrome on 127.0.0.1. The output is
standalone SVG and HTML with no remote URLs (the only one in an example is the SVG namespace), so
figures work offline. `scripts/publish.mjs` can fork the author's community gallery and push a
figure, but only when the user asks; it prints its plan and asks first. We never run it. Open
issue #142: its examples ignore reduced motion for animations already running; our figures must
check it themselves.

### hallmark
- **What:** an anti-"AI slop" design skill: `audit <path>` (a ranked report) and `redesign <path>`
  (keeps content and wiring), with a local linter (`sloplint.mjs`).
- **Why:** an outside design critique of the site at 1366×768 and touch-only 1024×768, then fixes.
- **Command:** `DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx -y skills@1.8.1 add nutlope/hallmark --skill hallmark --agent claude-code -y`

Vetting: MIT, commit 04977e1 (2026-11-11), 28 open issues. Scripts the skill runs are local
(`sloplint.mjs`, `theme.mjs`, a local Chrome for screenshots). Three can reach the network, only
when run: `imagegen.mjs` posts to Together AI's image API and needs `TOGETHER_API_KEY` (the skill
says never to fire it unasked; we have no key and will not use it); `theme.mjs photos --save`
downloads from upload.wikimedia.org (for new page builds; not used); `install-hook.mjs` would add
a PostToolUse lint hook to `.claude/settings.json` (not run; the hook it adds only runs the local
linter). The nexu-io/open-design copy was not needed.

### security-audit (Cloudflare, official)
- **What:** source-first security review: guidance mode by default, a six-phase audit with
  machine-checked findings only when asked. Has a client-side and a deployment guide.
- **Why:** to review the client code, the Supabase class-code path and the security headers for a
  static, child-directed site with no backend of our own.
- **Command:** `DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx -y skills@1.8.1 add cloudflare/security-audit-skill --skill security-audit --agent claude-code -y`

Vetting: MIT, commit c1c8a8c (2026-09-14), 45 open issues. Loading it authorizes no files and no
full workflow. Its two validator scripts read local JSON and make no network calls. Open issue
#94 (output path escape in full-audit mode) is why we use guidance mode.

## Rejected

- **santmun/cloudflare-security-skill:** it turns on WAF, rate limiting, Turnstile and Access by
  changing a live Cloudflare account through `wrangler` and the API. We have no Cloudflare
  account, no backend and no forms to protect; it also depends on a separate `cloudflare` skill it
  does not ship, and has no users yet (0 stars).
- **enuno/claude-command-and-control → cloudflare-zaraz:** Zaraz loads third-party tags
  (analytics, ad pixels, chat) at the edge. We load none and never will, so there is nothing for
  it to manage. The repo also has no license, so it cannot be reused.
- **iMathieuB/publii-agent-toolkit → formulaire-contact-cloudflare:** a careful pattern (keeps no
  copy, honeypot, Turnstile, explicit consent), but it collects a name and an email address and
  needs a Cloudflare Worker and Email Routing. Collecting contact details breaks "collect nothing"
  on a site kids use, so we add no form at all.

## Where a skill disagrees with CLAUDE.md (CLAUDE.md wins)

- **hallmark, fonts:** its default font source is Google Fonts or Fontshare from a CDN. This site
  loads no third-party fonts; any font is self-hosted from our own origin.
- **hallmark, imagery:** it wants real photos or generated stills. Our pictures are our own SVG
  art; no stock photos, no generated images, nothing fetched from Wikimedia or Together AI.
- **hallmark, scope:** a redesign may change layout and styling only. Routes, component
  ownership, lesson copy and the voice rules stay; nothing is deleted without an approved plan.
- **anatomy, size:** it scopes even a small figure at up to an hour and asks for 40–80 parts. Our
  figures are kept to one idea a 10-year-old can operate: big tap targets (44×44 px minimum), no
  hover-only controls, and the robot hardware names fixed in CLAUDE.md.
- **anatomy, community gallery:** never publish figures; they live in `src/figures/` only.
- **anatomy, interaction:** its examples steer by hover (`pointermove`). Ours are driven by real
  buttons under the card (44 px), with keyboard and touch the same as mouse; hover is never the
  only way in.
- **anatomy, how it is wired in:** the kit's core (`kit/iso-kit.ts`, MIT, 38 KB of source) is
  vendored in `src/figures/kit/` minus its standalone-page code, under `@ts-nocheck` because it
  was written for a looser tsconfig. Its CSS is `src/figures/figures.css` with every colour moved
  to `--anatomy-*` tokens in theme.css (the space palette) and corner text raised to 14 px. A
  lesson embeds a figure with a `:::figure <id>` line; `tests/figures.test.ts` checks every id.
- **ponytail:** "never add a dependency for a few lines" matches CLAUDE.md. Where ponytail says to
  cut, the touch-target, contrast, accessibility and error-translation rules are never cut.
