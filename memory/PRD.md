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

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog
- P1: Mind map progressive-reveal label/counter, focus-mode node tap, duplicate Capacitor plugin registration warning.
- P1: Full review session with gestures E2E; Android device QA of attachments + `VITE_ARSH_API_URL` guide.
- P1 Phase 5: Google OAuth (system browser on Android), encrypted tokens, Drive Picker + "Arshnaz" folder, Photos Picker API copy.
- P2: Object Storage hard delete when API becomes available.
