# Electric City

Electric City's fiber-optic build task manager. Managers create buildings with their spec
(BEP, BMO, cables, floor boxes), and each building runs through a fixed
5-phase pipeline of specialist teams. Each phase requires photo/file proof
of work, which Gemini reviews against a per-category checklist before the
next phase unlocks.

## The pipeline

1. **Αυτοψίες** (Site Survey)
2. *— manual gate: waiting for Telekom to hand the building back —*
3. **Χωματουργοί** (Earthworks)
4. **Κατασκευαστές** (Construction — BEP/BMO/floor boxes/cables installed)
5. **Εμφυσητές** (Fiber Blowing)
6. **Κολλητές** (Splicing — closes the building)

Creating a building auto-creates all 5 phase tasks. Only Αυτοψίες starts
unlocked; each later phase unlocks once the previous one is marked Done —
and Χωματουργοί additionally needs a manager to mark the building as
"Telekom cleared" first.

## Dashboard (home page)

Signing in lands on `/` — an action-oriented home page, not just a list.
Managers see quick counts (needs attention / overdue / awaiting Telekom,
each linking straight to that filtered building list), a **Needs
assignment** list of every unlocked phase nobody's been assigned to yet, and
a **Recent activity** feed of the latest AI reviews across every building.
Staff see **Your tasks**: everything assigned to them that isn't Done or
Locked, with anything `Needs revision` first, then overdue, then by due
date — so opening the app tells you what to do next instead of making you
go find it.

## Roles

