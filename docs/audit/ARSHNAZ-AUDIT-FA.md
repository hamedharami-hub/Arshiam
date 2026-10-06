# ممیزی کامل ARSHNAZ — نسخهٔ main

**مخزن:** `https://github.com/hamedharami-hub/Arshiam`
**کامیت:** `b1e9d0b` — «feat(mobile): symmetric 5-slot bottom bar, settings tab customization, speed dial, and android build» — ۶ اکتبر ۲۰۲۶، ۲۰:۲۲ (+۱۱)
**اندازه:** ۱۱۰۱ فایل ردیابی‌شده (~۱۱۲MB با APK)، `frontend/src` شامل ۴۲۵ فایل `.tsx` و ۳۶۹ فایل `.ts`
**پشته:** React 18 + TypeScript + Vite 7 + Tailwind 3 + shadcn/radix + framer-motion + i18next (fa/en، RTL/LTR) + Firebase (Auth/Firestore/Storage) + Capacitor Android + Vercel serverless (`api/`) + یک سرویس FastAPI (`backend/`)

## روش کار و محدوده

این ممیزی در چهار مسیر مستقل انجام شد و سپس **هر یافتهٔ مهم را خودم در کد بازبینی و تأیید/رد کردم**:

| مسیر | دامنه | گزارش تفصیلی |
|---|---|---|
| کد/رفتار | `frontend/src` — باگ‌های عملکردی و منطقی | [`code-bugs.md`](code-bugs.md) — ۳۲ یافته |
| طراحی/UX | شلوغی، ناوبری، عناصر بی‌مصرف، حالت EN | [`design-ux.md`](design-ux.md) — ۳۶ یافته |
| سرور/امنیت | `api/`، `backend/`، قواعد Firestore/Storage، استقرار | [`api-security.md`](api-security.md) — ۳۳ یافته |
| اجرا/سلامت | typecheck، lint، ۱۴۲۶ تست، build، کد و دارایی مرده | همین سند، بخش ۱ و ۸ |

نشانه‌ها: ✅ = خودم در کد/اجرا تأیید کردم · 📄 = از گزارش تفصیلی، برای تأیید نهایی نیاز به بررسی محیطی دارد.
مخزن هنگام ممیزی دست‌نخورده بود؛ اصلاحات مرحلهٔ بعد (بخش ۰) روی همان کلون محلی اعمال شده و هنوز push نشده است.

---

# ۰. اصلاحات اعمال‌شده (دور اول — قابل بازبینی با `git diff`)

۱۶ فایل تغییر کرد + ۱ فایل جدید. هیچ‌کدام از این‌ها رفتار عمدی محصول را عوض نمی‌کند:

| # | اصلاح | فایل | تأیید |
|---|---|---|---|
| ۱ | **بستن راه باز کردن ماژول پولی:** `module_access` از قاعدهٔ عمومی مالک مستثنا شد. سرور با Admin SDK کار می‌کند و قواعد را دور می‌زند، پس سرویس ماژول دست‌نخورده کار می‌کند | `firestore.rules:64-83` | هیچ کد کلاینتی این مسیر را نمی‌خواند (grep صفر) |
| ۲ | APK دیباگ ۳۴MB از مخزن خارج شد (`git rm --cached`؛ فایل روی دیسک ماند) و `*.apk`/`*.aab` به `.gitignore` اضافه شد | `.gitignore`، `ARSHNAZ-debug.apk` | `git status` → `D ARSHNAZ-debug.apk`، `Test-Path` → موجود |
| ۳ | Vercel از yarn به npm تغییر کرد تا با دو `package-lock.json` موجود هم‌خوان و بازتولیدپذیر باشد | `vercel.json:4-5` | هر دو `npm ci` (ریشه و فرانت) با موفقیت اجرا شد |
| ۴ | **تست‌های API واقعاً اجرا شدند:** کانفیگ مستقل + اسکریپت `npm run test:api`؛ الگوی شکسته از کانفیگ فرانت حذف شد | `frontend/vitest.api.config.ts` (جدید)، `frontend/vitest.config.ts:13`، `frontend/package.json` | ✅ **۸ فایل، ۸۵ تست، همه سبز در ۴۰ ثانیه** (پیش‌تر هرگز اجرا نمی‌شد) |
| ۵ | فرمان «ایجاد تسک جدید» در پالت حالا فیلد افزودن سریع را باز می‌کند | `components/CommandPalette.tsx:259-264` | رویداد `lov:open-quick-capture` شنونده دارد (`QuickCaptureDialog.tsx:59`) |
| ۶ | گزینهٔ تکراری «تایم‌باکت» در منوی نمای فولدر حذف شد | `pages/tasks/TasksHeader.tsx:114-116` | diff |
| ۷ | آرایهٔ مردهٔ تب‌ها و `Alt+5` تکراری حذف شد؛ importهای بلااستفادهٔ دو نواری که هرگز رندر نمی‌شوند پاک شد | `components/BottomTabBar.tsx` | typecheck+lint سالم، تست `AdaptiveNavigation` سبز |
| ۸ | دو برچسب سایدبار در حالت EN دیگر فارسی نمی‌مانند | `components/sidebar/SidebarNavSections.tsx:76-77` | کلیدها اضافه شد |
| ۹ | `isAdmin` از custom claims نشست واقعی Firebase خوانده می‌شود (پنل مدیریت دیگر برای ادمین قفل نیست) | `hooks/useUserRole.tsx` | `auth.authStateReady()` + `getIdTokenResult()` |
| ۱۰ | «امروز تسکی نداری» تا آماده‌شدن داده نمایش داده نمی‌شود | `pages/TodayDashboardView.tsx:570-572` | گیت `tasksReady` |
| ۱۱ | فالبک مسیرهای lazy به‌جای `div` خالی، اسپینر + وضعیت برای screen reader | `App.tsx:118-131` | diff |
| ۱۲ | regex ریست چک‌باکس سخت‌تر شد (دیگر `data-checked`/`unchecked` را نمی‌بلعد) | `lib/recurringTaskService.ts:86-89` | تست `recurringTaskService` سبز |
| ۱۳ | لیسنرهای Firestore حالا unsubscribe می‌شوند و هنگام خروج از حساب پاک می‌شوند | `lib/firestoreLive.ts`، `hooks/useAuth.tsx:57-66` | تست‌های `useTasksData`/`taskService`/`firestoreSync` سبز |

| ۱۴ | **باگ P1 سرویس تسک:** اگر `syncAndroidWidget` مقدار Promise برنگرداند یا خطا بدهد، کل `fetchTasks` موفق باطل می‌شد و به کش قدیمی برمی‌گشت. حالا با `Promise.resolve(...).catch()` ایزوله شده (هم‌سبک با خط ۱۲۵) | `features/tasks/taskService.ts:114-117` | ✅ **هر ۱۴ تست `taskService.test.ts` سبز شد** (قبلاً ۲ تست قرمز بود) |

**تأیید پس از دور اول:** `npm run typecheck` ✅ پاس · `npm run lint` ✅ ۰ خطا / ۱۲۹ هشدار (**بدون هشدار جدید**) · تست‌های هدفمند سبز · `npm run test:api` ✅ ۸۵/۸۵ · `npx vite build` ✅ موفق (`precache 218 entries (21003.72 KiB)`) — شمار تست‌های قرمز از **۲۱ به ۱۹** کاهش یافت.

