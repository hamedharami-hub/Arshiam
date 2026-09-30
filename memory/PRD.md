# ARSHNAZ (ارشناز) — PRD & Progress (unified main + emergent)

## Original Problem Statement
Persian-first (RTL) mobile-first PWA + Android (Capacitor) for tasks/notes/habits/mental-health + Pharmacy study, on Firebase.
Final plan "ارشناز: ۸ مورد، ۶ فاز" (no rewrite): week start sat/mon (default sat), Australian public holidays (state selectable,
default NSW), Drive/Photos attachments copied to app Object Storage, FSRS mandatory for review, device-timezone (DST-safe) date math.
Phases: 0 CI · 1 comments→task text + attachment rewrite · 2 Time Bucket · 3 Calendar & weather · 4 Review + FSRS · 5 Drive/Photos.
Latest request (2026-09-28): explain why `emergent` conflicts with `main`, report which plan items are done, and merge them.

## Architecture
- Frontend: Vite 7 + React 18 + TS + Tailwind/shadcn at `/app` (supervisor `frontend` → `/app/frontend/start-vite.sh` → Vite :3000).
  Vite proxies `/api/arsh` → :8001 locally. Project package manager is npm (`package-lock.json`, CI uses `npm ci` on Node 22).
- Firebase Auth/Firestore (tasks, folders, tags, Leitner/FSRS cards) — `firebase-applet-config.json`.
- Backend `/app/backend` FastAPI + MongoDB, prefix `/api/arsh`: attachments (signed upload/view, soft delete), holidays (Nager.Date AU),
  weather (Open-Meteo cache + geocoding), Firebase ID-token auth. Env: EMERGENT_LLM_KEY, FIREBASE_PROJECT_ID, ARSH_SIGNING_SECRET, ARSH_APP_NAME.
  Android/Vercel builds need `VITE_ARSH_API_URL` = deployed backend origin.

## Implemented
### main (before 2026-09-28)
- Persian default, Arshnaz theme + header theme toggle, Pharmacy top-level section, Pharmacy shortcuts on Today, mobile editor "More" menu,
  RichEditor ProseMirror dedupe fix, Pharmacy home with accordion categories, CYP/FRED workflows, lesson Drive media, diary moved to Do +
  voice writing, garden/greenhouse redesign, task-editing and catalogue fixes, mind map layouts/scope.
### emergent (2026-09-28)
- Phase 0: CI steps green locally. Phase 1: comment migration + removed Add comment; attachment rewrite (signed URL, progress, retry,
  offline queue, 25 MB/type limits, image + pdf.js preview, soft delete). Phase 2: Time Bucket (timeHorizon, nested views, shared weeks,
  overdue + postpone all, per-bucket filters, FA/EN parser, smart add, DnD, zoom timeline, DST tests). Phase 3: Jalali + AU/state holidays
  with colours/lists/cache, Open-Meteo chip + bottom sheet + weekly strip. Phase 4: FSRS (migration from Leitner boxes), desired retention,
  forecast, streak, daily goal, gestures, Framer Motion + haptics + reduced motion; Review section under Pharmacy (`/app/review/pharmacy`).
### Merge (2026-09-28) — branch `merge/emergent-into-main`
- Root cause: `emergent` was pushed from a pod whose repo started with its own empty "Initial commit" → no shared history with `main`.
  Content-wise `emergent` already contained main HEAD (`dbf8306`), so the real delta is only emergent's work.
- New branch based on `origin/main` with a merge commit of `origin/emergent` (`--allow-unrelated-histories`) → PR to main is conflict-free.
- Restored files emergent had dropped: `package-lock.json` (regenerated with the 3 new deps), `bun.lock`, `android/gradle/wrapper/gradle-wrapper.jar`.
- Verified: `npm ci` ✓, typecheck ✓, lint 0 errors ✓, vitest 1008/1008 ✓ (assistantAccess suite needs Node 22 like CI), build ✓, backend pytest 18/18 ✓.

### 2026-09-29
- Mind map: stable reveal counter (total from full tree), toggle label «تدریجی ↔ نمایش همه», «تمام شد» when done; focus-mode tap via pointer events (touch-safe) + hint.
- Phase 5 code (Google Drive & Photos): OAuth code flow (system browser on Android → `arshnaz://google-connected`), Fernet-encrypted tokens in Mongo,
  Drive Picker import → Object Storage, upload attachment to Drive folder «Arshnaz», Photos Picker API session → Object Storage.
  INACTIVE until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_API_KEY / GOOGLE_PROJECT_NUMBER are set in backend/.env.
- Android guide `ANDROID_ARSH_SERVICE_FA.md`; android-build workflow passes `vars.VITE_ARSH_API_URL`.
- Hidden modules: pharmacy / study / mind unlocked per account by one access code (7 taps on version in Settings › About).
  Backend `backend/modules.py` (hashed codes, max uses, expiry, revoke + withdraw, rate-limit, admin by ARSH_ADMIN_EMAILS/claim).
  Frontend `src/lib/appModules.ts` gates routes (NotFound→today), sidebar, bottom bar, command palette, quick links, task links, study tasks,
  onboarding, widgets. Crisis/SOS always visible.
