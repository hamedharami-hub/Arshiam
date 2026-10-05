# تحویل بستهٔ ۰۵ — انتظار، پیش‌نیاز، هدف و مرور

شاخه: `codex/planning-phase-zero`

مبنای تغییر: `1d45697` (پس از تحویل بستهٔ ۰۴)

وضعیت: پیاده‌سازی و آزمون بستهٔ ۰۵؛ بدون push یا merge.

## تغییرات

- وضعیت `waiting` و فیلدهای اختیاری `waiting_reason`، `prerequisite_ids` و `finish_criterion` به نوع تسک افزوده شد. پنل موجود اقدامات تسک امکان انتظار با علت اختیاری، ادامهٔ کار و مدیریت پیش‌نیازها را دارد. پیش‌نیازهای تکرارشونده یا چرخه‌ساز قابل افزودن نیستند. حالت آمادگی فقط از روابط و وضعیت‌های صریح محاسبه می‌شود و هیچ شروع یا زمان‌بندی خودکاری انجام نمی‌دهد.
- اگر فهرست تسک‌ها از سرور در دسترس نباشد، پنل وضعیت کش را فهرست کامل فرض نمی‌کند: مرجع گمشده را حذف‌شده نشان نمی‌دهد و ذخیرهٔ پیش‌نیازها را غیرفعال می‌کند. تغییرات دریافت‌نشدهٔ والد، پیش‌نویس ویرایش‌شدهٔ کاربر را جایگزین نمی‌کنند. ذخیره‌های انتظار و پیش‌نیاز با guard دوبارکلیک و آزادسازی busy در `finally` انجام می‌شوند.
- اعتبارسنجی `parent_id` و `plan_parent_id` مستقل است. انتخاب والد در جزئیات/دیالوگ زیرتسک و اتصال هدف در Plan از خودارجاع و چرخه جلوگیری می‌کنند. حذف تسک همچنان فقط شاخهٔ `parent_id` را حذف می‌کند؛ هدفِ متصل باقی می‌ماند و پیش‌نیاز ارجاع‌دهنده نیز باقی می‌ماند تا کاربر دربارهٔ ارجاع گمشده تصمیم بگیرد.
- پیشرفت در Plan و درخت تسک از برگ‌های یکتا به دست می‌آید؛ والد اجرایی جداگانه شمرده نمی‌شود، والد تیک‌خورده فرزندان باز را کامل نمی‌کند و `wont_do` در درصد انجام‌شده نمی‌آید.
- کارت Plan وضعیت را کنار دورهٔ زمان‌بندی واقعی نشان می‌دهد. معیار پایان اختیاری در یک فیلد جدا از درصد زیرکارها ذخیره می‌شود. مرور دوره امکان ادامه، کوچک‌کردن به دورهٔ ریزتر داخل همان دوره، انتقال به دورهٔ انتخابی، انتظار، برداشتن از برنامه و کنارگذاشتن را دارد. برداشتن از برنامه فقط فیلدهای برنامه را پاک می‌کند؛ کنارگذاشتن وضعیت را تغییر می‌دهد و تسک را حذف نمی‌کند.

## محدودیت صریح

سرویس فعلی برای occurrence/شناسهٔ مستقل هر نوبت تکرار، هویت قابل اتکایی ندارد. به همین دلیل لینک‌کردن تسک تکرارشونده به‌عنوان پیش‌نیاز غیرفعال است و در پنل علت نمایش داده می‌شود؛ عنوان تسک یا وضعیت تکمیل جاری برای حدس‌زدن وقوع استفاده نمی‌شود. انتظار دستی با توضیح همچنان در دسترس است.

## فایل‌های تغییرکرده

- منطق/مدل: `frontend/src/lib/taskTypes.ts`, `frontend/src/lib/taskRelations.ts`, `frontend/src/lib/planCascade.ts`, `frontend/src/features/tasks/taskTree.ts`
- روابط و وضعیت تسک: `frontend/src/components/TaskActionSheet.tsx`, `frontend/src/components/TaskListItem.tsx`, `frontend/src/components/TaskDetail.tsx`, `frontend/src/components/MakeChildDialog.tsx`, `frontend/src/components/task-detail/TaskDetailBottomRail.tsx`
- Plan و مرور: `frontend/src/components/planning/PeriodPicker.tsx`, `frontend/src/components/planning/PeriodReview.tsx`, `frontend/src/components/planning/PlanItemCard.tsx`, `frontend/src/components/planning/PlanningBoard.tsx`
- آزمون‌ها: `frontend/src/lib/taskRelations.test.ts`, `frontend/src/lib/planCascade.test.ts`, `frontend/src/features/tasks/taskTree.test.ts`, `frontend/src/features/tasks/taskService.test.ts`, `frontend/src/components/MakeChildDialog.test.tsx`, `frontend/src/components/TaskActionSheet.test.tsx`, `frontend/src/components/TaskListItem.test.tsx`, `frontend/src/components/planning/PeriodReview.test.tsx`, `frontend/src/components/planning/PlanItemCard.test.tsx`, `frontend/src/components/planning/PlanningBoard.test.tsx`, `frontend/src/components/task-detail/TaskDetailBottomRail.test.tsx`

## راستی‌آزمایی

- `npx vitest run src/lib/taskRelations.test.ts src/lib/planCascade.test.ts src/lib/taskSchedule.test.ts src/features/tasks/taskTree.test.ts src/features/tasks/taskService.test.ts src/components/MakeChildDialog.test.tsx src/components/TaskActionSheet.test.tsx src/components/TaskListItem.test.tsx src/components/planning/PeriodReview.test.tsx src/components/planning/PlanItemCard.test.tsx src/components/planning/PlanningBoard.test.tsx src/components/task-detail/TaskDetailBottomRail.test.tsx` — موفق؛ ۱۲ فایل و ۸۹ تست.
- `npm run typecheck` در `frontend/` — موفق؛ exit status `0` و بدون diagnostic.
- `git diff --check` — موفق؛ خطای فاصله‌گذاری/whitespace نداشت.
- build کامل و بررسی مرورگری پس از تغییرات اجرا نشد. تصاویر baseline قبلی به‌تنهایی تأیید بصری تغییرات جدید محسوب نمی‌شوند؛ ظاهر کلی بازطراحی نشده و کنترل‌های لازم در اجزای فعلی اضافه شده‌اند.
- `frontend/node_modules` محلی و خارج از commit باقی می‌ماند.

## بازبینی مستقل

بازبینی مستقل یک حالت مرزی در درصد پیشرفت پیدا کرد: اگر والد تیک خورده بود و تمام فرزندانش `wont_do` بودند، والد می‌توانست به‌اشتباه به‌عنوان برگ شمرده شود و درصد انجام‌شده را بالا ببرد. همان خطا در درخت زیرتسک و چرخهٔ دادهٔ خراب نیز ممکن بود یک والد را برگ فرض کند. اصلاح شد: والد دارای فرزند، حتی اگر همه کنار گذاشته شده باشند، واحد انجام‌شده نیست؛ چرخهٔ بی‌برگ هم پیشرفت ساختگی نمی‌گیرد.

- `npx vitest run src/lib/planCascade.test.ts src/features/tasks/taskTree.test.ts` — موفق؛ ۲ فایل و ۲۰ تست.
- `npm run typecheck` پس از اصلاح مستقل — موفق؛ exit status `0`.
- `git diff --check` پس از اصلاح مستقل — موفق.