**دور دوم — پنج ایجنت موازی با تختهٔ کار مشترک (T1..T5) و دروازهٔ تأیید Lead (T6):**

| تسک | کار | نتیجهٔ قابل تأیید |
|---|---|---|
| **T1** | یکپارچگی داده | `cloudStateSync.flush` حالا داخل `runTransaction` نسخهٔ سرور را می‌خواند: نسخهٔ جدیدتر ابری بازنویسی نمی‌شود، در صورت وجود `reconcilePending` ویرایش محلی روی نسخهٔ ابری بازپایه می‌شود، و در غیر این صورت نسخهٔ ابری **صریحاً** به `apply` داده می‌شود (به‌جای دور ریختن بی‌صدا) + retry با backoff برای آفلاین. `firestoreDataService` فقط برای تعارض واقعی (نسخهٔ مبنا معلوم و متفاوت) خطا می‌دهد. `firestoreSync` از fail-open به «بازپایه از سرور / امتناع» تغییر کرد. **۸ تست جدید** ⇒ ۷ فایل/۹۸ تست سبز (قبلاً ۹۰) |
| **T2** | حالت انگلیسی | `TaskFilterSheet` (۲۲ رشته + `dir` ثابت)، `AIPanel` و `KeyboardShortcutsDialog` دوزبانه شدند؛ grep: صفر `dir="rtl"` ثابت و صفر متن فارسی بدون معادل انگلیسی؛ زبان پیش‌فرض فارسی دست‌نخورده |
| **T3** | پاک‌سازی کد مرده | **۳۹ فایل حذف شد** (خانوادهٔ horizon، `IslandView`، ۱۰ کامپوننت بی‌مصرف، ۱۷ فایل `ui`، `sm2` تکراری، `App.css`، لوگوی ۸۴۷KB و دو موکاپ) + **۶ وابستگی** حذف و `package-lock.json` همگام شد (`npm ci --dry-run` → exit 0) |
| **T4** | کارایی | precache از **۲۱۸ فایل / ۲۱۰۰۳.۹۰ KiB** به **۲۰۶ فایل / ۷۶۶۱.۰۹ KiB** رسید (**−۶۳.۵٪** در بار اول)؛ تصاویر باغ/فرشته به کش Runtime (CacheFirst، ۳۰ روز) منتقل شدند؛ wasm ۲۵.۶MB تأیید شد که lazy است و هرگز precache نمی‌شد |
| **T5** | موبایل | هالهٔ لمسی نامرئی (`::before -inset-2.5`) روی ۵ کنترل ردیف تسک ⇒ هدف ۳۶–۴۰px بدون تغییر ظاهر؛ کاشی متادیتا ۲۸→۳۶px + fade لبه‌ها؛ سه ردیف تکراری شیت اقدامات در یک ردیف ادغام شد. **۵ تست جدید**، هیچ تستی حذف/تضعیف نشد |
| **T6** | دروازهٔ Lead | `typecheck` ✅ exit 0 · `lint` ✅ ۰ خطا / **۱۲۴ هشدار** (۵ کمتر از خط پایه، بدون هشدار جدید) · `test:api` ✅ **۸۵/۸۵** · `vite build` ✅ exit 0 (`precache 206 entries (7661.09 KiB)`) · تست کامل: ۱۴۳۹ تست در ۲۲۶ فایل |

### نتیجهٔ دروازهٔ نهایی و تحلیل شکست‌ها

| سنجه | خط پایه (بدون تغییر) | نهایی (پس از اصلاحات) |
|---|---|---|
| فایل‌های تست | ۲۲۶ (۲۱۴ سبز / ۱۲ قرمز) | ۲۲۶ (۲۱۴ سبز / ۱۲ قرمز) |
| تست‌ها | ۱۴۲۶ (۱۴۰۵ سبز / ۲۱ قرمز) | ۱۴۳۹ (۱۴۱۳ سبز / ۲۶ قرمز) |
| تست‌های API | اجرا نمی‌شد | **۸۵/۸۵ سبز** |
| build | ✅ ۴m۱۳s · precache ۲۰.۵MB | ✅ ۹m۱۶s · precache **۷.۶۶MB** |
| lint | ۰ خطا / ۱۲۹ هشدار | ۰ خطا / **۱۲۴ هشدار** |

**۱۶ تست از ۲۱ شکست خط پایه برطرف شد** (شامل هر دو شکست `fetchTasks cache completeness` و کل خانوادهٔ `TaskAIPanel`/`KnowledgeDocumentEditorModal`/`SettingsView`/`MakeChildDialog`/`AndroidSettings`/`TaskSplit`).

**دربارهٔ ۲۶ شکست باقی‌مانده — تأیید شد که رگرسیون نیستند:** هر ۱۲ فایل شکست‌خورده را جداگانه و بدون بار موازی دوباره اجرا کردم:
- ۶ فایل غیر-Knowledge (`TaskMetaBar`، `TaskAIPanel`، `dataIntegrityPhaseA`، `firestoreRulesAssumptions`، `focusSession`، `TextSelectionFloatingBar`) → **۴۱/۴۱ سبز**.
- ۳ فایل Knowledge (`KnowledgeBaseView`، `InteractiveStudyView`، `KnowledgeDocumentEditorModal`) → سبز.
- فقط ۳ فایل سنگین Knowledge (`AiQuestionGeneratorModal`، `KnowledgeMindMapView`، `InteractiveLearningModal`) در انزوا هم قرمز ماندند — **و دقیقاً همین فایل‌ها در خط پایهٔ بدون تغییر هم قرمز بودند**؛ همهٔ خطاها `Test timed out in 10000ms` هستند (`KnowledgeMindMapView` تنها برای ۱۸ تست **۱۵۴ ثانیه** زمان می‌برد). یعنی این‌ها flaky/کندی ذاتی است، نه شکستِ تغییرات ما.

**یافتهٔ تازه برای گزارش:** مجموعه‌تست پروژه در وضعیت فعلی «شبکهٔ اطمینان» نیست: با `maxWorkers: 2` و `testTimeout` پیش‌فرض ۵ ثانیه/۱۰ ثانیه، فایل‌های سنگین Knowledge زیر بار تست‌های دیگر به‌طور تصادفی قرمز می‌شوند (در سه اجرای متوالی، سه مجموعهٔ متفاوت از تست‌ها قرمز شدند). پیشنهاد: `testTimeout` واقع‌بینانه (۲۰–۳۰s) برای آن سه فایل، یا جداکردنشان در یک پروژهٔ Vitest مستقل.

**یک تغییر انتظار در تست، با تأیید Lead:** T1 تست قدیمی `firestoreSync.test.ts` را که رفتار fail-open را تثبیت می‌کرد با سه تست جدید (بازپایه از سرور، ردِ نسخهٔ قدیمی‌تر، امتناع در نبود هر دو منبع) جایگزین کرد. Lead این تغییر را بازبینی و تأیید کرد، چون همان رفتارِ باگ‌دارِ گزارش‌شده را حذف می‌کند. همچنین T5 هیچ تست موجودی را تضعیف نکرد (۵ تست جدید، ۰ assertion حذف‌شده).