- Not verified E2E: review swipe/double-tap/long-press session and reveal counter on real data (Firestore free-tier read quota exhausted during QA).

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog
- P1: Mind map progressive-reveal label/counter, focus-mode node tap, duplicate Capacitor plugin registration warning.
- P1: Full review session with gestures E2E; Android device QA of attachments + `VITE_ARSH_API_URL` guide.
- P0: Provide Google Cloud keys to activate Drive/Photos; re-run gesture QA after Firestore quota reset (or enable Blaze billing).
- P1: Per-module codes / per-user admin view of grants (backend already supports module lists per code).
- P2: Object Storage hard delete when API becomes available.


### 2026-09-30 — Visual redesign v2 (paper / TickTick-style), data & Firebase untouched
- Decisions (user delegated): NO autosave (Save = status icon), groups «انجام / رشد / ذهن», Today & Kanban by the general rules,
  accents: نیلی آرام (default), زیتونی، کهربایی، آبی فولادی، رز خاکی، آجری (brick shifts urgent flag to crimson).
- Tokens: `src/index.css` top (paper light / paper dark / `.dark.theme-oled`, `[data-accent]`), override block at file end neutralises
  gradients, backdrop-blur, glow, bouncy animations, `font-mono` outside code; tailwind radius xl/2xl → 8px, shadows none (float only).
  `src/lib/theme.ts`: themes `paper-light|paper-dark|oled|system`, legacy ids auto-migrated (+accent), early theme script in `index.html`.
  English mode disables Vazirmatn `ss01` (Persian digits) → Latin digits.
- Sidebar: plain logo/name + collapse, primary nav (Today, Inbox, Kanban, Calendar) with local-cache counts (`useSidebarCounts`),
  folders/tags/smart lists, groups collapsed at bottom (order key v2), 34px rows / 40px mobile list (no tile grid), account menu
  (settings + sign out); streak moved to Today header; «Reset order» moved to Settings › Appearance.
- Kanban: `GoalHeader` one row (click-to-edit title, horizon chip, priority flag, ⋯ with edit/new/delete+confirm); underline goal tabs.
- Task detail: `TaskDetailTopBar` (folder › goal breadcrumb, save icon, ⋯, ✕) in all 4 modes; frameless title 18–20px;
  chips row date/priority flag/tags/pin; description always editable with focus-only tools; bottom rail 4 buttons (attach, subtask,
  focus, ⋯ with AI/parent/note/location/contact/checklist/branches/history/delete).
- `PriorityFlag` component used in task list, kanban, goal header. Priority labels: فوری/زیاد/متوسط/کم.
- Android widgets: drawables/layouts/widget Java colours → paper palette + indigo, radii 12/8dp (not built on device here).
- Verified: tsc ✓, eslint 0 errors ✓, vitest 1119 passed (3 env-only suites need Node 22 / @google-cloud/firestore), vite build ✓,
  qa:layout 10/10 ✓ (run with `node --experimental-websocket` + chrome --no-sandbox on Node 20), testing agent iteration_10 ~95%.

## Backlog (redesign)
- P1: Real-device QA (FA/EN × 3 themes), Android widget build check; Onboarding dialog still Persian-only in EN.
- P1: Sweep remaining hardcoded strings on secondary pages (Knowledge, Review, Pharmacy) into i18n.
- P2: Autosave (TickTick-style) only after user approval; accent sync to Firestore settings (currently localStorage).

### 2026-09-30 (fork) — Pomodoro redesign + date picker fix
- `PomodoroTimer.tsx`: timestamp engine, focus/short/long modes, ring, session dots, ambient sound chips (horizontal scroll) + volume,
  collapsible «تنظیمات» (end bell, break lengths, long-every, auto-start), RTL sliders. Ambient plays during focus only.
- `PomodoroView.tsx`: single compact stats card (today minutes/sessions, per-task breakdown, 7-day chart).
- New `InlineDatePicker.tsx` (Jalali/Gregorian month grid, respects week start) replaces native `<input type=date>` in `DueDatePicker`
  (kanban date popover + task schedule sheet). Verified via screenshot at 390px, no overflow. Testing agent NOT run (user asked to save credits).
## Backlog
- P2: Verify Garden cloud sync across two devices; optional custom music URL for Pomodoro.

### 2026-09-30 — Sleep sounds
- `pomodoroSynth.ts`: new generative sleep music (60→52 BPM, pads + felt-piano plucks + convolution reverb, 45s look-ahead so it survives
  screen-off throttling), pink noise, music+ocean, music+rain, delta+pink (experimental), `scheduleSleepFade` on the audio clock.
- `SleepSoundsCard.tsx` on Pomodoro page: sound chips, fade-out timer 15/30/45/60/no-limit (fade = min(10 min, 1/3)), volume,
  breathing link only when Mind module unlocked. Verified by screenshot (play/switch/stop, no overflow). Real audio quality needs device check.
