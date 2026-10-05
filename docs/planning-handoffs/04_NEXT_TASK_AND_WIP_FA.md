# تحویل بستهٔ ۴ — کار بعدی، مهم امروز و WIP

## محدوده و مبنا

- شاخه: `codex/planning-phase-zero`.
- مبنای بسته: `0fd730c`.
- قرارداد مرجع: بخش ۹ از `docs/PLANNING_EXECUTION_CONTRACT_FA.md` و بستهٔ ۴ از `docs/LUNA_SOL_EXECUTION_PLAN_FA.md`.
- از menu، action sheet، کارت‌های تسک و صفحهٔ Today فعلی استفاده شد؛ طراحی کلی، تم و چیدمان بازطراحی نشد. فقط نشان‌های کوچک کنار تسک و برچسب فشردهٔ انتخاب امروز اضافه شده‌اند.
- هیچ اطلاعات حساب واقعی یا migration داده اجرا نشده است.

## انتخاب «کار بعدی من» و «مهم امروز»

انتخاب کار بعدی دستی است، برای هر uid جدا نگهداری می‌شود و مقدار اولیه‌اش خالی است. کارهای `done`، `wont_do`، `waiting` و تکمیل‌شده قابل انتخاب نیستند. انتخاب از action sheet همان تسک قابل تعویض یا پاک‌کردن است و نشان آن در لیست Today و نوار بالای صفحه دیده می‌شود. سیستم از priority یا overdue برای انتخاب خودکار استفاده نمی‌کند.

اگر زمان/روز برنامه‌ریزی‌شده در آینده باشد، دیالوگ تصمیم صریح می‌خواهد و می‌گوید انتخاب، تاریخ تسک را عوض نمی‌کند. نشان «مهم امروز» چند تسک را می‌پذیرد و بر اساس uid و روز تقویمی نگهداری می‌شود؛ رفتار `pinned` تغییر نکرده است.

وضعیت زیر کلید local uid-scoped `arshnaz:today-planning:v1:{uid}` نگهداری و در `users/{uid}/app_state/today_planning` همگام می‌شود. هنگام تعویض حساب، hook قبل از اجرای effect دادهٔ uid قبلی را نمایش نمی‌دهد. اگر کاربر پیش از اولین سند معتبر cloud تغییری بدهد، deltaهای تغییر صریح روی snapshot cloud replay می‌شوند تا تنظیم WIP محلی نتواند کار بعدی یا نشان مهم cloud را پاک کند. تغییرهای مهم روز به‌صورت per-task اعمال می‌شوند تا نشان‌های هم‌زمان دیگر حفظ شوند. پاک‌کردن شرطی کار بعدی در زمان rebase هم CAS می‌ماند؛ invalidation مربوط به A انتخاب جدید B را پاک نمی‌کند. binderهای cloud دیگر همچنان قاعدهٔ timestamp قبلی را دارند، چون قابلیت rebase فقط برای callerهای opt-in فعال است.

## WIP اختیاری

تنظیم WIP در منوی More صفحهٔ Today به‌صورت پیش‌فرض خاموش است؛ حد پیشنهادی ۳ و قابل تغییر از ۱ تا ۹۹ است. شمارنده همهٔ تسک‌های باز همان uid با وضعیت `in_progress` را می‌گیرد، حتی اگر برای روز دیگری زمان‌بندی شده باشند. اگر parent و descendant هم‌زمان در حال انجام باشند، parent به‌عنوان roll-up دوباره‌شماری نمی‌شود؛ parent فعال بدون descendant فعال همچنان یک کار حساب می‌شود.

وقتی کاربر از Today یک تسک todo را شروع می‌کند و تعداد به حد رسیده، هشدار نرم نشان داده می‌شود ولی تغییر وضعیت انجام می‌شود. نماهای دیگر شمارنده یا تنظیم WIP را به این action نمی‌دهند و پیش‌فرضشان هشدار ندارد.

## پاک‌سازی انتخاب نامعتبر و محدودیت cache

پس از تکمیل یا حذف موفق تسک انتخاب‌شده، انتخاب پاک می‌شود؛ حذف parent، انتخاب descendant حذف‌شده را هم پاک می‌کند. تغییر موفق به `done`، `wont_do` یا `waiting` نیز selection را پاک می‌کند. شکست ذخیره/حذف، انتخاب را نگه می‌دارد. بازگشایی تسک به‌تنهایی آن را خودکار انتخاب نمی‌کند.

ردیف غایب از cache یا snapshot آفلاین، انتخاب را پاک نمی‌کند. فقط snapshot server-authoritative می‌تواند مورد غایب را نامعتبر اعلام کند؛ مسیرهای completion و delete موفق نیز خودشان پاک‌سازی صریح انجام می‌دهند. تغییرهای Today با compare-and-set اعمال می‌شوند تا callback قدیمی انتخاب جدیدتر را پاک نکند.

## فایل‌ها

- انتخاب، نشان مهم، شمارش WIP و sync: `frontend/src/lib/todayPlanning.ts`, `frontend/src/lib/cloudStateSync.ts`, `frontend/src/hooks/useTodayPlanning.ts`.
- actionها و نشان‌ها: `frontend/src/components/TaskActionSheet.tsx`, `frontend/src/components/TaskListItem.tsx`, `frontend/src/pages/TodayDashboardView.tsx`.
- snapshot معتبر تسک و guard حساب: `frontend/src/features/tasks/taskService.ts`, `frontend/src/lib/firestoreLive.ts`, `frontend/src/hooks/useTasksData.ts`.
- تست‌های تغییر‌یافته و UI سنجیده‌شده: `frontend/src/lib/todayPlanning.test.ts`, `frontend/src/lib/cloudStateSync.test.ts`, `frontend/src/hooks/useTodayPlanning.test.tsx`, `frontend/src/components/TaskActionSheet.test.tsx`, `frontend/src/features/tasks/taskService.test.ts`, `frontend/src/hooks/useTasksData.test.tsx`, `frontend/src/pages/TodayDashboardView.test.tsx`.
- این handoff.

## بررسی‌ها

- `cd frontend && npx vitest run src/lib/cloudStateSync.test.ts src/lib/todayPlanning.test.ts src/hooks/useTodayPlanning.test.tsx src/components/TaskActionSheet.test.tsx src/pages/TodayDashboardView.test.tsx src/features/tasks/taskService.test.ts src/hooks/useTasksData.test.tsx` — موفق؛ ۷ فایل و ۴۸ تست.
- `cd frontend && npm run typecheck` — موفق.
- `git diff --check` — موفق.
- `npm run qa:layout` — ۱۰ سناریو موفق: هشت حالت RTL/LTR در 1280×800 با sidebar چپ/راست و expanded/collapsed؛ RTL با sidebar راست در 1440×900 و 2048×1152. هم‌پوشانی task row یا sidebar ثبت نشد. این harness چیدمان صفحهٔ Today را می‌سنجد؛ action sheet به‌طور جداگانه در تست کامپوننت بررسی شد و screenshot مرورگری مستقل از خود sheet نگرفته شد.
- QA مرورگر پیش از آخرین تغییر sync اجرا شد؛ تغییرهای بعدی فقط منطق sync/CAS و تست‌ها بودند و ظاهر را عوض نکردند. screenshotهای حجیم و `node_modules` وارد commit نمی‌شوند.

## محدودیت باقی‌مانده

Cloud race با mock آزموده شده و روی Firebase واقعی/قواعد production اجرا نشده است. هیچ write آزمایشی به حساب کاربری واقعی انجام نشد.