**آنچه در دور دوم حذف نشد ولی برای پاس بعدی علامت‌گذاری شد:** ۷ وابستگی orphan دیگر (`react-resizable-panels` و ۶ پکیج radix)، `components/bottom-bar/DesktopFloatingDock.tsx` و سه فایل `src/test/*` (ابزارهای دستی QA) — خارج از محدودهٔ T3 بودند.

**جمع کل تغییرات اعمال‌شده روی کلون محلی (هیچ‌کدام commit/push نشده):** `76 files changed, +619 / −4914`؛ شامل **۴۰ فایل حذف‌شده**، ۳۶ فایل ویرایش‌شده و ۱ فایل جدید (`frontend/vitest.api.config.ts`). `git status` سالم است و `dist/` نیز ۴۸.۱MB مانده (کاهش فقط در precache بود، نه در حجم بسته).

**عمداً اصلاح نشد (نیاز به تصمیم مالک):**
- **سیاست احراز هویت `api/_lib/auth.ts`** — محدودکردن مسیر توکن گوگل، تست موجود (`api/api.test.ts:241-271`) را می‌شکند و ممکن است جریان عمدی «Gemini Spark» را از کار بیندازد. دو گزینه در بخش ۲-۲ آمده است.
- **بازگرداندن سایه‌ها** (`tailwind.config.ts:52-56`) — تغییر سراسری ظاهر است و با قید «بدون بازطراحی» در `plan/plan.md:58-60` تناقض دارد.
- **حذف ۴۷ فایل مرده** — چند تست به آن‌ها وابسته‌اند (`AdaptiveNavigation.test.tsx`) و حذف باید با تصمیم مالک انجام شود.

---

# ۱. وضعیت سلامت پروژه (شواهد اجرایی)

| بررسی | فرمان | نتیجه |
|---|---|---|
| Typecheck | `npm run typecheck` | ❌ **در کلون تازه شکست می‌خورد** (۲ خطای TS2307 برای `firebase-admin`)؛ ✅ پس از `npm ci` در ریشهٔ مخزن پاس می‌شود |
| Lint | `npm run lint` | ✅ ۰ خطا — ⚠️ **۱۲۹ هشدار** = ۶۰ مورد `react-hooks/exhaustive-deps` + ۶۷ مورد `react-refresh/only-export-components` |
| تست | `npm test` | ❌ **۲۱ تست قرمز از ۱۴۲۶ تست در ۲۲۶ فایل** (۲۱۴ فایل سبز) — مدت اجرا **۳۶ دقیقه** |
| Build | `npx vite build` | ✅ موفق — «built in 4m 13s»؛ اما `dist` **۴۸.۱MB** و precache‌ی PWA **۲۱۸ فایل / ۲۰.۵MB** |
| CI | — | ❌ هیچ `.github/`، هیچ `firebase.json`، هیچ اسکریپت CI وجود ندارد |
| قفل وابستگی | — | ⚠️ `vercel.json:4-5` با **yarn** نصب می‌کند اما فقط `package-lock.json` در مخزن است (بدون `yarn.lock`) ⇒ نصب تولیدی بازتولیدپذیر نیست |

### ۱-۱. تست‌های قرمز (فهرست واقعی اجرا) ✅

فایل‌های شکست‌خورده: `InteractiveStudyView` (۱)، `review/KnowledgeMindMapView` (۳)، `features/tasks/taskService` (۲)، `KnowledgeBaseView` (۲)، `knowledge/AiQuestionGeneratorModal` (۳)، `TaskAIPanel` (۳)، `knowledge/KnowledgeDocumentEditorModal` (۲)، `TasksView.split` (۱)، `AndroidSettings` (۱)، `lib/dataIntegrityPhaseA` (۱)، `MakeChildDialog` (۱)، `SettingsView` (۱).

دو مورد از این‌ها **خطای منطقی واقعی**اند (نه تایم‌اوت): `fetchTasks cache completeness > does not persist an older response after a newer fetch has finished` و `... preserves known tasks for an offline partial fetch` که مستقیماً به باگ `features/tasks/taskService.ts:115` مربوط‌اند. بقیه عمدتاً تایم‌اوت‌های ۳۲ تا ۷۸ ثانیه‌ای در صفحه‌های سنگین‌اند (خودِ این کندی یک مشکل است: هر فایل تست ۱ تا ۳ دقیقه طول می‌کشد).

### ۱-۲. پیکربندی تایپ‌اسکریپت، سست است ✅

`frontend/tsconfig.app.json:19-23`: `"strict": false`، `"noImplicitAny": false`، `"noUnusedLocals": false`، `"noUnusedParameters": false`. نتیجه: نه خطای ضمنی‌نوع گرفته می‌شود، نه متغیر/تابع بی‌استفاده. (به همین دلیل `tabs` بی‌استفاده در `BottomTabBar.tsx:96-148` سال‌ها زنده مانده و lint هم چیزی نمی‌گوید.)

### ۱-۳. کارایی بستهٔ تولید (کشف‌شده در اجرای build) ✅

- **precache سرویس‌ورکر ۲۱MB است:** `vite.config.ts:152` با `globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]` همهٔ تصاویر سنگین (مثل `garden-greenhouse.png` ۲.۸MB و چهار تصویر `angel-companion` هرکدام ~۱.۹MB) را داخل precache می‌گذارد. نتیجه در خروجی build: `precache 218 entries (21003.90 KiB)`. یعنی در اولین بازدید، سرویس‌ورکر ۲۰.۵MB دانلود می‌کند — روی دادهٔ موبایل کاربر ایرانی/استرالیایی عدد بزرگی است.
- **ترتیب حجم بسته‌ها:** `index` ۵۸۱KB، `vendor-charts` ۵۵۲KB، `vendor-editor` ۵۳۲KB، `vendor-firestore` ۵۱۱KB، `pdf` ۳۶۰KB. `build.chunkSizeWarningLimit: 1000` (`vite.config.ts:187`) آستانهٔ هشدار را به ۱MB برده، پس این حجم‌ها هیچ هشداری تولید نمی‌کنند.
- **فایل ۲۵.۶MB‏ `ort-wasm-simd-threaded.asyncify.wasm`** (موتور onnxruntime برای تشخیص گفتار آفلاین `@huggingface/transformers`) در `dist` ساخته می‌شود و از precache بیرون می‌ماند (خوب)، اما ۲۵MB حجم استقرار می‌سازد.
- **پروکسی توسعه، ۴۰۴ تولید را توضیح می‌دهد:** `vite.config.ts:69,77` مسیر `/api/arsh` را در dev/preview به `http://localhost:8001` (سرویس FastAPI) می‌فرستد؛ در تولید روی Vercel چنین سرویسی وجود ندارد (بخش ۲-۵).

### ۱-۴. تست‌های API هرگز اجرا نمی‌شوند ✅ (📄 برای تاریخچه)

`frontend/vitest.config.ts:13` الگوی `"api/**/*.{test,spec}.{ts,tsx}"` را دارد، اما این الگو نسبت به ریشهٔ `frontend` تفسیر می‌شود، یعنی `frontend/api/**` که وجود ندارد. پوشهٔ واقعی `api/` در ریشهٔ مخزن است و **هیچ‌وقت تست نمی‌شود** — با اینکه ۸ فایل تست (حدود ۹۰KB از جمله `api.test.ts` با ۲۶KB و `agentApi.test.ts` با ۲۴KB) در همان پوشه وجود دارد. شاهد شکست در خود مخزن هم ثبت شده: `docs/planning-handoffs/evidence/phase-zero-api-tests.txt`.

