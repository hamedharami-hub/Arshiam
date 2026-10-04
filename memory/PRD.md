# ARSHNAZ (ارشناز) — PRD / status
Source: github.com/hamedharami-hub/Arshiam (main web app only). Vite + React + TS frontend in /app/frontend (served by `yarn start` = vite dev on :3000);
repo's FastAPI companion service in /app/backend (/api/arsh/*, health at /api/arsh/health). Firebase (Auth/Firestore/Storage) is the data layer, config in frontend/firebase-applet-config.json.

## Done (Phase 1)
- Imported & running at preview URL; email/password sign-in verified with a QA account (see test_credentials.md).
- New icon-led "When" panel (components/task-detail/TaskSchedulingSheet.tsx): quick-day icons, always-visible month calendar (Jalali/Gregorian), clock row with hour/minute wheel, repeat icon menu, reminder bell row (only when a time is set), check button.
- New icon-led "Planning" picker (components/TaskPlanningPicker.tsx): 6 period tiles + custom range mini-calendar.
- Time block (start_at/end_at/estimated_minutes), Part of day (morning/noon/afternoon/night buckets) and Deadline (due_date next to work_date) removed from UI, logic, types, tests. Old stored values are ignored, not deleted. Overdue = task's date/time (lib/taskDate.isScheduleOverdue).
- vitest 3.2.4 installed; related suites pass (137 tests in touched areas).

## Backlog
- P1 Phase 2: review Planning/Diary/Mind/Health/Pomodoro/Knowledge pages; island album backup to account.
- P2 Phase 3: optional Firebase -> platform backend; island growth slideshow; resident requests.
- Google sign-in needs the preview domain added to Firebase authorized domains.
