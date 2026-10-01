# ARSHNAZ (ارشناز) — PRD

## Original problem statement
Import https://github.com/hamedharami-hub/Arshiam.git (already in /app, Vite + React + TS + Firebase + FastAPI/Capacitor). Improve strongly and make the design excellent with a TickTick-inspired unified look; user reviews step by step. Master backlog: ARSHIAM_REMAINING_WORK_HANDOFF.fa.md (not found in repo; Phase 2/3 items listed in approved plan).

## Run notes
- Frontend: Vite at /app (supervisor `frontend` -> port 3000). Dependencies installed with `npm ci` at /app (yarn cannot link this workspace layout).
- Firebase live (Auth/Firestore/Storage) — rules and data shape unchanged. Backend `/api/arsh/*` not configured in preview (500) so hidden modules (Knowledge/Pharmacy) need a localStorage module-cache seed for testing.

## Implemented (Phase 1) — 2026-10-01
- Top search: header button dispatched both open event and a Ctrl+K toggle (open→close). Fixed; note results open `/app/notes?select=id`.
- Tag page: showed all tasks; now filters by task_tags; tag map refreshes on `tasks-changed`/`task-tags-changed`.
- Attachments: window.prompt link flow replaced by `LinkDialog` (RichEditor + task description); inline description gets attach image/file + link buttons, upload status toast with Retry, markdown preview for images/links, typed text preserved.
- Calendar: month grid was LTR (Radix Tabs dir) → RTL fixed (Saturday on right); Iran/Australia occasion toggle chips (persisted); Australian observances added (Mother's/Father's Day, Daylight saving, Harmony Day, etc.) next to existing AU public holidays.
- Time Buckets: overdue tasks no longer duplicated in period sections, purpose hint per level, "not planned yet" tray with one-tap assign to current period.
- Life Architect: new "My life system" map (values → goals → plans → tasks/habits), progress, goal progress list, next-step banner; left-aligned layout.
- Page background: per-page tint (6 colors, light/dark safe) saved per user in localStorage; folder background image (upload to Storage, faint overlay) with remove; folder color tint made dark-mode safe.
- Knowledge reader: compact one-line header (breadcrumb, language, study, translate, games, AI, edit, more menu with text size/calendar/pharmacy practice & review/delete), single-line collapsible tags, header auto-hides on scroll with reveal button; old Pharmacy/Practice/Review strip merged in.
- Shared layout primitives in index.css (`page-shell`, `surface-card`, `section-label`), applied to Calendar, Buckets, Life Architect.
- Tests updated: KnowledgeDocumentReader, KnowledgeBaseView, holidays. Testing agent report: /app/test_reports/iteration_13.json (9/11 verified; tag-assign UI and folder create flows were Playwright-driving issues, folder create + bg image verified manually).

## Backlog
- P1: Phase 2 items from handoff (honest save states, undo/redo + draft recovery in editors, AI settings preview/apply/undo, one shared date/filter model, pinned order in Today/Tomorrow/Inbox/This Week, habit stats, notes full-text search, settings regroup).
- P1: Deeper Knowledge pass (sidebar tree cards, editor comfort, search/filter), verify Planning (Kanban/week view) edge cases with real data.
- P2: Cloud-sync page colors/folder prefs (currently device-local); Phase 3 pharmacy card model.