---

# ۲. ده مشکل بحرانی (به ترتیب اثر)

| # | مشکل | شدت | محل | چرا مهم است |
|---|---|---|---|---|
| ۱ | **ماژول‌های پولی با یک نوشتن ساده از Firestore باز می‌شوند** | 🔴 بحرانی ✅ | `firestore.rules:67-78` + `api/arsh/modules.ts:71,76,100-105` | قاعدهٔ عمومی `users/{uid}/**` فقط چند زیرمجموعه را مستثنا کرده و `module_access` در آن فهرست نیست؛ سرور هم همان سند را منبع حقیقت می‌گیرد. کاربر با یک نوشتن در کنسول مرورگر `modules.mind` را می‌سازد و ماژول را آزاد می‌کند؛ شمارندهٔ «۵ تلاش ناموفق رمز» (`modules.ts:83,89-91,111`) هم ریست می‌شود. |
| ۲ | **احراز هویت `/api/tasks` با توکن گوگل، نه توکن Firebase** | 🟠 بالا ✅ | `api/_lib/auth.ts:64-145` → `api/tasks/index.ts:34`, `api/tasks/today.ts:17`, `api/user/me.ts:13` | `verifyToken` پس از تلاش برای توکن Firebase، هر access token گوگل را با `accounts:signInWithIdp` به نشست کامل تبدیل می‌کند (`:96-118`) و در مسیر سوم هویت را از `sub` گوگل می‌گیرد (`:123-138`). هیچ بررسی scope/audience/email_verified نیست. در همین API، ماژول‌ها و دسترسی دستیار از تابع سخت‌گیر `verifyFirebaseIdToken` استفاده می‌کنند ⇒ **دو سیاست امنیتی متفاوت در یک سطح API**. |
| ۳ | **از دست رفتن دادهٔ ابری روی چند دستگاه** | 🟠 بالا ✅ | `cloudStateSync.ts:35-51,95-103` | نوشتن با `setDoc` بدون هیچ مقایسهٔ نسخه؛ برندهٔ نبرد «آخرین نویسنده» با **ساعت کلاینت** تعیین می‌شود. فقط `todayPlanning.ts:139` سیاست `reconcilePending` دارد؛ `garden.ts:297`، `island.ts:195`، `kanbanGoals.ts:240`، `uiPrefsSync.ts:44` ندارند، پس ویرایش آفلاین بی‌صدا دور ریخته می‌شود. (این دقیقاً همان توصیهٔ سند ممیزی قبلی در `docs/SIX_AGENT_RECOMMENDATIONS_FA.md:16` است که اجرا نشده.) |
| ۴ | **تسک‌های قدیمی هرگز ذخیره/حذف نمی‌شوند** | 🟠 بالا ✅ | `firestoreDataService.ts:219-252` | در `writeWithRevision`/`deleteWithRevision` اگر `expected` خالی باشد یا سند سرور فیلد `updated_at/updatedAt` نداشته باشد، `ConcurrentEditError` پرتاب می‌شود. هر سند قدیمی بدون آن فیلد (یا هر دستگاه با کش پاک‌شده) در حلقهٔ «نسخهٔ ابری تغییر کرده» گیر می‌افتد و کاربر هیچ‌وقت نمی‌تواند ذخیره کند. |
| ۵ | **حذف حساب و نیمی از endpointهای `/api/arsh/*` در تولید کار نمی‌کنند** | 🟠 بالا 📄 | `api/user/delete-account.ts:39-46`, `vercel.json:7-17`, `frontend/src/lib/arshApi.ts:8` | حذف حساب مرحلهٔ اول را به سرویس FastAPI می‌سپارد که در Vercel استقرار نمی‌یابد (`.vercelignore`) ⇒ پاسخ ۵۰۳. به همین ترتیب فقط `api/arsh/health.ts` و `api/arsh/modules.ts` تابع Vercel دارند؛ درخواست‌های `/api/arsh/weather`، `/api/arsh/geocode`، `/api/arsh/holidays/au`، `/api/arsh/google/*`، `/api/arsh/attachments/*` روی Vercel به ۴۰۴ می‌خورند مگر `VITE_ARSH_API_URL` تنظیم شده باشد (هواشناسی، تعطیلات استرالیا، ورود از Google Drive/Photos، پیوست‌های قدیمی). |
| ۶ | **تست‌های API هرگز اجرا نمی‌شوند و ۲۱ تست فرانت قرمز است** | 🟠 بالا ✅ | `frontend/vitest.config.ts:13` | یعنی لایهٔ سرور (احراز هویت، حذف حساب، ماژول‌ها، ورودی تسک) هیچ شبکهٔ اطمینانی ندارد؛ و در فرانت هم صفحه‌های Knowledge/Mind/Settings تست قرمز دارند. |
| ۷ | **ناوبری چهارگانه و ۸۷ مسیر، بدون منبع واحد** | 🟠 بالا ✅ | `App.tsx` (۸۷ `<Route>`، ۲۷ `<Navigate>`)، `SidebarNavSections.tsx:113-204`، `lib/sidebarQuickLinks.ts:25-60`، `BottomTabBar.tsx:151-157`، `CommandPalette.tsx:29-48` | سایدبار ۲۹ آیتم در ۵ بخش + ۴ آیتم اصلی، ریل جمع‌شده ۲۳ میان‌بر، نوار پایین ۳ تب از ۸، پالت ۱۸ مورد — همه با فهرست‌ها و نام‌های جدا. کاربر نمی‌تواند نقشهٔ ذهنی ثابتی بسازد؛ این همان «گیج‌کننده» است که در درخواست آمده. |
| ۸ | **حالت انگلیسی نیمه‌کاره** | 🟠 بالا ✅ | `TaskFilterSheet.tsx:247`، `AIPanel.tsx:210,213,222`، `KeyboardShortcutsDialog.tsx:33`، `SidebarNavSections.tsx:140,158` | شیت فیلتر **هیچ** i18n ندارد (نه `useTranslation`، نه متن انگلیسی) و با `dir="rtl"` ثابت رندر می‌شود؛ پنل AI و راهنمای میانبرها هم همین‌طور. دو برچسب سایدبار («ادامهٔ یادگیری»، «پشتیبانی بحران (SOS)») در `EN_LABELS` نیستند و در حالت انگلیسی هم فارسی می‌مانند. |
| ۹ | **عناصر و کنترل‌های بی‌مصرفِ دیده‌شده توسط کاربر** | 🟡 متوسط ✅ | `CommandPalette.tsx:260`، `TasksHeader.tsx:114-119`، `BottomTabBar.tsx:58-71,96-148`، `hooks/useUserRole.tsx:15` | «ایجاد تسک جدید» در پالت رویداد `arshnaz:quick-add-task` را می‌فرستد که **هیچ شنونده‌ای ندارد** (رویداد درست: `lov:open-quick-capture`)؛ گزینهٔ «تایم‌باکت» دو بار پشت‌سرهم در یک منو تکرار شده؛ `Alt+5` همان `Alt+3` (تقویم) است؛ آرایهٔ `tabs` مرده است؛ و `isAdmin` همیشه `false` می‌ماند پس پنل مدیریت و آیتم سایدبارش برای هیچ‌کس باز نمی‌شود. |
| ۱۰ | **حس «تخت و شلوغ»: نبود وضعیت بارگذاری + سایه‌های خنثی‌شده** | 🟡 متوسط ✅ | `App.tsx:118-120`، `TodayDashboardView.tsx:570,756`، `tailwind.config.ts:49-60` | فالبک مسیرهای lazy یک `div` خالی است؛ «امروز تسکی نداری ✨» بدون گیت `tasksReady` (که در `:152` موجود است) نمایش داده می‌شود؛ و در توکن‌ها `shadow-2xs/xs/sm/DEFAULT/md` همه `none` شده‌اند در حالی که ۲۲۶ بار در کد استفاده می‌شوند ⇒ کارت‌ها هیچ سلسله‌مراتبی ندارند و صفحه‌ها مسطح و شلوغ دیده می‌شوند. |