- **Manager**: creates buildings (with BEP/BMO/cable entries and per-floor
  box counts) and can edit that spec later from the building page, creates
  and deactivates staff accounts (optionally tagged with a category, so the
  assignment dropdown suggests the right people first, and optionally with a
  subcontractor company name (autocompleted from names already in use, so
  "Acme Fiber" and "acme fiber" don't silently become two different
  companies in the stats) — leave it blank for in-house staff; a
  subcontractor account works exactly like an in-house one, it's just
  labeled with its company everywhere staff show up (Staff page, the assign
  dropdown, statistics, the buildings list, every "Assigned to" line on the
  building page, the phase task page, and the printable report) so you can
  tell who's who and, eventually, who to bill; "Edit" next to anyone but
  yourself lets you fix their name, category, or subcontractor after the
  fact (a typo, a re-assignment to a different team) without deactivating
  and re-creating the account, and can set someone a new password from that
  same form (leave it blank to keep their current one) — the app has no
  email/SMTP setup, so this manager-assisted reset is the only recovery
  path if a technician forgets their password — deactivating someone
  unassigns any of their phases that were still
  open, so that work resurfaces on the dashboard's "Needs assignment" list
  instead of sitting stuck on an account nobody can sign into anymore; their
  history is kept), assigns one staff member and an optional due date per
  phase, maintains the reusable checklist template for each category
  (Settings → Checklists — each item can be edited in place, not just
  added/removed, so fixing a typo doesn't bump it to the end of the list),
  toggles Telekom clearance, and can override any AI verdict.
- **Staff**: sees only the phase tasks assigned to them, uploads files (and
  can remove a wrongly-uploaded one before or after submitting — blocked
  only once the phase is Done, since that's an approved record at that
  point, not a mistake to undo), adds structured test readings (e.g.
  OTDR/power-meter values — free-form label/value/unit so it fits any
  instrument), and submits with notes. Each phase task page has a
  collapsible "Building spec" section (BEP/BMO/cables/floor boxes) so a
  field tech can double-check the spec without leaving the page and losing
  an in-progress submission. On submit, Gemini checks the submission
  against that phase's checklist and the building's spec, and returns a
  verdict per checklist item plus overall feedback.

## Buildings list & notifications

The Buildings list has a search box (name/address; submitting on Enter is
handled explicitly rather than relying on the browser's native default,
since that's inconsistent across mobile soft-keyboards and field techs use
this mostly on phones), a per-building progress bar (phases done / 5), CSV
export of whatever's currently filtered, and filter tabs — All / Awaiting
Telekom / Needs attention / Overdue / Completed / Archived — computed from
each building's phase statuses and due dates. It composes correctly with
the filter tabs (searching within "Needs attention" stays scoped to that
tab) and the "Clear" link that appears once you've searched returns to
whichever tab you were on. The bell icon in the header shows in-app
notifications (polled every
30s): staff get notified when a phase they're assigned to unlocks, and when
a submission comes back `NEEDS_REVISION` or `FLAGGED`; managers
additionally get notified on `FLAGGED` verdicts specifically, since those
are the ones most likely to need managerial attention rather than just a
technician retry.

Every signed-in user can change their own password from the account page
(their name in the top bar).

Actions that change something give feedback: a small toast confirms saves,
assignments, and status changes (`src/lib/toast/context.tsx`), and
impactful-but-reversible actions (deactivating staff, revoking statistics
access, undoing a Telekom clearance, reopening a Done phase, archiving a
building) require a second click on the same button (it flips to
"Confirm?" for a few seconds) via `src/components/ConfirmButton.tsx` —
deliberately not a modal, so it stays out of the way on mobile.

## Archiving buildings

Managers can archive a building from its detail page — it drops out of the
default list and every status tab, but nothing is deleted; it shows under
the **Archived** tab and can be restored (Unarchive) at any time. This is
the way to get a mistakenly-created building out of the way without a
destructive, irreversible delete.

## Building history, duplicating, and printing

Every building detail page ends with an **Activity** timeline — building
creation, Telekom clearance, and every AI review, newest first — so you can
see what happened and when without digging through each phase individually.

**Duplicate** (manager only, top of the building page) creates a new
building with the same spec (BEP/BMO/cable entries, floor boxes, address,
floor count) named "`<original> (copy)`". It's meant for near-identical
buildings on the same site — it does **not** copy phase progress, files, or
reviews; the duplicate starts its own pipeline from Αυτοψίες like any new
building.

**Print report** opens a `/buildings/[id]/report` page formatted for
printing (or "Save as PDF" from the browser's print dialog): the full spec,
and per-phase checklist results, AI review history, test readings, image
thumbnails, and a full list of every uploaded file's name — not just
images, so a PDF or text file submitted as evidence isn't silently missing
from what's meant to be the building's compliance record — each with a
"View in Google Drive" link when one's available. The nav bar and
on-screen-only buttons are hidden automatically when printing.

## Statistics (restricted)

A **Statistics** page (nav link only appears if you have access) shows
company-wide numbers: buildings by status, and a breakdown by category, by
subcontractor (in-house vs. each named subcontractor company), and by
person of how many phases are done, about to complete (submitted,
awaiting/pending final verdict), in progress, needing attention, or
overdue. It's meant for the people overseeing the whole operation, not
every manager.

Access is a boolean per account (`canViewStats`) rather than tied to the
Manager role, and it's self-perpetuating: only someone who already has
access can grant or revoke it for someone else, from the "Grant/Revoke
statistics access" link next to that person on the Staff page. The seeded
admin account starts with it. Grant it to the Telekom-projects manager and
whoever else needs it — there's no hardcoded limit on how many people can
have it, that's entirely up to who you grant it to.

## Backups

"Download backup" on the Staff page (manager only) downloads a single JSON
file with every building's spec and full phase history (checklist results,
AI review history, test readings, and a record of what files were
uploaded), every staff/manager account (except password hashes), and the
checklist templates — everything except the uploaded files' actual bytes,
which stay on disk under `uploads/`. It's there so getting your data out
doesn't require server or Docker-volume access, just a browser: useful
before a risky change, or just for peace of mind on top of whatever backs
up the server itself.

## Language (English / Greek)

The EN / ΕΛ toggle in the header (and on the login page) switches the whole
app's interface — nav, buttons, labels, status badges, form fields, empty
states. It's stored in a `locale` cookie, not tied to the account, so each
browser remembers its own choice independently, including on the sign-in
screen before anyone's logged in.

What does *not* get translated, by design:
- User-entered content (building names, notes, checklist item text you typed).
- Gemini's AI-generated review feedback — it's written once at submission
  time in whatever language the model responded in and stored as-is; it
  isn't re-generated per viewer.
- A handful of rare-path server error messages (e.g. "phase is locked")
  that aren't part of the normal day-to-day flow.

To add a third language or edit existing wording, everything lives in
`src/lib/i18n/dictionary.ts` — one object per language, same keys. Server
Components read it via `getDictionary()` from `src/lib/i18n/server.ts`;
Client Components use the `useI18n()` hook from `src/lib/i18n/client.tsx`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `NEXTAUTH_SECRET` — any long random string (`openssl rand -base64 32`)
   - `GEMINI_API_KEY` / `GEMINI_MODEL` — from https://aistudio.google.com/apikey
   - `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD` — your first manager login
3. Create the database:
   ```bash
   npx prisma migrate dev
   ```
4. Create the first manager account:
   ```bash
   npm run seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```
6. Sign in as the manager, then:
   - Go to **Checklists** and define what each category must show before
     Gemini approves it (this is empty by default).
   - Go to **Staff** and create accounts for your teams.
   - Go to **Buildings** and create your first building.

## Testing

```bash
npm test
```

Runs the Vitest unit suite (`src/lib/*.test.ts`) covering the pure logic
that's easiest to get subtly wrong without noticing: the fixed pipeline
categories, date/badge formatting, upload type/size validation (including
that a mislabeled file is actually rejected, not just a well-labeled one
accepted), login lockout behavior, the phase-unlock rule itself (a
building's phases only advance when the previous one is Done *and*, for
Earthworks, Telekom has cleared the building — `shouldPhaseUnlock` in
`src/lib/phaseGating.ts` is the one place that rule is decided, pulled out
of the database-touching code specifically so it can be tested in
isolation), and CSV export's formula-injection guard (every dangerous
leading character, checked against the exact function the export button
calls). It doesn't touch a database, so it runs in under a second and
needs no setup beyond `npm install`. Route handlers and React components
aren't covered yet — this is a starting safety net for the logic most
likely to regress silently, not full coverage.

