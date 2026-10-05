# تحویل بستهٔ ۲ — نتیجهٔ ذخیره و کش خالی

## محدوده و مبنا

- شاخه: `codex/planning-phase-zero`
- مبنای این بسته: `4a77df9a0a9aaf0f78e0d37cb41ee3ce4b7acfbd` (پایان بستهٔ ۱)
- قرارداد: بخش ۵ از `docs/PLANNING_EXECUTION_CONTRACT_FA.md`.
- طراحی کلی، تم، رنگ، فونت و چیدمان بازطراحی نشدند. فقط وضعیت‌های ضروری ذخیره در سبک نوشتاری موجود نمایش داده می‌شوند و کنترل هنگام ارسال غیرفعال می‌شود.

## نتیجهٔ ذخیره و rollback

`TasksView.patchTask`، `useHorizonData.saveTask` و مسیر تغییر روز در داشبورد وضعیت دقیق `saved | queued | failed` برمی‌گردانند. `toSaveStatus` فقط همین سه رشته را می‌پذیرد؛ `undefined`، `void`، boolean و مقدار ناشناخته شکست محسوب می‌شوند. exceptionهای persist نیز به `failed` تبدیل می‌شوند.

یک journal نسخه‌دار، هر تغییر خوش‌بینانه را بر اساس حساب، تسک و فیلد دنبال می‌کند. اگر نوشتن قدیمی شکست بخورد، مقدار جدیدتر را پاک نمی‌کند؛ اگر آخرین نوشتن شکست بخورد، فیلد را به آخرین مقدار تأییدشده برمی‌گرداند. نتیجهٔ write متعلق به حساب قبلی پس از تعویض حساب روی تسک‌های حساب تازه اعمال نمی‌شود.

`TaskActionSheet` اکنون نتیجهٔ `onPatch` را عادی‌سازی می‌کند. «انجام نمی‌شود»، pin و ذخیرهٔ موقعیت پس از `failed` موفقیت نشان نمی‌دهند و پنل را نمی‌بندند. `queued` به‌عنوان ذخیرهٔ محلی/همگام‌سازی بعدی گزارش می‌شود. قرارداد `onPin` و مسیرهای `TaskDetail` و `TodayDashboardView` برای وضعیت صریح هماهنگ شدند؛ `TaskCloseDialog` هم در شکست باز می‌ماند. این دو caller به این دلیل در دامنه آمدند که مستقیم به callback همین action sheet وصل بودند و باید نتیجهٔ واقعی را تا UI منتقل کنند.

## ورودی، retry و عملیات برنامه

افزودن سریع در Plan، افزودن زیرتسک، گام کوچک‌تر از سطح بالاتر، افزودن هدف و افزودن کار در مرور، شناسهٔ intent را در شکست یا exception نگه می‌دارند و در retry همان شناسه را استفاده می‌کنند. موفقیت ابری و ذخیرهٔ queued هر دو ورودی را پاک می‌کنند؛ شکست متن را نگه می‌دارد. guard هم‌زمان و `finally` از submit تکراری و گیرکردن حالت busy جلوگیری می‌کنند.

callbackهای انتقال فردی، انتقال گروهی، حذف از برنامه و مرور وضعیت صریح دارند. انتقال گروهی تعداد saved/queued/failed واقعی را در پیام نتیجه می‌آورد. خطای فعالیت یا refresh جانبی، ذخیرهٔ اصلی تسک را به شکست جعلی تبدیل نمی‌کند.

## Values & Goals و حساب‌ها

`subscribeMindValues` پاسخ سرور برای سند ناموجود را `{}` می‌داند و کش قبلی را پاک می‌کند. cache دیررس پس از snapshot سرور، callback پس از unsubscribe و state متعلق به uid قبلی اعمال نمی‌شوند. پاسخ خالی موفق برای values/goals از loading و error جداست و کش همان uid را به‌ترتیب `{}` و `[]` می‌کند. نماهای Values & Goals و Life System Map دادهٔ حساب دیگر را هنگام جابه‌جایی uid نمایش نمی‌دهند.

## فایل‌ها

- مسیرهای ذخیرهٔ تسک: `TasksView.tsx`, `useHorizonData.ts`, `TodayDashboardView.tsx`, `TaskDetail.tsx`, `TaskActionSheet.tsx`, `TaskCloseDialog.tsx`.
- Plan و ورودی‌ها: `PlanningBoard.tsx`, `PlanItemCard.tsx`, `UpperLevelPanel.tsx`, `PlanningTrays.tsx`, `PeriodReview.tsx`, `ValuesGoalsPanel.tsx`.
- کش/حساب: `firestoreDataService.ts`, `ValuesGoalsView.tsx`, `LifeSystemMap.tsx`.
- ابزار و آزمون: `saveFeedback.ts`, `taskPatchJournal.ts`, `taskCreateIntent.ts` و تست‌های متناظر در lib، hooks، pages و components.
- این handoff.

## آزمون و بررسی

- `cd frontend && npm run typecheck` — موفق.
- `cd frontend && npx vitest run src/lib/saveFeedback.test.ts src/lib/taskPatchJournal.test.ts src/lib/firestoreDataService.test.ts src/hooks/useHorizonData.test.tsx src/components/planning/PlanItemCard.test.tsx src/components/planning/UpperLevelPanel.test.tsx src/components/planning/PeriodReview.test.tsx src/components/planning/PlanningBoard.test.tsx src/pages/ValuesGoalsView.test.tsx src/components/TaskActionSheet.test.tsx` — موفق؛ ۱۰ فایل و ۴۳ تست.
- `git diff --check` — موفق.

تست‌ها وضعیت‌های saved/queued/failed و مقدار نامعتبر، rollback در دو نوشتن هم‌زمان، تعویض uid، خالی‌شدن کش از پاسخ سرور، callback پس از unsubscribe، نگهداری متن پس از شکست/exception، شناسهٔ پایدار retry، double-submit و پیام نادرست موفقیت را می‌پوشانند.

مقایسهٔ تصویری بستهٔ ۲ اجرا نشد؛ بنابراین تأیید بصری مستقل ثبت نشده است. ساخت production نیز در این بسته اجرا نشد.

## خارج از این بسته

تاریخچه و نسخه‌بندی مرور، مهاجرت امن، کار بعدی/WIP، waiting و dependency، AI و سناریوهای جامع پذیرش به بسته‌های بعد تعلق دارند. این بسته هیچ دادهٔ واقعی را مهاجرت یا دست‌کاری نمی‌کند.