---

# ۳. باگ‌های عملکردی و کدی (فرانت‌اند)

| # | باگ | شدت | محل | توضیح کوتاه |
|---|---|---|---|---|
| ۱ | نوشتن ابری بدون بررسی نسخه | P1 | `lib/cloudStateSync.ts:35-51` | بخش ۲-۳ ✅ |
| ۲ | `ConcurrentEditError` دائمی | P1 | `lib/firestoreDataService.ts:230,249` | بخش ۲-۴ ✅ |
| ۳ | بررسی تعارض fail-open | P1 | `lib/firestoreSync.ts:230-262` | اگر نه لیسنر زنده باشد نه کش محلی، بررسی نسخه کاملاً رد می‌شود و نوشتن بدون کنترل انجام می‌شود؛ کامنت خط ۲۵۶ خلافش را ادعا می‌کند. 📄 |
| ۴ | لیسنرهای Firestore هرگز بسته نمی‌شوند | P1 | `lib/firestoreLive.ts:27-51` | خروجی `onSnapshot` دور ریخته می‌شود؛ `registry` فقط در خطا پاک می‌شود و هیچ `stop()` صادر نمی‌شود ⇒ نشتی حافظه/سهمیه و باقی‌ماندن لیسنر پس از تعویض حساب. ✅ |
| ۵ | چک‌این روزانه تکراری | P1 | `lib/reminders.ts:343-384` | تشخیص تکراری فقط تسک‌های `created_at >= امروز` را می‌بیند؛ تسکی که با تکرار به امروز آمده دوباره ساخته می‌شود. `LAST_TASK_KEY` هم در خط ۳۸۳ حتی وقتی درج ناموفق/آفلاین باشد ثبت می‌شود. ✅ (تحلیل کد) |
| ۶ | `enqueueOp` بدون مالک | P1 | `components/TaskDetail.tsx:568` | ورودی صف بدون `ownerId` ⇒ `canReplayForOwner` همیشه false ⇒ این تغییر هیچ‌وقت همگام نمی‌شود. 📄 |
| ۷ | `sm2` تکراری و مرده | P2 | `lib/sm2.ts` در برابر `lib/leitnerService.ts:150` | دو پیاده‌سازی مستقل SM-2؛ فایل `lib/sm2.ts` هیچ‌جا import نمی‌شود. ✅ |
| ۸ | روز UTC در آمار مطالعه | P2 | `lib/leitnerService.ts:433-445` | کلید روز با `toISOString()` ساخته می‌شود ⇒ برای ایران/سیدنی streak کم‌شماری می‌شود. 📄 |
| ۹ | حالت strict تسک‌های تاریخ‌دار را پنهان می‌کند | P2 | `lib/timeBuckets.ts:241-256` | 📄 |
| ۱۰ | `localStorage.setItem` بدون محافظ | P2 | `lib/reminders.ts:309,340` | در حالت private/quota استثنا بالا می‌آید. 📄 |
| ۱۱ | اسکن کل کالکشن روی هر خطای کوئری | P2 | `lib/firebaseStore.ts:151-156,182-186` | `.in()` با بیش از ۱۰ مقدار به خواندن کل کالکشن می‌افتد ⇒ کندی و مصرف سهمیه. 📄 |
| ۱۲ | Context با value بازسازی‌شده | P2 | `hooks/useAuth.tsx:142-155` | هر رندر همهٔ مصرف‌کننده‌ها را دوباره رندر می‌کند. 📄 |
| ۱۳ | خروج از حساب، دادهٔ کاربر قبلی را پاک نمی‌کند | P2 | `hooks/useAuth.tsx:100-104` | کش/صف محلی کلید‌خورده با uid قدیمی روی دستگاه می‌ماند. 📄 |
| ۱۴ | شکست تکمیل تکرارشونده با زیرتسک حذف‌شده | P2 | `lib/recurringTaskService.ts:295` | 📄 |
| ۱۵ | `nlDate` — «شب» داخل «شبکه» و شرط بی‌اثر روز هفته | P3 | `lib/nlDate.ts:46,132` | 📄 |
| ۱۶ | قالب‌بندی سخت‌کد `fa-IR` در رابط انگلیسی | P3 | `components/FirebaseSyncCard.tsx:46`, `FolderAIChat.tsx:231` | 📄 |
| ۱۷ | ~~نویز `console.log` در مسیر تولید~~ | رد شد | `vite.config.ts:179-182` | `esbuild.pure` در production همهٔ `console.log/debug/info` را حذف می‌کند؛ فقط `console.warn/error` می‌ماند که درست است. |

<details>
<summary><b>نکتهٔ روش‌شناسی مهم دربارهٔ تست‌ها</b></summary>

۶۰ هشدار `react-hooks/exhaustive-deps` فقط «سبک» نیستند: در `TodayDashboardView.tsx` هفت مورد و در `TasksView.tsx` سه مورد مربوط به `todayPlanning`/`clockRevision` است — یعنی احتمال state کهنه در پرکاربردترین صفحهٔ اپ. این‌ها را باید همراه با تست رفتاری ببندید، نه با `// eslint-disable`.

</details>

---

# ۴. باگ‌های طراحی و تجربهٔ کاربری

> فهرست کامل ۳۶ موردی با شرح، تجربهٔ کاربر و اصلاح کمینه در [`design-ux.md`](design-ux.md) است. اینجا مهم‌ترین‌ها:

