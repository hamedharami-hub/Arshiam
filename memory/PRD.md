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

## Iteration 2 — 2026-10-01
- Suggested soft default page tint per section (tasks=sky, knowledge/notes=emerald, mind/life=violet); per-page override, "none" and "back to suggested" (src/lib/pageBackground.ts).
- Cloud sync of page colors + folder prefs/background image via users/{uid}/app_state/ui_prefs (src/lib/uiPrefsSync.ts) — verified across fresh browser contexts.
- `page-shell` layout applied to ~19 more pages (Mind/Values/Checkin are in the hidden mind module; shell is applied in code, not visible without module unlock).
- Knowledge: forgiving Persian search (src/lib/knowledgeSearch.ts), search clear/Escape, icon-only new-folder button, editor unsaved-changes confirm + Ctrl/Cmd+S.
- Tests: /app/test_reports/iteration_14.json (all pass).
## Backlog
- Knowledge: editor draft recovery, sidebar card density, reader search highlight; Planning week view/Kanban edge cases; Phase 2/3 from handoff.

## Iteration 3 — Mind redesign (2026-10-01)
- /app/mind now exactly 3 entries (Today's mood, Calm down, My mind is busy) + optional "continue last note" + trends link + fixed SOS pill. Honest save states (saved/queued/failed) with stale-response guard.
- New pages: /app/calm (breathing quick start `?start=1` + sleep sounds), /app/mind/trends (metric chart, weekly review from Mind-only sources via completed_at, screeners with non-diagnostic note, collapsible details, read-only legacy Socratic archive, AI only after preview).
- Socratic chat removed (view, prompts, validators, executor ops, aiSettings key, menu/palette/widget/pins; save/clear API removed, read subscription kept for archive). /app/socratic → /app/mind. Retired pin keys purged (src/lib/retiredFeatures.ts).
- ABC merged into "Think it through" (/app/thoughts, mode toggle); /app/abc → /app/thoughts?mode=short. Shared draft (src/lib/mindDraft.ts) carries text across paths/back/reload.
- Worry: record saved first, task linked by source_id, stable ids (no duplicate on retry); task origin chip → /app/thoughts?record=id; per-record delete added.
- Moved: values → Growth (no longer Mind-gated), cycle → new Health group; Pomodoro untouched.
- Tests: iteration_15 (home/calm/trends/redirects) and iteration_16 (worry/CBT task+origin) pass; unit suite: only env-bound api/* tests fail + 1 flaky Knowledge test under load.
## Not done / limits
- Not pushed to GitHub or deployed (use "Save to GitHub"); no before/after screenshots captured; real-account testing excluded; screener draft resume not implemented; data of old Socratic session shown read-only only if present.


## Session 3 — 2026-10-02 (re-import + review, Knowledge excluded)
- Re-imported repo into /app (npm ci at root; yarn cannot link this layout). Backend .env got FIREBASE_PROJECT_ID / ARSH_* values (backend optional).
- Time-bucket planning rebuilt as cascading Planning: /app/planning (sidebar primary item), /app/buckets redirects. Levels year→quarter→month→week→day linked by `plan_parent_id`; upper-level panel (pull / smaller step / move), roll-up progress, carry-over card, unplanned tray, week-day strip, period picker, swipe, mobile panes. Files: src/lib/planCascade.ts, src/components/planning/*, src/pages/PlanningView.tsx.
- List header view switch (src/components/ListViewSwitch.tsx): Inbox list/buckets, folders list/kanban/buckets; stored in folder prefs (inbox uses id "inbox"), cloud-synced. Old TaskPlanningPanel + BucketsView removed.
- planningPatch no longer mirrors bucket_* (planned tasks no longer become overdue). Today shows day-planned tasks.
- Firestore quota: persistent multi-tab cache, shared collection listeners (src/lib/firestoreLive.ts) behind firebaseStore/fetchTasks/notes/fetchFromFirestore, no pre-write server read, quota pause until Pacific midnight in offlineQueue, Persian sync bar with "همگام‌سازی الان", usage card (Settings → داده‌ها). Root cause: reminders polled full tasks collection every 60s.
- Fixes: UTC "today" in Widgets/Pomodoro, RTL counters, endless loading on listener error, mobile header crowding, settings subtitle.
- Auth page redesigned (brand panel + cleaner form, password toggle).
- QA uses local Firebase emulators (tests/emulator/start.sh, localStorage arsh_use_emulator=1, dev only). Report: docs/ARSHNAZ_REVIEW_REPORT_2026-10.fa.md. Testing: /app/test_reports/iteration_17.json (all planning flows passed).

### Backlog
- P1: guided weekly/monthly review; link yearly goals to Values/Life Architect.
- P2: undo/redo + draft recovery, notes full-text search, AI goal breakdown, Android widget "today + week progress".
