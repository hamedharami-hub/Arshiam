# تحویل بستهٔ ۳ — تاریخچهٔ مرور و مهاجرت امن

## محدوده و مبنا

- شاخه: `codex/planning-phase-zero`
- مبنای بسته: `240cab8`.
- قرارداد مرجع: بخش‌های ۶ و ۷ از `docs/PLANNING_EXECUTION_CONTRACT_FA.md`.
- طراحی کلی، تم، رنگ، فونت و چیدمان بازطراحی نشد. فقط وضعیت همگام‌سازی کنار یادداشت و دادهٔ تاریخی در اجزای موجود نمایش داده می‌شود.
- هیچ مهاجرت حساب واقعی اجرا نشده و migration به login یا subscription تسک‌ها متصل نیست.

## تاریخچهٔ مرور

شناسهٔ دوره اکنون horizon، شروع، پایان و calendar را دربرمی‌گیرد؛ داده‌ها زیر حساب همان uid ذخیره می‌شوند. سند دوره latest pointer است و هر پایان یا اصلاح موفق، revision تازه‌ای در `users/{uid}/plan_reviews/{periodId}/revisions/{intentId}` می‌سازد. transaction هم‌زمان pointer و revision را می‌نویسد، `base_revision` را کنترل می‌کند و اصلاح را با `previous_revision_id` به نسخهٔ پیشین وصل می‌کند. سند نسخهٔ قبلی تغییر نمی‌کند. رکورد cloud قدیمیِ بدون revision هنگام نخستین اصلاح به‌عنوان legacy revision ثبت می‌شود؛ برایش snapshot تاریخی ساخته نمی‌شود.

mirror محلی فقط پس از موفقیت transaction به‌روزرسانی می‌شود. یادداشت در draft جداگانه و با کلید uid/دوره نگهداری می‌شود؛ وضعیت‌های local-only شامل editing، pending، error و conflict هستند. شکست permission مرور را کامل نمی‌کند. آفلاین، intent و snapshot دقیق نگه داشته می‌شود و با رویداد اتصال دوباره همان intent retry می‌شود. اگر latest در سرور تغییر کند، transaction به‌جای overwrite، draft را conflict می‌کند؛ متن محلی حفظ می‌شود. تغییر یادداشت پس از مشاهدهٔ تعارض، base را روی latest می‌گذارد تا تصمیم کاربر اعمال شود.

یادداشت‌های قدیمی `arsh_plan_review_v1:{uid}:...` فقط برای همان uid خوانده می‌شوند؛ کلید منبع حذف نمی‌شود. متن متفاوت با cloud به‌صورت draft conflict نگه داشته می‌شود و متن cloud overwrite نمی‌شود. نشانگر migration فقط پس از commit، draft قابل‌بازیابی یا ثبت conflict گذاشته می‌شود؛ در failed، نشانگر ثبت نمی‌شود تا تلاش بعدی ممکن بماند. زمان قبلی حفظ می‌شود؛ زمان یا snapshot مجهول جعل نمی‌شود. گزارش و درصد مرور پایان‌یافته از snapshot immutable خوانده می‌شوند. برای رکورد قدیمی که snapshot ندارد، پیام «تاریخچه در دسترس نیست» نشان داده می‌شود و فهرست فعلی به گذشته نسبت داده نمی‌شود.

## مهاجرت زمان‌بندی تسک

`previewTaskScheduleMigration(uid, tasks)` فقط می‌خواند و برای هر تسک fingerprint، نسخهٔ منبع، زمان تغییر، presence/null فیلدهای legacy، منطقهٔ زمانی، تقویم، پیشنهاد، پشتیبان و علت conflict را برمی‌گرداند. fingerprint شامل uid و taskId است و نبودن فیلد را از null جدا می‌کند؛ تغییر updated_at، timezone، calendar یا تنظیم تقویم کاربر، preview قبلی را نامعتبر می‌کند.

