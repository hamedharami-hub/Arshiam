# ARSHNAZ (ارشناز) — PRD & Progress

## Original Problem Statement
Redesign & stabilize the web version of ARSHNAZ, a Persian-first (RTL) task/note/habit/mental-health + Pharmacy study app running on Firebase. Goal: connect sections cohesively, fix bugs, and deliver a modern responsive redesign (mobile/tablet/Windows) with the warm, affectionate "Arshnaz" identity. Backend stays Firebase (Auth/Firestore/Storage). Only the web version is in scope (Android/Capacitor and the PTE sub-project are out of scope).

## Tech Stack
- Vite 7 + React 18 + TypeScript, TailwindCSS, shadcn/ui, react-router 7.
- Firebase (Auth email/password + Google, Firestore custom DB, Storage) — config in `firebase-applet-config.json`.
- Runs on Vite dev server (port 3000) bridged through supervisor `frontend` program via `/app/frontend/package.json` (`start` execs `/app/node_modules/.bin/vite` in `/app`). No local FastAPI backend is used.

## User Personas
- Persian-speaking users managing daily tasks/habits/notes.
- Pharmacy students using Products / Scenario / FRED / CYP study tools.
- Users wanting mental-health tools alongside daily planning.

## Core Requirements (static)
- Persian/RTL default; light/dark toggle persistent across sessions.
- Cohesive navigation (desktop sidebar + mobile bottom tab bar) with no dead links.
- Warm "Arshnaz" pink/rose visual identity.
- Per-user private Firebase data.

## What's Been Implemented
### Phase 1 (2026-06 / session 1)
- Cloned & installed the existing repo in `/app`; wired supervisor `frontend` → Vite (added `allowedHosts`, HMR clientPort 443 for the preview proxy).
- Set **Persian (fa) as the default language** (removed `navigator` from i18n detection order).
- Made the **Arshnaz theme the default identity** (`arshnaz-light`) in `App.tsx` + `AppLayout.tsx`.
- Added a **header light/dark toggle** (`src/components/ThemeToggle.tsx`, `data-testid="header-theme-toggle"`).
- **Promoted Pharmacy to a top-level, default-open sidebar section** (`SidebarNavSections.tsx` SECTIONS + DEFAULT_ORDER). Simplified the Knowledge group. Updated unit tests.

### Phase 1 (session 2 — next action items)
- **Pharmacy quick-access on Today**: `src/components/PharmacyShortcuts.tsx` renders a scrollable row of 4 pharmacy shortcut cards on the Today dashboard (testids `pharmacy-shortcuts`, `pharm-shortcut-{products,scenario,fred,cyp}`). Verified nav works.
- **Mobile Notes editor "More" menu**: `src/components/RichEditor.tsx` toolbar now keeps primary tools inline (bold/italic/bullet/task/image/voice) and collapses the rest into a mobile-only dropdown (`data-testid="editor-more-tools"`); desktop keeps the full inline toolbar.
- **Fixed CRITICAL RichEditor crash** (`DOMSerializer.fromSchema … null 'cached'`): deduped `@tiptap/pm` + `prosemirror-*` in `vite.config.ts` (`resolve.dedupe` + `optimizeDeps.include`) so only one ProseMirror instance loads, and made the mount `useEffect` guarded (no `getHTML()` at mount). Notes now open, autosave, and persist across reloads.
- **Knowledge/Study + Mind stabilization**: verified `/app/knowledge`, `/app/interactive-study`, `/app/review`, `/app/mind`, `/app/checkin`, `/app/thoughts`, `/app/abc`, `/app/socratic`, `/app/breathing`, `/app/crisis` all load and render with 0 page errors; they inherit the Arshnaz identity via theme CSS variables. Full visual redesign of these remains Phase 2.
- Verified via testing agent iterations 1–3 (100% on retest).

## Test Credentials
See `/app/memory/test_credentials.md` — `test.arshnaz@example.com` / `Test123456` (live Firebase). Tick the clinical disclaimer before login.

## Known Notes / Backlog
- `api/assistant-access/assistantAccess.test.ts` fails locally (firebase-admin needs Node >=22 in this env) — serverless test unrelated to the web app; 935 web tests pass.
- Preview URL sits behind Cloudflare that 429s on rapid full-page reloads — pace automated tests.
- Google sign-in may not work on the preview domain until it's added to Firebase Authorized domains (use email/password).

## Prioritized Backlog
- P1 (Phase 2): Mind / mental-health suite (Mind, Check-in, Thought Records, ABC, Socratic, Breathing, Worry, Cycle, Values, Crisis) — bugfix + responsive redesign. Knowledge/Study (Knowledge Base, Interactive Study, Review/Leitner, Article Rewrite) polish.
- P2 (Phase 3): Calendar, Kanban, Stats, Buckets, Garden, Pomodoro, Contacts, Widgets, Shared/Admin/Settings polish; final a11y & performance pass.
- P2: Add data-testids to QuickCapture textarea/submit, task rows, note editor fields for more reliable automation.
