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


## نقشهٔ راه ایده‌های پژوهش‌شده (آینده؛ تطبیق‌شده با کد فعلی)
فازهای ۱ تا ۳ و آزمون E2E هستهٔ زمان‌بندی مقدم‌اند؛ فاز ۴ Deadline اختیاری و جداگانه در بالا ثبت شده است. ایده‌های این جدول فقط وارد نقشهٔ راه می‌شوند و هنوز مجوز اجرای کد نیستند.

| موضوع | آنچه اکنون در کد هست | مسیر پیشنهادی |
|---|---|---|
| تقویم TickTick | ماه/هفته/روز/فهرست، شمسی/میلادی، تعطیلات و چرخه، ایجاد سریع تسک از روز؛ رویداد Agent فعلاً از مجموعهٔ تسک‌ها خوانده/ساخته می‌شود. | فیلترهای سبک و جابه‌جایی تسک در تقویم را بعد از تثبیت schedule بررسی کن؛ همگام‌سازی تقویم بیرونی دیرتر و با جلوگیری از نسخهٔ تکراری. |
| صفحهٔ داخل تسک | جزئیات غنی، نوار فراداده و اقدام‌های جمع‌شونده، مرحله‌ها، چک‌لیست، نوت، پیوست، AI، تمرکز، سابقه و پیوندها از قبل وجود دارند. | فقط بازبینی ترتیب و وضوح همین بخش‌ها در موبایل؛ صفحهٔ جدید یا بازسازی جزئیات نساز. |
| Notes و HTML | نوت مستقلِ پوشه/برچسب‌دار با ویرایشگر دیداری/Markdown/پیش‌نمایش و یادداشت‌های متصل به تسک وجود دارد. HTML ایمن برای سند آموزشی/Knowledge موجود است. | قالب نوت و تبدیل مورد تأییدشدهٔ Action Item به تسک را در همان بخش‌ها بررسی کن؛ HTML آزاد به تسک‌ها اضافه نشود. |
| AI | پنل AI تسک، پیشنهاد زیرتسک/فراداده، ساخت نوت، چت، Pomodoro، تاریخ طبیعی و دیکتهٔ صوتی وجود دارند. | بعداً ورودی چندتسکی، پیشنهاد برنامهٔ روز/هفته و پرسش تقویم را به شکل پیش‌نویسِ قابل بازبینی اضافه کن؛ نوشتن خودکار ممنوع. |
| Templates | قالب تک‌تسک در Quick Add و قالب‌های تخصصی Knowledge وجود دارند؛ قالب عمومی پروژه/چندتسکی و گالری قالب نوت دیده نشد. | ابتدا ذخیره/بازیابی قالب فعلی را کامل کن، سپس نمونه‌های قابل‌کپی پروژه و نوت را در مسیرهای فعلی بررسی کن. |
| Focus To-Do | تایمر ۲۵/۵/۱۵ قابل تنظیم، اتصال به تسک، ثبت جلسه، آمار امروز/۷ روز و تاریخچهٔ صفحه‌بندی‌شده وجود دارد. | تخمین اختیاری تعداد جلسه و گزارش ماهانه را بعد از بررسی نیاز و مدل داده بررسی کن؛ مسدودسازی برنامه‌ها و ابزارهای سیستم‌عامل مرحلهٔ دیرتر است. |

جزئیات وضعیت کد، نمونهٔ قالب‌ها، ترتیب اولویت و شروط حریم خصوصی در plan/plan.md آمده است.