مقادیر تاریخ/زمان خراب، منبع‌های زمان متفاوت، بازه‌های فعال ناسازگار، زمان مرزی legacy مبهم، منطقهٔ زمانی ناشناخته/نامعتبر و تاریخ بیرون از دوره fail-closed می‌شوند و `patch` نمی‌گیرند. فقط یک مورد ready را caller می‌تواند صریحاً به `applyTaskScheduleMigration` بدهد. apply در transaction تسک را دوباره می‌خواند، fingerprint را مقایسه می‌کند، preview را از نو می‌سازد و فقط در صورت برابری task را به‌روز می‌کند. سند backup نسخه‌دار با شناسهٔ uid/task/fingerprint نوشته می‌شود و جای backup قبلی را نمی‌گیرد. اجرای offline در صف upsert قرار نمی‌گیرد و `offline` برمی‌گرداند. rollback فقط وقتی اجرا می‌شود که fingerprint خروجی مهاجرت هنوز برابر باشد؛ ویرایش بعدی باعث conflict و حفظ دادهٔ فعلی می‌شود.

هیچ caller خودکاری برای migration وجود ندارد. دکمهٔ بررسی فقط وقتی تسک legacy آماده یا متعارض در دادهٔ همین `PlanningBoard` باشد ظاهر می‌شود. دیالوگ با عنوان و توضیح صریح «محدودهٔ همین نمای برنامه‌ریزی» فهرست dry-run را نشان می‌دهد؛ در صفحهٔ Planning دادهٔ کاربر بارگذاری می‌شود و در نمای تعبیه‌شدهٔ Tasks ممکن است scope به برنامه‌ریزی همان نما/پوشه محدود باشد. کاربر می‌تواند هر ready را جداگانه apply کند؛ batch وجود ندارد. بعد از موفقیت، listener تسک و `tasks-changed` به‌روزرسانی را پخش می‌کنند و callback refresh موجود هم فراخوانی می‌شود.

برای conflict علت نمایش داده می‌شود؛ apply در دسترس نیست. کاربر می‌تواند تسک را برای اصلاح باز کند یا مورد را فعلاً رد کند. دیالوگ قبلی برای انتخاب scheduleهای متعارض وجود نداشت و این بسته سیاست برنده‌شدن داده را حدس نمی‌زند؛ پس conflict با ویرایش صریح تسک حل می‌شود. scope محلی نگه داشته شده و کاربر به تنظیمات عمومی ارجاع داده نمی‌شود. تسک‌های جدید در preview بعدی ظاهر می‌شوند؛ helper وضعیت جهانی بر اساس taskId نگه نمی‌دارد.

## فایل‌ها

- تاریخچه و draft مرور: `frontend/src/lib/planReviewService.ts`, `frontend/src/components/planning/PeriodReview.tsx`.
- dry-run، CAS، backup و rollback: `frontend/src/lib/taskScheduleMigration.ts`; دکمه و دیالوگ scoped در `frontend/src/components/planning/PlanningBoard.tsx`.
- آزمون‌ها: `frontend/src/lib/planReviewService.test.ts`, `frontend/src/lib/taskScheduleMigration.test.ts`, `frontend/src/components/planning/PeriodReview.test.tsx`, `frontend/src/components/planning/PlanningBoard.test.tsx`.
- این handoff.

## آزمون و بررسی

- `cd frontend && npx vitest run src/lib/planReviewService.test.ts src/lib/taskScheduleMigration.test.ts src/lib/taskSchedule.test.ts src/components/planning/PeriodReview.test.tsx src/components/planning/PlanningBoard.test.tsx` — موفق؛ ۵ فایل و ۴۰ تست.
- `cd frontend && npm run typecheck` — موفق.
- `git diff --check` — موفق.
- UI فقط dry-run می‌گیرد و apply را پس از کلیک و برای یک ready در هر بار صدا می‌زند؛ هیچ batch خودکار یا اتصال به login/subscription وجود ندارد.
- مرورگر/مقایسهٔ بصری اجرا نشد؛ ظاهر به‌جز متن وضعیت ضروری و محتوای گزارش تاریخی دست‌نخورده است.
- هیچ migration روی حساب واقعی اجرا نشد.

## محدودیت باقی‌مانده

Conflictها در دیالوگ مقدار جدید انتخاب نمی‌کنند؛ کاربر باید تسک را باز کند و با کنترل‌های فعلی آن را اصلاح کند، سپس preview تازه بگیرد. بررسی قواعد production Firestore و apply/rollback روی Firebase واقعی انجام نشد؛ پیش از اجرای دادهٔ واقعی باید مجوز نوشتن مسیر `schedule_migration_backups` با قواعد Firestore تأیید شود. این commit هیچ مهاجرت واقعی اجرا نمی‌کند.