| # | مشکل | شدت | محل | چرا آزاردهنده است |
|---|---|---|---|---|
| ۱ | سرصفحهٔ موبایل اشباع (۴ دکمهٔ ۴۰px + تا ۴ کنش صفحه) | P1 ✅ | `layouts/AppLayout.tsx:127-159` + `pages/TodayDashboardView.tsx:586-621` | در ۳۶۰px تیتر صفحه بریده می‌شود و دکمه‌ها به هم می‌چسبند. |
| ۲ | فرمان «ایجاد تسک جدید» بی‌اثر | P1 ✅ | `CommandPalette.tsx:255-267` | کاربر به اینباکس پرت می‌شود و هیچ فیلدی باز نمی‌شود (رویداد بدون شنونده). |
| ۳ | EN نیمه‌کاره (سه سطح پرکاربرد) | P1 ✅ | `TaskFilterSheet.tsx:247-654`، `AIPanel.tsx:143-223`، `KeyboardShortcutsDialog.tsx:6-53` | همه‌چیز فارسی و RTL می‌ماند؛ حس «نیمه‌ترجمه». |
| ۴ | دو کنترل مستقل برای «نمای فولدر» + گزینهٔ تکراری | P1 ✅ | `pages/tasks/TasksHeader.tsx:114-119` + `components/ListViewSwitch.tsx:9-24` | «تایم‌باکت» دو بار در یک منو؛ «برد ستونی» در سوییچ هدر نیست و کلیک روی «کانبان» در آن حالت بی‌اثر است. |
| ۵ | شیت اقدامات تسک: تا ۱۶ ردیف و ۳ ردیف با یک مقصد | P1 📄 | `components/TaskActionSheet.tsx:437-474` | «ویرایش»، «ضمیمه» و «تگ» هر سه فقط `onEdit()` را صدا می‌زنند ⇒ حس دکمه‌های تزئینی. |
| ۶ | هدف‌های لمسی ۱۶–۲۰px در ردیف تسک | P1 📄 | `components/TaskListItem.tsx:248,255,323,425` | تیک‌زدن تسک روی موبایل «نشانه‌گیری دقیق» می‌خواهد. |
| ۷ | نوار متادیتای جزئیات تسک: اسکرول افقی نامرئی، کاشی ۲۸px | P1 📄 | `task-detail/TaskMetaBar.tsx:247`, `MetaTile.tsx:28` | «برچسب/سنجاق» بیرون قاب می‌ماند و نشانه‌ای هم نیست. |
| ۸ | نمایش «امروز تسکی نداری ✨» پیش از رسیدن داده | P1 ✅ | `pages/TodayDashboardView.tsx:570,756-763` | در هر بازکردن سرد، لحظه‌ای حس پاک‌شدن تسک‌ها. |
| ۹ | فالبک مسیرهای lazy یک `div` خالی است | P1 ✅ | `App.tsx:118-120` | پرش سفید بین صفحه‌ها؛ `<EmptyState>` فقط در ۲ صفحه از ۶۶ و `<Skeleton>` فقط در ۱ صفحه. |
| ۱۰ | سایه‌ها در توکن‌ها `none` شده‌اند ولی ۲۲۶ بار استفاده می‌شوند | P1 ✅ | `tailwind.config.ts:49-60` | کارت‌ها/دیالوگ‌ها بی‌عمق و مسطح ⇒ شلوغ‌تر به‌نظر می‌رسند. |
| ۱۱ | «مقیاس UI» روی ۵۹۷ متن با اندازهٔ ثابت px اثر ندارد | P1 📄 | `lib/uiScale.ts:25-43` | تیترها بزرگ می‌شوند، چیپ‌های `text-[9px]/[10px]/[11px]` نه. |
| ۱۲ | `dir="rtl"` ثابت در ۲۰ فایل و ۱۰۹ کلاس جهت‌محور فیزیکی | P2 ✅ | نمونه: `settings/MobileBottomBarSettings.tsx:182` | در انگلیسی، برچسب‌ها به سمت اشتباه می‌چسبند. |
| ۱۳ | واژگان ناهمگون: نوت/یادداشت، فولدر/پوشه، صندوق/صندوق ورودی | P2 📄 | `lib/mobileBottomBarSettings.ts:48,83` در برابر `SidebarNavSections.tsx:133,173` | کاربر فکر می‌کند دو جای مختلف اپ است. |
| ۱۴ | صفحهٔ «اشتراک‌شده‌ها» هیچ نقطهٔ ورودی ندارد | P2 📄 | `App.tsx:375` + بدون لینک در سایدبار/پالت | تسک‌های اشتراکی فقط با تایپ دستی URL دیده می‌شوند. |
| ۱۵ | mega-file ها | P2 ✅ | `components/TaskDetail.tsx` (۱۹۴۳ خط)، `components/review/KnowledgeMindMapView.tsx` (۲۴۵۴)، `pages/TasksView.tsx` (۱۴۳۳)، `pages/NotesView.tsx` (۱۲۲۷)، `pages/SettingsView.tsx` (۹۶۱) | نگهداری سخت + رفتار نامفهوم برای کاربر. |
| ۱۶ | `z-index` افراطی `2147483646/7` | P2 📄 | `components/SelectionActionToolbar.tsx:201,218` | احتمال پوشاندن شیت/توست/پنل AI. |
| ۱۷ | `viewport` جلوی بزرگ‌نمایی را می‌گیرد | P2 ✅ | `index.html:22` (`maximum-scale=1.0, user-scalable=no`) | نقض دسترس‌پذیری (WCAG 1.4.4) برای کاربران کم‌بینا. |
| ۱۸ | ایموجی به‌جای آیکن در منوهای تنظیم | P3 📄 | `pages/tasks/TasksHeader.tsx:106-118`، `TaskFilterSheet.tsx:344-409` | ظاهر بین اندروید/ویندوز/وب متفاوت است. |

---

# ۵. سرور، امنیت و استقرار

| # | مورد | شدت | محل | توضیح |
|---|---|---|---|---|
| ۱ | ماژول پولی با نوشتن مستقیم باز می‌شود | 🔴 | `firestore.rules:67-78` + `api/arsh/modules.ts` | بخش ۲-۱ ✅ |
| ۲ | احراز هویت شل در `/api/tasks` | 🟠 | `api/_lib/auth.ts:64-145` | بخش ۲-۲ ✅ |
| ۳ | حذف حساب در تولید fail-closed است | 🟠 | `api/user/delete-account.ts:39-46` | بخش ۲-۵ 📄 |
| ۴ | مسیرهای `/api/arsh/*` روی Vercel وجود ندارند | 🟠 | `vercel.json:7-17` + `api/arsh/` (فقط health و modules) | هواشناسی، geocode، تعطیلات AU، Google Drive/Photos، پیوست‌ها ✅ |
| ۵ | قواعد Firestore/Storage هرگز deploy نمی‌شوند | 🟠 | نبود `firebase.json` و CI | قواعد واقعی پروژه از مخزن قابل بازتولید نیست؛ تنها ارجاع، کانفیگ امولاتور است. 📄 |
| ۶ | باقی‌ماندن `uid` در `module_codes/*/redeemers/*` پس از حذف حساب | 🟠 | `api/arsh/modules.ts:109` در برابر `api/_lib/accountDeletion.ts:13-21` | دادهٔ یتیم پس از حذف حساب. 📄 |
| ۷ | ماژول‌ها روی اندروید/کراس‌اوریجین با ۴۰۱ روی preflight | 🟠 | `api/arsh/modules.ts:45-51` بدون `handleCors` | درخواست از مبدأ Capacitor شکست می‌خورد. 📄 |
| ۸ | نبود timeout در fetchهای auth/firestore و خواندن نامحدود مجموعه | 🟡 | `api/_lib/auth.ts:19,72,97,126`، `api/_lib/firestore.ts:151-169,422` | در قطعی شبکه، تابع سرور تا تایم‌اوت Vercel معلق می‌ماند. 📄 |
| ۹ | نبود idempotency در ساخت تسک/پرداخت رمز | 🟡 | `api/tasks/index.ts:81`, `api/arsh/modules.ts:85-113` | درخواست تکراری، رکورد تکراری می‌سازد (برای ماژول، تراکنش تا حدی محافظت می‌کند). 📄 |
| ۱۰ | APK دیباگ ۳۴MB در مخزن | 🟡 | `ARSHNAZ-debug.apk` | `.gitignore` پسوند `*.apk` را پوشش نمی‌دهد؛ حجم کلون و تاریخچه را بالا می‌برد. ✅ |
| ۱۱ | نبود هدرهای امنیتی در `vercel.json` | 🔵 | `vercel.json` | بدون CSP/HSTS/X-Frame-Options. 📄 |