## Deploying with Docker

For running this on a real server instead of `npm run dev`, there's a
`Dockerfile` and `docker-compose.yml` at the repo root.

1. Copy `.env.example` to `.env` in the repo root and fill in
   `NEXTAUTH_SECRET`, `GEMINI_API_KEY`, and the `SEED_MANAGER_*` values —
   `docker compose` reads this file automatically. Leave `DATABASE_URL`
   out; Compose sets it for you to point at the persisted volume.
2. Build and start:
   ```bash
   docker compose up --build -d
   ```
   This builds the image, runs `prisma migrate deploy` automatically on
   every start (safe to re-run — it only applies migrations that haven't
   run yet), and serves the app on `http://localhost:3000`.
3. Create the first manager account (one time only, after the container is
   up):
   ```bash
   docker compose exec app npm run seed
   ```
4. The SQLite database and uploaded files persist in two named Docker
   volumes (`fiberflow_data`, `fiberflow_uploads`) — they survive
   `docker compose down` and rebuilds. Only `docker compose down -v` (or
   deleting the volumes directly) would erase them.

The image is a straightforward single-stage build (full `node_modules`,
not Next's trimmed `output: standalone` bundle) — a few hundred MB bigger,
but it avoids a common failure mode where Prisma's CLI goes missing from a
pruned production image and migrations can't run.

**This Docker setup hasn't been run against a real Docker daemon in this
environment** (none was available to test with) — the `npm run build` it
depends on passes cleanly and the compose file's logic has been reviewed
carefully, but please run through the steps above yourself and let me know
if anything doesn't come up cleanly.

## Google Drive backup (optional)

Every uploaded phase file can also be mirrored into a Google Drive folder
you control — organized as `<your folder>/<Building name (id)>/<Category> -
<original filename>`, so anyone with access to that Drive folder can browse
the same evidence the app has, without logging in. This is entirely
optional and off by default: with nothing configured, uploads work exactly
as they do today — the app never requires this to function, it's purely a
bonus mirror on top of the local copy (which stays the source of truth
either way).

**One-time setup, when you're ready to turn it on:**

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project (or reuse one), then enable the **Google Drive API** for it
   (APIs & Services → Enable APIs and Services → search "Google Drive API").
2. Create a **service account** (APIs & Services → Credentials → Create
   Credentials → Service account). No roles/permissions need to be granted
   on the project itself.
3. Open the service account, go to the **Keys** tab, and create a new JSON
   key — this downloads a `.json` file. Keep it private; it's a credential,
   not something to commit or share.
4. In the employer's actual Google Drive, create a folder for this (e.g.
   "Electric City — Fiber Files"), then **share that folder** with the
   service account's email address — it's the `client_email` field inside
   the downloaded JSON, looks like
   `something@your-project.iam.gserviceaccount.com` — with **Editor**
   access. This is the step that puts the files in the employer's own
   Drive: the service account can only ever see what's explicitly shared
   with it.
