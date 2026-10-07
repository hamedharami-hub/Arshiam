# ARSHNAZ — One schedule per task (plan)
Spec: /app/memory/IMPLEMENTATION_PROMPT_FA.md (user's Farsi prompt). User language: Farsi.
Constraints: keep UI/themes/bilingual; do not change Vercel or Firebase configuration.

## Phase 1 — Shared schedule core, removals, bugs §5/§6, migration (Status: IN PROGRESS → testing)
Done:
- lib/taskSchedule.ts single model (none / period / day / datetime), schedule_v=2, readSchedule/schedulePatch, overlap views, custom-range next/prev, clear labels.
- Time block / Part of day / Deadline removed from active UI paths.
- Auto migration (lib/taskScheduleMigration.ts) runs from subscribeToTasks on login; idempotent; backup in `schedule_legacy`; tests added.
- Shared write adapter `normalizeTaskWrite` (firebaseStore tasks insert/update, persistTask, imageTaskBatch): legacy `due_date` writes → single schedule; removed fields dropped.
- Shared selector `isTodayCommitment` → CheckinView + CognitiveLoadCard (bug 13); honest label.
- smartListService horizon filter/sort read the single schedule (bug 3 side path).
- LifeArchitect → Mind goal horizon mapped losslessly (quarter added) (bug 12).
- AI contexts use compactTasksForAI (one "when"); Pomodoro orders by schedule; no fabricated clock times (taskFromMind, reminders, lifeArchitect).
- Vercel API: agentApi calendar events / assistantTasks write work_date via scheduleWrite; ESM `.js` import fix; api tests 36/36.
- Env fix: backend/.env recreated (was missing → /api/arsh 502). "Infinite load" was the screenshot tool waiting for networkidle (Firestore streaming) — pages load fine.
- Vitest: all suites pass (flaky KnowledgeBaseView test stabilised).
Remaining: testing_agent E2E acceptance scenario; fix findings.

## Phase 2 — §4 additions (Status: NOT STARTED)
My Next Task, Waiting + prerequisites, WIP soft limit, review actions, goal finish marker.

## Phase 3 (Status: NOT STARTED)
Review history snapshots, TaskAIPanel assistance, goal horizons in LifeArchitect UI.


## Phase 4 — Optional task deadline (Status: APPROVED FOR FUTURE; NOT IMPLEMENTED)
- Add an optional date-only `deadline_date` for one-off tasks with a genuine external cutoff. Keep it separate from the task's one operational schedule (`work_date` or `planning_*`).
- Keep the interface quiet: no new page, tab, navigation item, permanent dashboard card, or default notification. Use one compact field in existing task details, a small calendar marker on the deadline day, and a row badge only when the deadline is within seven days or overdue.
- Keep the old `deadline` field retired. Do not auto-restore values from `schedule_legacy`; preserve backups. Deadline status is separate from schedule-overdue status, and never reschedules or completes a task.
- Update the shared task type/writers/readers and task/agent API validation; ensure reminders stay separate. Add tests for independent schedule/deadline edits, date-only timezone safety, overdue/completed states, same-day deduplication, bilingual UI, and no default notifications.