**موارد رد‌شده (مهم):** هیچ راز واقعی (کلید خصوصی، service account، `.env`) در مخزن یا تاریخچهٔ آن نیست؛ کلید `AIza…` در `frontend/firebase-applet-config.json` کلید عمومی وب Firebase است و افشای آن به‌خودی‌خود آسیب نیست — **اما** همین باعث می‌شود محدودسازی کلید در Google Cloud و اجرای واقعی قواعد Firestore حیاتی باشد. همچنین هیچ استنتاج LLM سمت سرور وجود ندارد؛ همهٔ فراخوانی‌های AI از مرورگر است (پس ریسک prompt-injection/تایم‌اوت استنتاج سمت سرور مصداق ندارد).

---

# ۶. کد، دارایی و وابستگی‌های بی‌استفاده

با یک اسکنر import که خودم نوشتم (۸۰۸ فایل `src`، تحلیل دقیق مسیرهای `@/` و نسبی):

**۴۷ فایل غیرتستی هیچ‌جا import نمی‌شوند** — مهم‌ترین‌ها:

| حجم | فایل | توضیح |
|---|---|---|
| ۸۴۷KB | `src/assets/arshnaz-logo.png` | ✅ **لوگو در هیچ‌کجا استفاده نشده**؛ سایدبار به‌جایش حرف «ا»/«A» را با CSS نشان می‌دهد (`AppSidebar.tsx:331-336`). دو موکاپ `mockup-*.jpg` (۲۰۰KB) هم بی‌استفاده‌اند. |
| ۳۷.۶KB | `components/horizon/HorizonFilterBar.tsx` | کل خانوادهٔ `horizon` (به‌همراه `HorizonSmartAdd`, `HorizonTimeline`, `HorizonTaskRow`) مرده است — اما تست `HorizonInboxTray.test.tsx` دارد. |
| ۳۱.۴KB | `pages/IslandView.tsx` | ✅ صفحهٔ کامل «جزیره» بدون هیچ مسیر در `App.tsx` (در حالی که `IslandAlbum` از تنظیمات استفاده می‌شود ⇒ قابلیت نیمه‌سیم‌کشی). |
| ۲۱KB | `components/ProcrastinationBusterModal.tsx` | هرگز رندر نمی‌شود. |
| ~۲۵KB | ۱۷ کامپوننت `components/ui/*` | `chart`, `menubar`, `context-menu`, `carousel`, `navigation-menu`, `form`, `table`, `pagination`, `breadcrumb`, `calendar`, `input-otp`, `resizable`, `toggle-group`, `alert`, `hover-card`, `aspect-ratio`, `use-toast` |
| ~۲۵KB | سایر | `weather/WeatherChip.tsx`, `weather/WeatherWeekStrip.tsx`, `garden/MiniGardenCard.tsx`, `island/IslandMiniCard.tsx`, `island/IslandUnlockCelebration.tsx`, `HourlyStoryCard.tsx`, `CognitiveLoadCard.tsx`, `AIOpBadge.tsx`, `Countdown.tsx`, `auth/GoogleDirectDialog.tsx`, `lib/hourlyQuotes.ts`, `lib/sm2.ts`, `App.css` |
| — | ناوبری مرده | `bottom-bar/WindowsFluentBar.tsx` و `FoldableAdaptiveBar.tsx` در `BottomTabBar.tsx:11-12` import می‌شوند ولی **هرگز رندر نمی‌شوند**؛ `DesktopFloatingDock.tsx` حتی import هم نمی‌شود. |

**وابستگی‌های بی‌استفاده در `frontend/package.json`:** `@hookform/resolvers` و `@floating-ui/dom` (صفر ارجاع)، و `react-hook-form`، `embla-carousel-react`، `input-otp`، `react-day-picker` که فقط توسط فایل‌های مردهٔ `components/ui/*` استفاده می‌شوند. (`zod` فقط در یک فایل تست ارجاع دارد و `workbox-*` توسط `vite-plugin-pwa` در سطح build مصرف می‌شوند — پس این دو را «بی‌استفاده» نمی‌شمارم.)

**در CSS:** `App.css` هرگز import نشده؛ کلاس‌های `.paper-row`/`.paper-chip` در `index.css:1748-1752` (همان راه‌حل هدف لمسی ۴۰px) صفر استفاده دارند؛ ۷۸ `!important` در `knowledge/LessonCardLayout.css` و ۵۱ در `index.css`.

---

# ۷. تصحیح ادعاها (چیزهایی که بررسی دقیق‌تر رد کرد)

برای اینکه گزارش قابل اتکا باشد، این موارد را خودم آزمایش کردم و **ادعای اولیه درست نبود**:

1. **«regex ریست چک‌باکس `data-checked` را خراب می‌کند»** — رد شد. در HTML واقعی اپ، `data-checked` روی `<li>` است نه `<input>` (`lib/markdown.ts:64`)، و اجرای واقعی زنجیرهٔ regex نشان داد `data-checked="false"` سالم می‌ماند. فقط اگر روزی `data-checked` روی خود `<input>` بیفتد (یا کسی HTML دستی وارد کند) تبدیل به `data-` می‌شود ⇒ این مورد **P3 (شکنندگی)** است، نه P1. (پیشنهاد اصلاح همچنان معتبر است: استفاده از DOMParser.)
2. **«typecheck و در نتیجه build شکسته است»** — فقط وقتی درست است که `frontend` جدا نصب شود. پس از `npm ci` در ریشهٔ مخزن، `tsc` پاس می‌شود. ریشهٔ واقعی مشکل: یک فایل تست در فرانت (`src/lib/taskSchedulePhaseZero.test.ts:3`) کد سرور (`api/_lib/assistantAccess.ts`) را import می‌کند و `firebase-admin` را وارد برنامهٔ tsc می‌کند ⇒ شکنندگی محیطی، نه build شکسته.
3. **«رازی در مخزن نیست»** — تأیید شد (کلید Firebase عمومی است)؛ پسfinding امنیتی باید روی قواعد و محدودسازی کلید متمرکز شود، نه روی «افشای راز».
4. **«عنوان صفحه mojibake است»** — رد شد؛ `index.html:29` درست است (`ARSHNAZ — Tasks, Notes & Focus`). آن خطای کنسول PowerShell بود.
5. **«۱۷ تست قرمز»** — عدد واقعی اجرای کامل: **۲۱ تست در ۱۲ فایل**.
6. **«`console.log` در مسیر تولید باقی می‌ماند»** — رد شد؛ `vite.config.ts:179-182` با `esbuild.pure` همهٔ `console.log/debug/info` را در build تولیدی حذف می‌کند.
7. **«build شکسته/ناموفق»** — رد شد؛ `npx vite build` با کد خروج ۰ و در ۴ دقیقه و ۱۳ ثانیه تمام شد. مشکل واقعی build، **شکنندگی محیطی** (بند ۲) و **حجم و precache** (بخش ۱-۳) است.
6. **شدت «بکدور احراز هویت»** — از P0 به P1 تعدیل شد: مسیر `signInWithIdp` هویت درست Firebase را برمی‌گرداند، پس تصاحب حساب دلخواه اثبات‌پذیر نیست؛ مشکل واقعی «پذیرش توکن گوگل با هر scope/audience به‌عنوان احراز هویت کامل» و ناهم‌سانی با بقیهٔ API است.