5. Open that folder in a browser and copy its id from the URL — the part
   after `folders/`, e.g. `https://drive.google.com/drive/folders/`**`1a2B3c...`**.
6. Set two environment variables (`.env` locally, or your host's/Docker's
   env config in production):
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — paste the entire downloaded JSON file's
     content as the value (as one line; most `.env` loaders handle a
     JSON-with-quotes value fine inside single quotes).
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` — the folder id from step 5.
7. Restart the app. The next file someone uploads gets mirrored, and its
   entry on the phase task page grows a "View in Google Drive" link.

A **"Google Drive backup: Connected / Not set up"** badge on the Staff page
tells you at a glance whether the two env vars are actually in place —
useful right after deploying with real credentials, without digging
through server logs to confirm it took.

If a mirror upload fails for any reason (network blip, revoked share,
wrong folder id), it's logged server-side and silently skipped — it never
blocks or fails the actual upload, since the local copy is always what the
AI review and the rest of the app work from. Removing a wrongly-uploaded
file (see below) removes its Drive mirror too, so undoing a mistake
actually undoes it everywhere instead of leaving the wrong photo sitting
in the employer's Drive forever.

**This integration hasn't been exercised against a real Google account** —
there were no credentials available to test with in this environment. What
has been verified: the folder/filename-generation logic has a full unit
test suite (`src/lib/googleDrive.test.ts`), and — critically — that the
upload flow behaves exactly as it did before this feature existed when
Drive isn't configured, confirmed live against the running app (a real
upload still returns success in milliseconds once compiled, with the new
Drive fields simply left `null`). The actual Drive API calls (folder
creation, file upload) should be tried against a real account before
relying on them.

## How the AI review works

`src/lib/gemini.ts` sends Gemini the building's full spec (BEP/BMO/cable
entries, floor box counts), the phase's checklist, the technician's notes,
and any uploaded files:

- Images and PDFs are sent directly to Gemini for inspection — it looks at
  actual photo content, not just filenames (verified: it correctly rejects
  a placeholder graphic that merely claims to be a photo). Uploaded images
  also get an inline thumbnail on the phase task page.
- Text-based files are sent as text.
- Structured test readings (label/value/unit) are included in the prompt
  alongside the checklist and notes.
- Gemini's shared capacity returns occasional transient 503s; requests retry
  automatically up to 4 times with backoff before surfacing an error.

Gemini returns a verdict (`APPROVED` / `NEEDS_REVISION` / `FLAGGED`) plus a
pass/fail + note for every checklist item. `APPROVED` marks the phase Done
and unlocks the next phase (subject to the Telekom gate); anything else
leaves it as `NEEDS_REVISION` so the technician can add files/notes and
resubmit. Managers can always override via the phase task page.

Submitting is guarded against being fired twice at once (a second open tab,
a network retry landing moments after the first attempt): the status flip
to `SUBMITTED` is a single conditional database update rather than a
read-then-write, so at most one concurrent request can ever win it — the
other gets turned away before it ever reaches Gemini, instead of both
racing to create a review for the same submission. If the AI call itself
fails (Gemini down, no API key configured), the phase's status is put back
to what it was before the attempt, so it isn't left permanently stuck on
`SUBMITTED` unable to be resubmitted.

## Notes on this setup

- Files are stored on local disk under `uploads/` (gitignored); the database
  is a local SQLite file (`dev.db`). Fine for one server — move to
  S3-compatible storage and Postgres if you outgrow it.
- Assigning a phase is validated server-side, not just steered by the UI:
  the assign-phase API independently checks the target is an active staff
  account (not deactivated, not a manager, not a made-up id) before saving
  it, since the API is a separate trust boundary from whatever the assign
  dropdown happens to offer.
- Login is throttled server-side: 5 failed attempts on the same email within
  15 minutes locks that login out for 15 minutes, tracked in-process (no
  extra infra needed at this scale — see `src/lib/loginRateLimit.ts`). A
  locked-out attempt fails identically to a wrong password, so it can't be
  used to figure out which accounts exist or are currently locked.
- Uploads are restricted server-side to photos (JPEG/PNG/WEBP/HEIC/HEIF),
  PDFs, and plain text/CSV/JSON — the only types the AI review pipeline and
  the UI actually handle. Binary types are verified against their real file
  bytes (not just the browser-supplied label), and anything served back is
  sent with `X-Content-Type-Options: nosniff` plus a sandboxing CSP header,
  so a mislabeled or malicious upload can't run as a script in an
  authenticated session (`src/lib/storage.ts`).
- The app is installable as a PWA (manifest + icons in `src/app/manifest.ts`
  and `public/icons/`) — on a phone, "Add to Home Screen" gives field techs
  a full-screen app icon instead of a browser tab.
- CSV exports (buildings, statistics) guard against formula/CSV injection:
  a building, staff, or subcontractor name starting with `=`, `+`, `-`, or
  `@` would otherwise be read as a formula by Excel/Sheets/LibreOffice when
  the exported file is opened — potentially leaking data via `HYPERLINK()`
  or worse. Every cell is checked and, if needed, neutralized before being
  written (`src/lib/csv.ts`).
- Baseline security headers apply to every response (`next.config.mjs`):
  `X-Frame-Options: DENY` so the app can't be embedded in a hidden iframe
  on another site for clickjacking (tricking a logged-in manager into
  clicking a real "deactivate," "archive," or "approve" button they can't
  see), plus `X-Content-Type-Options: nosniff` and a `Referrer-Policy`.
- The 5 categories and their order are fixed in `src/lib/categories.ts`. If
  the pipeline itself changes (not just checklist contents), that file is
  where to edit it.
- No self-serve signup — only managers create accounts, from the Staff page.
- The UI is responsive down to phone width, since field techs will mostly be
  submitting phases from a job site rather than a desk (checked again after
  adding the dashboard, the statistics subcontractor breakdown, and the
  phase-task building-spec panel — all hold up at 375px without extra work,
  since they reuse the same flex-wrap/`overflow-x-auto` patterns as the rest
  of the app).
- Form labels are wired to their inputs with `htmlFor`/`id` (not just
  visual proximity), so clicking a label focuses the right field and screen
  readers announce it correctly.
- All dates render with a pinned locale (`en-GB`/`el-GR` matching the
  selected language) rather than the server's or browser's ambient default,
  so server-rendered and client-hydrated output always match — a mismatch
  there throws a real React hydration error.
- Design tokens (buttons, cards, badges, inputs) live in `globals.css` as
  shared classes (`.card`, `.card-link`, `.btn-primary`, `.badge-*`, etc.)
  rather than repeated inline utility soup, so the look stays consistent
  as pages get added. The UI font is Inter (self-hosted via `next/font`,
  Greek subset included).
- `npm audit` currently reports one high-severity issue in `postcss`
  (pulled in by Next.js's build tooling, not something this app's own code
  uses at runtime). The only available fix is upgrading to Next.js 16, a
  major version bump with its own migration work — worth doing deliberately
  rather than as a drive-by dependency bump.