---

# ۸. نقشهٔ راه پیشنهادی (به ترتیب اجرا)

**بستهٔ ۱ — بحرانی (چند ساعت، بدون ریسک ظاهری)**
1. `module_access` را در فهرست مستثناهای `firestore.rules:69-77` بگذارید (یا `allow write: if false` برای آن) و منبع حقیقت را فقط سرور کنید.
2. `verifyToken` را در `api/tasks/*`, `api/tasks/today.ts`, `api/user/me.ts` به `verifyFirebaseIdToken` محدود کنید؛ اگر پشتیبانی از توکن گوگل لازم است، حداقل `aud`/scope/`email_verified` را بررسی کنید و هر دو مسیر را به یک شناسه (Firebase UID) نگاشت کنید.
3. `vercel.json` را از yarn به npm/`npm ci` تغییر دهید و `yarn.lock` بسازید (یا برعکس)؛ `*.apk` را به `.gitignore` اضافه و APK را از مخزن حذف کنید.
4. الگوی تست را در `frontend/vitest.config.ts:13` به `"../api/**/*.{test,spec}.{ts,tsx}"` اصلاح کنید تا تست‌های API واقعاً اجرا شوند.
5. یک workflow سادهٔ CI (typecheck + test + build) اضافه کنید.

**بستهٔ ۲ — یکپارچگی داده (۱ تا ۲ روز)**
6. `flush` در `cloudStateSync.ts` را به تراکنش با مقایسهٔ نسخه تبدیل کنید (کد نمونه در `code-bugs.md` مورد ۱) و برای همهٔ binderها (garden/island/kanban/uiPrefs) سیاست reconcile بگذارید.
7. در `firestoreDataService.ts:230,249` وقتی `expected` نامعلوم است، به‌جای پرتاب خطا «نسخهٔ سرور را مبنا بگیر و یک بار بنویس» یا صراحتاً از کاربر بپرس.
8. `firestoreLive.ts` را `stop()`‌پذیر کنید و در خروج از حساب پاک کنید.
9. سیاست ساعت کلاینت را کنار بگذارید و به revision سرور مهاجرت کنید (توصیهٔ سند ممیزی قبلی، بخش ۲).

**بستهٔ ۳ — طراحی (بدون بازطراحی، ۱ روز)**
10. عناصر بی‌مصرفِ همین حالا قابل حذف: `CommandPalette.tsx:260` ← رویداد درست، ردیف تکراری `TasksHeader.tsx:117-119`، `Alt+5`، آرایهٔ `tabs` مرده، importهای `WindowsFluentBar`/`FoldableAdaptiveBar`.
11. `isAdmin` را در `useUserRole.tsx:15` با `getIdTokenResult` روی شیء Firebase (نه `AppUser`) بخوانید تا پنل مدیریت واقعاً باز شود.
12. `tasksReady` را به گیت حالت خالی `TodayDashboardView.tsx:570` اضافه کنید و `RouteFallback` را یک اسپینر/اسکلت کنید.
13. سه سطح EN را با `useBilingual()` و `dir={isEn ? "ltr" : "rtl"}` درست کنید و دو کلید `EN_LABELS` را اضافه کنید.
14. `boxShadow`های `2xs..md` را در `tailwind.config.ts:52-56` مقداردهی کنید (بدون تغییر هیچ کلاسی، کل اپ عمق می‌گیرد).
15. ناوبری را از یک منبع واحد تغذیه کنید (`NAV_ITEMS` در `SidebarNavSections.tsx:204` ساخته شده و بی‌استفاده است) و ورودی‌های موجود در پالت/ریل را از همان بسازید.

**بستهٔ ۴ — پاک‌سازی و کارایی (۱ روز)**
16. ۴۷ فایل مرده (بخش ۶) و وابستگی‌های بی‌استفاده حذف شوند؛ حداقل `IslandView`, خانوادهٔ `horizon`, ۱۷ فایل `ui`, و دو موکاپ.
17. برای لوگو تصمیم بگیرید: یا `arshnaz-logo.png` را در سایدبار/اسپلش استفاده کنید (و حجمش را بهینه کنید)، یا فایل و دارایی‌های مشابه را بردارید.
18. subcollectionهای `module_access`/`redeemers` را به `accountDeletion` اضافه کنید.
19. precache را از ۲۰.۵MB به زیر ۳MB برسانید: در `vite.config.ts:152` تصاویر `garden-*`/` angel-*` را از `globPatterns` بیرون بگذارید (یا نسخهٔ WebP/کوچک بسازید) و `maximumFileSizeToCacheInBytes` را به ~۱MB کاهش دهید.

---

# ۹. آنچه بررسی نشد (شفافیت)

- رفتار واقعی ویجت اندروید، اعلان بومی و اسپلش روی دستگاه (نیاز به اجرای اپ روی موبایل).
- وضعیت واقعی پروژهٔ Firebase در کنسول: اینکه قواعد فعلاً کدام‌اند، کلید وب محدود شده یا نه، و متغیرهای محیطی Vercel (`VITE_ARSH_API_URL`, `VITE_ACCOUNT_API_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ARSH_SIGNING_SECRET`) تنظیم‌اند یا نه.
- اینکه آیا در دادهٔ واقعی کاربران سندی بدون `updated_at` وجود دارد (پیش‌شرط بخش ۳-۲).
- محتوای `backend/` (FastAPI) فقط از نظر نقش آن در استقرار بررسی شد؛ ممیزی عمیق کد پایتون انجام نشد (چون در Vercel اجرا نمی‌شود و در حال حاضر مسیر بحرانی نیست).
- هیچ اسکرین‌شاتی از اپ در حال اجرا گرفته نشد؛ همهٔ داوری‌های ظاهری بر پایهٔ کد و کلاس‌های واقعی است.

---

## پیوست — فایل‌های خروجی این ممیزی

| فایل | محتوا |
|---|---|
| `arshnaz-audit/ARSHNAZ-AUDIT-FA.md` | همین سند (خلاصهٔ مدیریتی و نقشهٔ راه) |
| `arshnaz-audit/code-bugs.md` | ۳۲ باگ کد/رفتار با شاهد و اصلاح پیشنهادی |
| `arshnaz-audit/design-ux.md` | ۳۶ یافتهٔ طراحی/UX با اصلاح کمینه |
| `arshnaz-audit/api-security.md` | ۳۳ یافتهٔ سرور/امنیت/استقرار |
| `arshnaz-audit/tests.txt`, `typecheck.txt`, `lint.txt`, `build.txt` | خروجی خام ابزارها |
| `arshnaz-audit/find-unused.mjs`, `verify-regex.mjs`, `dep-usage.ps1` | اسکریپت‌های تأیید (قابل اجرای مجدد) |
