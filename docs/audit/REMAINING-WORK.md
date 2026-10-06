# ARSHNAZ — کارهای باقی‌مانده (سند تحویل به عامل بعدی)

> این سند خودبسنده است: هر مورد شناسهٔ پایدار، فایل و خط دقیق، تغییر کمینه، معیار پذیرش، ریسک و اثر ظاهری دارد.
> همهٔ ادعاها از سه فایل وضعیت (`status-code.md`، `status-design.md`، `status-api.md`)، گزارش اصلی (`ARSHNAZ-AUDIT-FA.md`) و بازبینی مستقیم درخت کاری در لحظهٔ نوشتن این سند آمده‌اند.

---

## ۰. این فایل برای چیست

- **مخزن:** `C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam` (شاخهٔ `main`، HEAD هنگام ممیزی `b1e9d0b` = `origin/main`).
- **وضعیت:** کارهای دور ۱ و ۲ (و بخشی از دور ۳) **commit و push** شده‌اند: `308e906` (امنیت، یکپارچگی داده، دوزبانه‌سازی، پاک‌سازی، کارایی) و `869d556` (تایم‌اوت‌های واقعی تست + `firebase.json`). کل گزارش‌های ممیزی هم داخل مخزن زیر `docs/audit/` هستند؛ ارجاع‌های متنی به `arshnaz-audit/...` در این سند به همان پوشه اشاره دارند.
- **تأیید وضعیت (اولین کار تو):** `git -C <repo> log --oneline -3` و `git -C <repo> status --porcelain -uall` را اجرا کن. اگر `869d556` در تاریخ دیده می‌شود، پایهٔ درست را داری؛ اگر درخت کثیف است، کارهای نیمه‌تمام بخش ۷ را اول تعیین تکلیف کن و روی همان پایه ادامه بده.
- **آخرین اجرای کامل تست پس از واقعی‌کردن تایم‌اوت‌ها:** `Test Files 1 failed | 225 passed (226)` · `Tests 3 failed | 1436 passed (1439)` — و همان سه شکست با بالا بردن تایم‌اوت درون‌تستی `KnowledgeMindMapView.test.tsx` هم برطرف شد (`18/18 passed`). یعنی امروز **هیچ شکست شناخته‌شده‌ای در مجموعه‌تست نیست** و هر شکست جدید رگرسیون است.
- **مأموریت تو:** بستن تمام موارد بخش ۴ (۷۷ قلم: ۲۰ CODE + ۲۹ DESIGN + ۲۸ API) به‌جز موارد بخش ۵ (تصمیم مالک)، سپس گذر از «دروازهٔ پایانی» بخش ۸ و به‌روزرسانی `arshnaz-audit/ARSHNAZ-AUDIT-FA.md`.
- **قاعدهٔ طلایی:** هیچ موردی را «باز» فرض نکن. اول وضعیت فعلی همان خط کد را بخوان (`read` روی فایل، نه اتکا به این سند)؛ ممکن است در دور سوم رفع شده باشد. اگر رفع شده، تیک بزن و دلیل/شاهد را در گزارش پایانی بنویس.
- **اجرای کامل تست:** پیش از شروع، مطمئن شو اجرای موازی دیگری وجود ندارد (بخش ۱، قاعدهٔ ۷). عدد مرجع امروز: ۲۲۶ فایل / ۱۴۳۹ تست با **صفر شکست شناخته‌شده**.

---

## ۱. قواعد غیرقابل‌مذاکره

**۱) بدون بازطراحی** — نقل عین `plan/plan.md:58-60`:

> - بدون بازطراحی: همان رنگ‌ها، فونت‌ها، تم روشن/تاریک، آیکون‌ها، کارت‌ها و چیدمان.
> - فقط کنترل‌های خواسته‌شده حذف می‌شوند، انتخابگرهای تکراری یکی می‌شوند و چیدمان‌های شکسته با همان اجزای موجود درست می‌شوند.
> - بررسی در فارسی و انگلیسی، تم روشن و تاریک، موبایل ۳۶۰ و ۳۹۰ و دسکتاپ.

**۲) فارسی‌محور بماند و حالت EN نشکند** — پیش‌فرض اپ فارسی/RTL است. در دور ۲ سه سطح پرکاربرد دوزبانه شدند (`TaskFilterSheet`، `AIPanel`، `KeyboardShortcutsDialog`)؛ در هر تغییری که متن یا `dir` دارد، هر دو حالت fa/en بررسی شود (`dir={isEn ? "ltr" : "rtl"}`).

**۳) هیچ وابستگی npm جدیدی اضافه نکن** — به‌جز یک استثنای صریح: `firebase-tools` فقط اگر مسیر «تمام‌کردن» بخش ۷ انتخاب شود و **حتماً** به‌عنوان `devDependency` در `frontend/package.json`. هر وابستگی دیگر (از جمله `date-fns-jalali` برای CODE-28) باید از قبل در `frontend/package.json` موجود باشد؛ وگرنه راه‌حل را با کد موجود بازنویسی کن.

**۴) هیچ assertion تستی را حذف/تضعیف نکن** — اگر تستی رفتار باگ‌دار را تثبیت کرده است (نمونهٔ شناخته‌شده: `frontend/src/lib/timeBuckets.test.ts:108` برای CODE-17)، آن تست را با تستی از **رفتار درست** جایگزین کن و در گزارش بنویس چرا. سابقه: در دور ۲، تست fail-open در `lib/firestoreSync.test.ts` با سه تست جدید جایگزین شد و Lead تأیید کرد.

**۵) هر فایل، یک نویسنده** — دو عامل هم‌زمان نباید یک فایل را ویرایش کنند (فهرست انحصاری فایل‌ها در بخش ۶). برای فایل‌های مشترک (`index.css`، `frontend/package.json`، `frontend/package-lock.json`) فقط نویسندهٔ تعیین‌شده حق تغییر دارد؛ بقیه درخواست را به او بدهند.

**۶) هیچ تستی را با تغییر پیکربندی «سبز» نکن** — `testTimeout: 30_000` تنها استثنای مجاز و از قبل اعمال‌شده است (`frontend/vitest.config.ts:16-17`). `maxWorkers`/`minWorkers` روی ۲ بمانند (`:10-11`).

**۷) هرگز `npx vite build` و `npm test` کامل را در بیش از یک پروسه هم‌زمان اجرا نکن** — بیلد ~۹ دقیقه و تست کامل ~۳۰ دقیقه طول می‌کشد، `maxWorkers: 2` است و اجرای موازی، شکست‌های flaky می‌سازد. اگر اجرای کامل لازم است، صبر کن تا هیچ پروسهٔ `node`/`vitest` دیگری فعال نباشد.

**۸) درخت کاری را آلوده نکن** — `frontend/dist/` را بازتولید می‌کند بیلد؛ آن را commit نکن (در `.gitignore:31` پوشش دارد). `ARSHNAZ-debug.apk` روی دیسک بماند ولی هرگز دوباره track نشود (`.gitignore:85`).

---

## ۲. راه‌اندازی و دستورهای تأیید

مسیر پایه در همهٔ دستورها: `C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam`

```powershell
# ۱) نصب ریشهٔ مخزن (فایربیس‌ادمین برای توابع api/ لازم است)
cd C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam
npm ci

# ۲) نصب فرانت (لهجهٔ peer-deps در frontend/.npmrc تنظیم شده: legacy-peer-deps=true)
cd frontend
npm ci

# ۳) بررسی نوع — انتظار: خروج ۰ بدون هیچ خطا
npm run typecheck

# ۴) لینت — خط پایه: ۰ خطا / ۱۲۴ هشدار (هیچ هشدار جدید مجاز نیست)
npm run lint

# ۵) تست‌های API — ۸ فایل / ۸۵ تست؛ انتظار: 85 passed (85)
npm run test:api

# ۶) یک فایل تست مشخص (سریع‌ترین حلقهٔ بازخورد)
npx vitest run src/lib/reminders.test.ts

# ۷) تست کامل فرانت (~۳۰ دقیقه، تک‌پروسه)
npm test

# ۸) بیلد تولید (~۹ دقیقه)
npx vite build
```

**اعداد خط پایهٔ ثبت‌شده (برای مقایسه):**

| سنجه | خط پایه | شاهد |
|---|---|---|
| typecheck | exit 0 (پس از `npm ci` ریشه) | `status-code.md:109` |
| lint | ۰ خطا / ۱۲۴ هشدار | `ARSHNAZ-AUDIT-FA.md:57` (T6) |
| test:api | ۸ فایل، **۸۵/۸۵** سبز، ~۳۵s | `arshnaz-audit/api-tests-final.txt` |
| build | exit 0، ~۹m۱۶s، **precache 206 entries (7661.09 KiB)** | `arshnaz-audit/build-final.txt` |
| تست کامل (آخرین اجرای کامل با `testTimeout: 30_000`) | **1 failed / 225 passed فایل** و **3 failed / 1436 passed (1439) تست**؛ همان ۳ شکست هم با بالا بردن تایم‌اوت درون‌تستی `KnowledgeMindMapView.test.tsx` برطرف شد ⇒ **صفر شکست شناخته‌شده** | `arshnaz-audit/tests-round3-pre-push.txt` |
| سه فایل سنگین Knowledge | `AiQuestionGeneratorModal`، `KnowledgeMindMapView`، `InteractiveLearningModal` — در انزوا هم قرمز (تایم‌اوت)، `KnowledgeMindMapView` برای ۱۸ تست **۱۵۴s** | `ARSHNAZ-AUDIT-FA.md:74`، `tests-recheck-b.txt` (3 failed/55) |
| `testTimeout`/`hookTimeout` | اکنون **۳۰٬۰۰۰ms** (این سه فایل را سبز می‌کند) | `frontend/vitest.config.ts:16-17` (در `status-code.md:34` با شمارهٔ قدیمی `:14-15` آمده) |

> ✅ اجرای کامل با `testTimeout: 30_000` انجام و ثبت شد (۱ فایل قرمز از ۲۲۶)؛ پس از بالا بردن تایم‌اوت درون‌تستی در `KnowledgeMindMapView.test.tsx`، آن فایل هم **۱۸/۱۸ سبز** شد. پس خط پایهٔ جدید = **صفر شکست شناخته‌شده**؛ هر شکست جدید رگرسیون است و باید یا رفع شود یا (اگر flaky اثبات شد) مستند گردد.

---

## ۳. قبلاً انجام شده — دوباره انجام نده

| # | کار انجام‌شده | فایل/شاهد اثبات‌کننده |
|---|---|---|
| ۱ | `module_access` از قاعدهٔ چتری مالک مستثنا شد (ماژول پولی با نوشتن کلاینت باز نمی‌شود) | `firestore.rules:71-83` (فهرست مستثناها شامل `'module_access'`) |
| ۲ | APK دیباگ از ایندکس خارج شد و پسوندهای باینری ignore شدند | `.gitignore:84-87` + `git status` → `D ARSHNAZ-debug.apk` |
| ۳ | `vercel.json` از yarn به `npm ci` (ریشه + فرانت) | `vercel.json:4-5` |
| ۴ | تست‌های `api/**` واقعاً اجرا می‌شوند (کانفیگ مستقل + اسکریپت + حذف glob غلط) | `frontend/vitest.api.config.ts`، `frontend/package.json:14`، `frontend/vitest.config.ts:19-22` |
| ۵ | `cloudStateSync.flush` داخل `runTransaction` با مقایسهٔ نسخه + reconcile | `lib/cloudStateSync.ts:48-53,75,93-97` + `lib/cloudStateSync.test.ts` (+۷۴ خط) |
| ۶ | `firestoreDataService` فقط برای تعارض واقعی خطا می‌دهد | `lib/firestoreDataService.ts:236,258` |
| ۷ | `firestoreSync` از fail-open به «بازپایه از سرور / امتناع» | `lib/firestoreSync.ts:243-247,268-270` + سه تست جدید در `lib/firestoreSync.test.ts` |
| ۸ | لیسنرهای Firestore بسته می‌شوند و در خروج پاک می‌شوند | `lib/firestoreLive.ts:48,104-110` + `hooks/useAuth.tsx:66` |
| ۹ | خطای جانبی ویجت، fetch موفق را باطل نمی‌کند | `features/tasks/taskService.ts:117,127` (۱۴ تست `taskService` سبز) |
| ۱۰ | دوزبانه‌سازی سه سطح پرکاربرد EN | `components/TaskFilterSheet.tsx:250`، `components/AIPanel.tsx:157-160,209-222`، `components/KeyboardShortcutsDialog.tsx:35,48` |
| ۱۱ | دو برچسب سایدبار در EN | `components/sidebar/SidebarNavSections.tsx:77-78` |
| ۱۲ | پاک‌سازی کد مرده: ۳۹–۴۰ فایل (خانوادهٔ horizon، `IslandView`، ۱۷ فایل `ui/*`، `App.css`، لوگو و موکاپ‌ها) | `ARSHNAZ-AUDIT-FA.md:54`؛ `status-code.md:35-38` (بند ۲۱ کامل FIXED) |
| ۱۳ | حذف ۶ وابستگی بی‌استفاده + همگام‌سازی lock | `frontend/package.json` (خانوادهٔ `@hookform`, `react-hook-form`, `embla`, `input-otp`, `react-day-picker`) |
| ۱۴ | precache از ۲۱۰۰۳.۹۰KiB به ۷۶۶۱.۰۹KiB (**−۶۳.۵٪**)؛ تصاویر باغ/فرشته به Runtime Cache | `ARSHNAZ-AUDIT-FA.md:55` + `arshnaz-audit/build-final.txt` |
| ۱۵ | ماده‌لمسی نامرئی (`TAP_HALO`) روی ۵ کنترل ردیف تسک | `components/TaskListItem.tsx:34,255,263,331,339,433` |
| ۱۶ | کاشی متادیتا ۲۸→۳۶px + فید لبه | `components/task-detail/MetaTile.tsx:28`، `TaskMetaBar.tsx:276`، `index.css:453-455` |
| ۱۷ | سه ردیف تکراری شیت اقدامات ادغام شد | `components/TaskActionSheet.tsx:462` |
| ۱۸ | `isAdmin` از custom claims نشست واقعی Firebase | `hooks/useUserRole.tsx:19-20` (`authStateReady()` + `getIdTokenResult()`) |
| ۱۹ | گیت `tasksReady` برای حالت خالی «امروز» | `pages/TodayDashboardView.tsx:572-573` |
| ۲۰ | `RouteFallback` اسپینر + `role="status"` برای مسیرهای lazy | `App.tsx:118-131,297` |
| ۲۱ | فرمان «ایجاد تسک جدید» در پالت رویداد درست را می‌فرستد | `components/CommandPalette.tsx:260-263` → شنونده در `QuickCaptureDialog.tsx:59` |
| ۲۲ | گزینهٔ تکراری «تایم‌باکت» در منوی نمای فولدر حذف شد | `pages/tasks/TasksHeader.tsx:114-116` |
| ۲۳ | آرایهٔ مردهٔ تب‌ها + `Alt+5` تکراری حذف شد | `components/BottomTabBar.tsx:46-80` |
| ۲۴ | regex ریست چک‌باکس دیگر `data-checked` را نمی‌بلعد | `lib/recurringTaskService.ts:91` + تست `lib/recurringTaskService.test.ts:102-107` |
| ۲۵ | `testTimeout`/`hookTimeout` = ۳۰s (رفع تایم‌اوت‌های flaky سه فایل سنگین) | `frontend/vitest.config.ts:16-17` |

**موارد REFUTED — دنبالشان نرو:** CODE-05 (typecheck شکسته نیست؛ پس از `npm ci` ریشه exit 0)، CODE-30 (`esbuild.pure` در production همهٔ `console.log/debug/info` را حذف می‌کند؛ `vite.config.ts:204`).

---

## ۴. کارهای باقی‌مانده

راهنمای خط‌ها: `[ ]` = باز · `[~]` = جزئی (بخش باقی‌مانده صریح ذکر شده) · همهٔ مسیرها از ریشهٔ مخزن هستند.
«تغییر ظاهر: خیر» یعنی اصلاح کمینه بازطراحی نیست؛ در موارد جزئی، «بله (جزئی)» با توضیح آمده است.

### ۴-۱. کد و رفتار — از `status-code.md` (۲۰ مورد)

- [ ] **CODE-03 · P1 · فایل: `frontend/src/lib/reminders.ts:360-383`** — مشکل: تشخیص تسک تکراری فقط `created_at >= startOfDay` را می‌بیند (`:366`) و نتیجهٔ `insert` بررسی نمی‌شود (`:381`) و `LAST_TASK_KEY` حتی در آفلاین/خطا نوشته می‌شود (`:383`) ⇒ چک‌این روزانه تکراری می‌سازد و در آفلاین گم می‌شود. — اصلاح: شرط را به «تسک بازِ هم‌عنوان» تغییر بده (به‌جای `new Set((existing || []).map(t => t.title))` از `(existing || []).some(t => t.title === item.title && !t.completed)` استفاده کن)، نتیجهٔ درج را بگیر (`const { error } = await firebaseStore.from("tasks").insert(toInsert); if (error && navigator.onLine) return;`) و `LAST_TASK_KEY` را فقط پس از موفقیت بنویس. — پذیرش: `npx vitest run src/lib/reminders.test.ts` سبز + یک تست رگرسیون جدید در همان فایل که دو بار صدا زدن `ensureDailyTasks` را پوشش دهد (بخشی از CODE-19). — ریسک: کم (فقط مسیر `auto_create_daily_tasks`). — تغییر ظاهر: خیر.
- [~] **CODE-08 · P2 · فایل: `frontend/src/components/TaskDetail.tsx:564-571`** — مشکل: باقی‌ماندهٔ `enqueueOp({ table:"tasks", op:"update", payload: patch, match:{ id: current.id } })` بدون `user_id` و بدون `expectedRevision` ⇒ `canReplayForOwner` همیشه false و این ورودی صف هرگز همگام نمی‌شود. (بخشِ رفع‌شده: مسیر اصلی حالا احراز‌هویت‌شده است، `:550-554` و شاخهٔ صف فقط در `!user` اجرا می‌شود.) — اصلاح: یا `writeTaskDraft(...)` را جای `enqueueOp` بگذار، یا `payload: { ...patch, user_id: user?.id }` و `expectedRevision` را همراه بفرست. — پذیرش: grep روی `enqueueOp` در این فایل فقط با `user_id`/`expectedRevision` باشد + `npx vitest run src/components/TaskDetail.test.tsx` (اگر وجود دارد) یا typecheck. — ریسک: کم (شاخهٔ کم‌تکرار). — تغییر ظاهر: خیر.
- [ ] **CODE-10 · P2 · فایل: `frontend/src/lib/leitnerService.ts:428,435,443`** — مشکل: کلید روز از `toISOString().slice(0,10)` ساخته می‌شود (روز UTC) ⇒ streak برای ایران/سیدنی کم‌شماری می‌شود. — اصلاح: استفاده از `toLocalISO(...)` از `frontend/src/lib/timeHorizon.ts:57` در هر سه نقطه. — پذیرش: `npx vitest run src/lib/leitnerService.test.ts` سبز + تست مرزی برای یک بازهٔ زمانی بعد از نیمه‌شب محلی. — ریسک: کم (فقط آمار مطالعه). — تغییر ظاهر: خیر.
- [ ] **CODE-12 · P2 · فایل: `frontend/src/lib/reminders.ts:309,340` و `frontend/src/components/RemindersRunner.tsx:51,58`** — مشکل: `localStorage.setItem` بدون `try/catch` (حالت private/quota خطا می‌دهد) و `tick()` بدون `.catch()`. — اصلاح: `try { localStorage.setItem(...) } catch { /* quota/private mode */ }` در دو خط `reminders.ts` و `.catch(() => {})` روی دو فراخوانی `tick()` در `RemindersRunner.tsx`. — پذیرش: `npx vitest run src/lib/reminders.test.ts` سبز + یک تست با mock پرتاب‌کنندهٔ `setItem`. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-13 · P2 · فایل: `frontend/src/lib/firebaseStore.ts:182-186`** — مشکل: هر خطای کوئری (شامل آفلاین/شبکه) به `getDocs(colRef)` یعنی اسکن کل کالکشن تبدیل می‌شود. — اصلاح: فقط وقتی `queryErr?.code === "failed-precondition"` (نبود ایندکس ترکیبی) fallback کن؛ در غیر این صورت `{ data: null, error: queryErr }` برگردان. — پذیرش: `npx vitest run src/lib/firebaseStore.test.ts` سبز + تست دو حالت (failed-precondition ⇒ fallback، unavailable ⇒ خطا). — ریسک: متوسط (رفتار خطا در کوئری‌های آفلاین؛ تست دستی لازم). — تغییر ظاهر: خیر.
- [ ] **CODE-14 · P2 · فایل: `frontend/src/lib/firebaseStore.ts:151-156`** — مشکل: فیلتر `in` با بیش از ۱۰ مقدار به `hasClientOnlyFilter` می‌افتد ⇒ خواندن کل کالکشن. — اصلاح: مقادیر را به دسته‌های ۱۰تایی بشکن و کوئری‌ها را موازی اجرا کن (`Promise.all(chunk(filter.value, 10).map(v => getDocs(query(...fsWhere(field,"in",v)))))`) و نتایج را ادغام کن؛ `hasClientOnlyFilter` فقط برای `in` خالی بماند. — پذیرش: `npx vitest run src/lib/firebaseStore.test.ts` + تست با ۲۳ مقدار که سه کوئری می‌زند و نتیجهٔ ادغام‌شده را می‌سنجد. — ریسک: متوسط (ترتیب/تکرار نتایج). — تغییر ظاهر: خیر.
- [ ] **CODE-15 · P2 · فایل: `frontend/src/lib/firebaseStore.ts:232-238,281`** — مشکل: `insert` عملاً upsert است (`_merge` هرگز خوانده نمی‌شود و در `:281` همیشه `{ merge: true }`). — اصلاح: برای `insert` مسیر واقعی «ایجاد فقط» بساز (تراکنش با `get` + `set` بدون `merge`، یا `merge:false` و مدیریت خطای وجود سند). — پذیرش: `npx vitest run src/lib/firebaseStore.test.ts` + بازبینی همهٔ فراخوانی‌های `insert` (از جمله `lib/reminders.ts:381` و seedها) با grep و یک تست «درج روی سند موجود خطا می‌دهد/بازنویسی نمی‌کند». — ریسک: متوسط-بالا (همهٔ فراخوانی‌ها باید بررسی شوند). — تغییر ظاهر: خیر.
- [ ] **CODE-16 · P2 · فایل: `frontend/src/lib/recurringTaskService.ts:296-305`** — مشکل: `snapshots.some(s => !s.exists())` شامل زیرتسک‌هاست ⇒ یک زیرتسک حذف‌شده کل تکمیل تسک تکرارشونده را می‌بندد. — اصلاح: فقط برای والد (`snapshots[0]`) ناموجود بودن را خطا بدان و patch زیرتسک‌های ناموجود را حذف کن. — پذیرش: `npx vitest run src/lib/recurringTaskService.test.ts` + تست «والد موجود، یک زیرتسک حذف‌شده ⇒ تکمیل موفق». — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-17 · P2 · فایل: `frontend/src/lib/timeBuckets.ts:240-256`** — مشکل: در حالت strict، بررسی «تاریخ دقیق» بعد از شاخهٔ strict انجام می‌شود ⇒ تسک‌های تاریخ‌دار از نمای باکت پنهان می‌شوند. — اصلاح: بررسی «تاریخ دقیق» (`:262-273`) را پیش از شاخهٔ strict انجام بده (یا در strict تسک تاریخ‌دار را بپذیر). — پذیرش: `npx vitest run src/lib/timeBuckets.test.ts`؛ **توجه:** `src/lib/timeBuckets.test.ts:108` رفتار فعلی را تثبیت کرده و باید با تست رفتار درست جایگزین شود (قاعدهٔ ۴). — ریسک: متوسط (تنها مصرف‌کنندهٔ واقعی `pages/TasksView.tsx:557` است). — تغییر ظاهر: خیر.
- [ ] **CODE-18 · P2 · فایل: `frontend/src/lib/firestoreSync.ts:256-263`** — مشکل: برندهٔ تعارض با ساعت کلاینت تعیین می‌شود (`new Date(remoteUpdatedAt).getTime() > localTime`). — اصلاح: مقایسه با revision سرور یا `_firestoreSyncAt` جایگزین شود، یا هنگام نوشتن ساعت سرور مبنا گرفته شود. — پذیرش: `npx vitest run src/lib/firestoreSync.test.ts` + تست «ساعت کلاینت عقب/جلو ⇒ تصمیم یکسان». — ریسک: متوسط-بالا (سیاست واحد/مهاجرت داده). — تغییر ظاهر: خیر.
- [~] **CODE-19 · P2 · فایل: `frontend/vitest.config.ts:16-17` و `frontend/src/lib/reminders.test.ts`** — مشکل: باقی‌ماندهٔ «شبکهٔ اطمینان»: (الف) ~~یک اجرای کامل با `testTimeout: 30_000` هنوز ثبت نشده~~ **انجام شد: ۱ فایل قرمز که با تایم‌اوت درون‌تستی هم رفع شد ⇒ صفر شکست**؛ (ب) اگر سه فایل سنگین Knowledge زیر بار موازی باز هم قرمز شدند، به پروژهٔ Vitest جدا منتقل شوند؛ (ج) تست رگرسیون برای `cloudStateSync.flush` **هست** ولی برای `ensureDailyTasks` **نیست**. — اصلاح: تست `ensureDailyTasks` را اضافه کن (همان تست CODE-03)؛ در صورت قرمزی دوبارهٔ فایل‌های سنگین، `vitest.workspace`/پروژهٔ جدا بساز. — پذیرش: تست جدید سبز و ثبت خلاصهٔ اجرای کامل. — ریسک: کم (تست). — تغییر ظاهر: خیر.
- [~] **CODE-20 · P3 · فایل: `frontend/src/components/island/IslandScene.tsx`، `frontend/src/components/island/IslandAlbum.tsx`** — مشکل: باقی‌ماندهٔ دو فایل بی‌ارجاع (grep سراسری فقط خط تعریف را برمی‌گرداند). (رفع‌شده: `IslandView.tsx`، `IslandMiniCard.tsx`، `IslandUnlockCelebration.tsx`، `MiniGardenCard.tsx` حذف شده‌اند.) — اصلاح: دو فایل را حذف کن؛ **اما** اگر قابلیت «جزیره» قرار است برگردد، این بند «پذیرفته‌شده» علامت بخورد (تصمیم مالک، بخش ۵ — OWNER-ISLAND؛ توجه: `lib/island.ts` هنوز از `hooks/useAuth.tsx:61` صدا زده می‌شود). — پذیرش: `Test-Path` = False + `npm run typecheck` سبز. — ریسک: کم. — تغییر ظاهر: خیر.
- [~] **CODE-22 · P3 · فایل: `frontend/package.json:94,110` (+ `frontend/package-lock.json`)** — مشکل: باقی‌ماندهٔ وابستگی‌های بی‌ارجاع: `react-resizable-panels` (`:94`)، `zod` (`:110`) و ۶ پکیج `@radix-ui/react-{aspect-ratio,context-menu,hover-card,menubar,navigation-menu,toggle-group}`. (رفع‌شده: ۶ وابستگی دیگر در دور ۲.) — اصلاح: حذف هر ۸ مورد + `npm install` در `frontend/` برای همگام‌سازی lock؛ سپس `npm ci --dry-run` برای تأیید. — پذیرش: `cd frontend && npm ci --dry-run` → exit 0 و `npm run typecheck` سبز. — ریسک: کم (هر دو grep صفر ارجاع دارند؛ `zod` فقط در یک فایل تست ارجاع دارد — قبل از حذف grep دوباره بزن). — تغییر ظاهر: خیر.
- [ ] **CODE-24 · P3 · فایل: `frontend/src/lib/reminders.ts:230,327,393`** — مشکل: فیلد تنظیمات مرده `micro_prompt_enabled` و شاخهٔ مردهٔ `"sleep"` در نوع `kind`. — اصلاح: حذف `micro_prompt_enabled` (تعریف `:230` و مصرف `:393`) و محدودکردن پارامتر به `kind: "checkin"` در `:327`. — پذیرش: `npx vitest run src/lib/reminders.test.ts` + grep صفر برای `micro_prompt_enabled`. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-25 · P3 · فایل: `frontend/src/lib/nlDate.ts:46,121`** — مشکل: `if (delta === 0) delta = forceNext ? 7 : 7;` (شرط سه‌گانهٔ بی‌معنا) و `nextWeekday(base, wd.day, true)` با پارامتر بی‌اثر. — اصلاح: `if (delta === 0) delta = 7;` و حذف پارامتر `forceNext` (یا استفادهٔ واقعی از آن). — پذیرش: `npx vitest run src/lib/nlDate.test.ts` سبز. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-26 · P3 · فایل: `frontend/src/lib/nlDate.ts:132`** — مشکل: `/(عصر|بعدازظهر|بعد از ظهر|شب)/` بدون مرز واژه ⇒ «شبکه» بعدازظهر تشخیص داده می‌شود. — اصلاح: الگوی مرزدار `/(?<![\p{L}\u200c])(عصر|بعدازظهر|بعد از ظهر|شب)(?![\p{L}\u200c])/u`. — پذیرش: `npx vitest run src/lib/nlDate.test.ts` + تست «ساعت ۹ در شبکه اجتماعی» ⇒ صبح. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-27 · P3 · فایل: `frontend/src/components/knowledge/PharmacyImageViewer.tsx:11-15`** — مشکل: درج ویژگی در `<img ... />` اسلش خودبسته را حفظ می‌کند ⇒ `<img src="x" / loading=…>`. — اصلاح: پیش از افزودن ویژگی‌ها `next = next.replace(/\/\s*$/, "")`. — پذیرش: `npx vitest run src/components/knowledge/PharmacyImageViewer.test.tsx` (اگر وجود دارد؛ وگرنه یک تست کوچک روی تابع) و assert نبود `" / "` در خروجی. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-28 · P3 · فایل: `frontend/src/lib/timeBuckets.ts:172`** — مشکل: در شاخهٔ `calendar === "jalali"` فصل با ماه گرگوری حساب می‌شود (`Math.floor(d.getMonth() / 3)`). — اصلاح: `const q = Math.floor(jGetMonth(d) / 3);` با import از `date-fns-jalali` (هم‌سبک `lib/timeHorizon.ts:249`) — این پکیج از قبل dependency است، وابستگی جدید اضافه نکن. — پذیرش: `npx vitest run src/lib/timeBuckets.test.ts` + تست فصل برای یک تاریخ شمسی (مثلاً ۱۵ فروردین ⇒ بهار). — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **CODE-29 · P3 · فایل: `frontend/src/components/FirebaseSyncCard.tsx:46,241` و `frontend/src/components/FolderAIChat.tsx:231`** — مشکل: قالب‌بندی سخت‌کد `fa-IR` در رابط انگلیسی. — اصلاح: الگوی موجود `isEn ? "en-GB" : "fa-IR"` را به کار ببر (هر سه نقطه). — پذیرش: `npm run typecheck` + بازبینی چشمی در حالت EN (فقط متن، بدون تغییر چیدمان). — ریسک: کم. — تغییر ظاهر: خیر (فقط متن).
- [ ] **CODE-31 · P3 · فایل: `frontend/src/hooks/useAuth.tsx:147-158`** — مشکل: مقدار `AuthContext.Provider` در هر رندر بازساخته می‌شود ⇒ رندر همهٔ مصرف‌کننده‌ها. — اصلاح: مقدار را در `useMemo` با وابستگی‌های دقیق `[user, session, loading, …handlers]` بپیچ (یا دو context جدا). — پذیرش: `npm run typecheck` + `npx vitest run src/hooks` (اگر تستی هست) و بازبینی دستی نبود مقدار کهنه. — ریسک: کم-متوسط (وابستگی ناقص ⇒ مقدار کهنه). — تغییر ظاهر: خیر.

### ۴-۲. طراحی و UX — از `status-design.md` (۲۹ مورد)

- [ ] **DESIGN-04 · P1 · فایل: `frontend/src/components/CommandPalette.tsx:29-48` + `frontend/src/lib/sidebarQuickLinks.ts:25-60` + `frontend/src/components/sidebar/SidebarNavSections.tsx:115-206`** — مشکل: چهار فهرست ناوبری مستقل (سایدبار `SECTIONS`/`NAV_ITEMS`، ریل، نوار پایین، پالت ۱۸ ورودی) + `App.tsx` هنوز ۸۷ `<Route>` و ۲۷ `<Navigate>`. — اصلاح: فهرست پالت و ریل را از `SECTIONS`/`NAV_ITEMS` (`SidebarNavSections.tsx:206`) تولید کن، با حفظ دقیق همان برچسب‌ها و آیکن‌های فعلی؛ `App.tsx` دست نزن. — پذیرش: `npx vitest run src/components/CommandPalette.test.tsx` (یا تست خودتان) + یک تست parity که تعداد/برچسب ورودی‌های پالت را با `NAV_ITEMS` مقایسه کند. — ریسک: متوسط (اگر برچسبی عوض شود ظاهر تغییر می‌کند). — تغییر ظاهر: خیر (به‌شرط حفظ یک‌به‌یک برچسب‌ها).
- [ ] **DESIGN-05 · P1 · فایل: `frontend/src/components/CommandPalette.tsx:36,43`** — مشکل: دو ورودی به مسیرهای ریدایرکت‌شده می‌روند (`/app/habits` → `App.tsx:345` = `/app/today` و `/app/abc` → `App.tsx:367` = `/app/thoughts?mode=short`). — اصلاح: مقصد را به مسیر واقعی (`/app/today` و `/app/thoughts?mode=short`) تصحیح کن یا ردیف را حذف کن. — پذیرش: کلیک روی هر دو ردیف پالت به صفحهٔ مورد انتظار می‌رسد (تست موجود پالت + بازبینی دستی). — ریسک: کم. — تغییر ظاهر: خیر (فقط دو ردیف پالت).
- [ ] **DESIGN-07 · P1 · فایل: `frontend/src/pages/TodayDashboardView.tsx:83` در برابر `:615`** — مشکل: دکمهٔ «نمای دوپنله» در بازهٔ ۶۰۰–۶۳۹px رندر می‌شود ولی `disabled` است (رندر با `innerWidth >= 600`، شرط disabled با `availableWidth < 640`) ⇒ دکمهٔ مرده. — اصلاح: آستانهٔ رندر را از ۶۰۰ به ۶۴۰ ببر **یا** `title` توضیحی هم‌سبک `TasksView.tsx:1227,1230` اضافه کن. — پذیرش: در عرض ۶۲۰px دکمه یا دیده نمی‌شود یا با `title` توضیحی غیرفعال است؛ `npx vitest run src/pages/TodayDashboardView.test.tsx` سبز. — ریسک: کم. — تغییر ظاهر: خیر برای ≥۶۴۰ (فقط حذف دکمهٔ بی‌اثر در ۶۰۰–۶۳۹).
- [~] **DESIGN-08 · P1 · فایل: `frontend/src/components/ListViewSwitch.tsx:11-13,19`** — مشکل: باقی‌مانده: گزینهٔ چهارم `kanban-columns` در سوییچ نیست و شرط بی‌اثر `:19` `onChange(id === "kanban-stream" && value === "kanban-columns" ? value : id)` باقی است ⇒ کلیک روی «کانبان» در حالت «برد ستونی» بی‌اثر است. (رفع‌شده: ردیف تکراری «تایم‌باکت» در `pages/tasks/TasksHeader.tsx:114-116`.) — اصلاح: گزینهٔ `kanban-columns` را به `:11-13` اضافه کن و شرط بی‌اثر `:19` را ساده کن (یا `allowKanban` کافی است). — پذیرش: `npx vitest run src/components/ListViewSwitch.test.tsx` (یا تست هدر تسک) + تعویض هر چهار نما بدون بی‌اثر بودن. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — یک دکمهٔ چهارم در سوییچ هدر.
- [~] **DESIGN-09 · P1 · فایل: `frontend/src/components/TaskActionSheet.tsx:403,411,428,437-472,533`** — مشکل: باقی‌مانده: هنوز ۹ ردیف بی‌قید + تا ۳ شرطی در `:437-472`؛ گرید بالا هنوز `grid-cols-4` (`:403`) با کاشی شرطی `sharing` (`:411`)؛ «انتظار و پیش‌نیازها» در `:428` و `:533` تکرار شده. (رفع‌شده: ادغام سه ردیف ویرایش/ضمیمه/تگ در `:462` و حذف ردیف تکراری انتظار/پیش‌نیاز از شاخهٔ اصلی.) — اصلاح: ۹ ردیف باقی‌مانده را زیر دو تیتر کوچک دسته‌بندی کن، گرید بالا را وقتی `sharing` خاموش است `grid-cols-3` کن، و تکرار «انتظار و پیش‌نیازها» را یکی کن. — پذیرش: `npx vitest run src/components/TaskActionSheet.test.tsx` سبز + شیت در ۳۶۰px بدون اسکرول افقی. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — تیتر گروه + تقارن گرید.
- [~] **DESIGN-10 · P1 · فایل: `frontend/src/components/task-detail/MetaTile.tsx:28` و `frontend/src/components/task-detail/TaskMetaBar.tsx:276`** — مشکل: باقی‌مانده: کاشی `h-9` = ۳۶px است (هدف ۴۴px) و `overflow-x-auto no-scrollbar` بدون اسکرول‌بار مرئی مانده. (رفع‌شده: فید لبه `metaStripFade` + `index.css:453-455`.) — اصلاح: `h-9`→`min-h-11` در `MetaTile.tsx:28` یا افزودن `after:-inset-1` هم‌سبک `TAP_HALO`. — پذیرش: `npx vitest run src/components/task-detail/TaskMetaBar.test.tsx` سبز + اندازهٔ هدف لمسی ≥۴۴px در بازبینی. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — ارتفاع نوار متادیتا.
- [~] **DESIGN-11 · P1 · فایل: `frontend/src/components/TaskListItem.tsx:34,255,263,331,339,433`** — مشکل: باقی‌مانده: `const TAP_HALO = "relative before:absolute before:-inset-2.5 before:content-['']"` هدف را به ۳۶–۴۰px می‌رساند، نه ۴۴px مورد درخواست. (رفع‌شده: هاله روی هر پنج کنترل؛ WCAG 2.5.8 با ۲۴px برآورده است.) — اصلاح: `before:-inset-2.5`→`before:-inset-3` برای چهار کنترل ۲۰px (نه چیپ‌ها). — پذیرش: `npx vitest run src/components/TaskListItem.test.tsx` سبز + تست دستی نبود هم‌پوشانی هدف‌های مجاور. — ریسک: متوسط (هم‌پوشانی هدف‌ها). — تغییر ظاهر: خیر (شبه‌عنصر نامرئی).
- [ ] **DESIGN-12 · P1 · فایل: `frontend/src/components/TaskListItem.tsx:337,344,349,354,370,399,420,433,448,468`** — مشکل: ردیف متادیتا با تا ۹ چیپ ریز (`text-[9px] h-4`، `text-[10px] h-5`) در ارتفاع `min-h-[20px]` و بدون جمع‌شدن «+n». — اصلاح کمینه: دو چیپ کم‌اهمیت را در `<sm` پنهان کن (نشان منبع `:396-411` و چیپ نتیجه `:463-475`) بدون افزودن UI جدید. — پذیرش: `npx vitest run src/components/TaskListItem.test.tsx` سبز + بازبینی ۳۶۰px. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — فقط موبایل، حذف دو چیپ.
- [~] **DESIGN-13 · P1 · فایل: `frontend/src/pages/TasksView.tsx:128-137,1132,1145` + `frontend/src/hooks/useTasksData.ts:195`** — مشکل: باقی‌مانده: `const isEmpty = groupedTasks ? groupedTasks.length === 0 : folderTopLevel.length === 0;` بدون گارد آماده‌بودن؛ هوک `isReady` را می‌دهد ولی در destructure نیست. (رفع‌شده: همان گیت در «امروز» — `TodayDashboardView.tsx:572-573`.) — اصلاح: `isReady` را به destructure اضافه کن و `const isEmpty = isReady && (…)`. — پذیرش: `npx vitest run src/pages/TasksView.test.tsx` (یا تست split موجود) + باز کردن سرد صفحه بدون فلاش حالت خالی. — ریسک: کم. — تغییر ظاهر: خیر.
- [~] **DESIGN-14 · P1 · فایل: `frontend/src/pages/NotesView.tsx:624`، `frontend/src/pages/TasksView.tsx:1146`، `frontend/src/pages/PlanningView.tsx:75`** — مشکل: باقی‌مانده: `<EmptyState>` فقط در دو صفحه و `<Skeleton>` فقط در یک صفحه استفاده شده؛ پنج صفحهٔ اصلی هنوز حالت بارگذاری/خالی مشترک ندارند. (رفع‌شده: `RouteFallback` اسپینر + `aria-live` در `App.tsx:118-131,297`.) — اصلاح: استفادهٔ مشترک از `<EmptyState>` در پنج صفحهٔ اصلی (فقط import/جای‌گذاری، بدون کامپوننت جدید). — پذیرش: grep تعداد مصرف `<EmptyState>` ≥۵ + typecheck سبز. — ریسک: کم. — تغییر ظاهر: خیر (فقط صفحه‌های خالی فعلی).
- [ ] **DESIGN-16 · P1 · فایل: `frontend/src/lib/uiScale.ts:33,41` + `frontend/src/pages/settings/AppearanceSettingsSection.tsx`** — مشکل: «مقیاس UI» فقط `root.style.fontSize` را ست می‌کند و روی ۵۸۶ مورد متن با اندازهٔ ثابت px اثر ندارد (`text-[11px]` ۲۹۲، `text-[10px]` ۲۲۴، `text-[9px]` ۴۲). — اصلاح کمینه: افزودن یک هشدار کوتاه در بخش ظاهر تنظیمات که بزرگ‌نمایی روی برچسب‌های ریز اثر محدود دارد (متن ثابت). مهاجرت تدریجی `text-[10px]/[11px]` به دو توکن rem **اختیاری** و فقط در پنجرهٔ پایانی بستهٔ ۵. — پذیرش: typecheck + بازبینی متن در fa/en. — ریسک: کم برای هشدار، متوسط برای مهاجرت. — تغییر ظاهر: خیر برای هشدار.
- [ ] **DESIGN-17 · P1 · فایل: `frontend/src/components/knowledge/LessonCardLayout.css:121-122` (و ۷۸ مورد `!important` در آن فایل)، `frontend/src/index.css:51 مورد` (مثل `:1250-1264`، `:1716-1719`)، `frontend/src/pages/GardenView.css` (۲)، `frontend/src/components/AngelCompanion.css` (۱)** — مشکل: CSS موازی و `!important`های ضدتم، رنگ‌های هاردکد. — اصلاح گام‌به‌گام: رنگ‌های هاردکد با `hsl(var(--primary))`/`var(--destructive)` عوض شوند و `!important` برداشته شود. — پذیرش: `grep -c "!important"` کاهشی + بازبینی بصری دو صفحه (باغ/آموزش) در تم روشن و تاریک. — ریسک: متوسط (انحراف رنگ محتمل). — تغییر ظاهر: هدف «خیر» (مقادیر توکن معادل)، انحراف رنگ = شکست.
- [ ] **DESIGN-18 · P2 · فایل: `frontend/src/components/TaskDetail.tsx` (۱۹۴۳ خط)، `frontend/src/components/review/KnowledgeMindMapView.tsx` (۲۶۲۲)، `frontend/src/pages/TasksView.tsx` (۱۴۳۳)، `frontend/src/pages/LifeArchitectView.tsx` (۱۳۰۷)، `frontend/src/pages/NotesView.tsx` (۱۲۸۸)، `frontend/src/pages/SettingsView.tsx` (۹۶۱)** — مشکل: mega-fileها نگهداری را سخت می‌کنند. — اصلاح: فقط استخراج بلوک‌های مستقل (`TaskDetail` expandables، `KnowledgeMindMapView`) با حفظ **دقیق** ترتیب رندر. — پذیرش: typecheck + تست‌های همان فایل‌ها + بیلد exit 0. — ریسک: متوسط. — تغییر ظاهر: خیر. **این مورد باید در پنجرهٔ پایانی و پس از توقف همهٔ نویسندگان دیگر انجام شود (بخش ۶).**
- [ ] **DESIGN-19 · P2 · فایل: `frontend/src/pages/SettingsView.tsx:70-402` (تعریف)، `:743-780` (بخش‌ها)، `:934` (رندر `AppUpdateCard`)، `:723` (TabsList)** — مشکل: تب «عمومی» ۷ بخش سنگین دارد و `AppUpdateCard` ~۳۳۰ خط داخل همان فایل است؛ جستجوی درون‌تنظیمات وجود ندارد. — اصلاح کمینه: انتقال بلوک `SettingsView.tsx:70-402` به فایل مستقل (صرفاً جابه‌جایی کد، ترتیب تب‌ها ثابت). — پذیرش: `npx vitest run src/pages/SettingsView.test.tsx` سبز + typecheck. — ریسک: کم. — تغییر ظاهر: خیر. (جستجوی درون‌تنظیمات = فیچر جدید، خارج از محدوده.)
- [ ] **DESIGN-21 · P2 · فایل: `frontend/src/pages/settings/SidebarQuickLinksSettings.tsx:81-109,139` + `frontend/src/lib/sidebarQuickLinks.ts:25-60`** — مشکل: نگاشت آیکن ریل با فهرست مجاز هم‌خوان نیست: آیکن برای مسیرهای غیرمجاز `/app/buckets` `:90`، `/app/planning` `:91`، `/app/habits` `:98`، `/app/abc` `:104` هست، ولی `/app/interactive-study` (`sidebarQuickLinks.ts:47`) مجاز است و آیکن ندارد ⇒ `:139` آیکن پیش‌فرض `LayoutGrid` می‌گیرد. — اصلاح: آیکن‌ها را به `lib/sidebarQuickLinks.ts` (`SIDEBAR_QUICK_LINK_OPTIONS`) منتقل کن، `QUICK_LINK_ICONS` را حذف کن و برای `/app/interactive-study` آیکن تعیین کن. — پذیرش: typecheck + بازبینی ریل در fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — آیکن درست برای یک آیتم ریل.
- [ ] **DESIGN-22 · P2 · فایل: `frontend/src/components/bottom-bar/WindowsFluentBar.tsx` (۳۰۶ خط)، `FoldableAdaptiveBar.tsx` (۲۰۹)، `DesktopFloatingDock.tsx` (۱۵۳)، `frontend/src/components/bottom-bar/AdaptiveNavigation.test.tsx:5-6`، `frontend/src/components/island/IslandAlbum.tsx`، `frontend/src/components/BottomTabBar.tsx:78`** — مشکل: سه نوار بی‌مصرف که هرگز رندر نمی‌شوند (تنها ارجاع‌دهنده همان فایل تست است) و dispatch `lov:toggle-dock` در `BottomTabBar.tsx:78` هیچ شنوندهٔ mount‌شده‌ای ندارد. — اصلاح: حذف پنج فایل + حذف dispatch بی‌شنونده. **این مورد مسدود است تا تصمیم مالک** (حذف فایل مرده‌ای که یک تست به آن وابسته است) — بخش ۵، OWNER-DEADFILES. — پذیرش: `Test-Path` = False برای پنج فایل + `npm run typecheck` سبز + `npx vitest run src/components` بدون «no test files». — ریسک: کم فنی، ولی از‌دست‌رفتن کد در صورت تصمیم به بازگرداندن نوارها. — تغییر ظاهر: خیر.
- [ ] **DESIGN-24 · P2 · فایل: `frontend/src/components/sidebar/SidebarNavSections.tsx:62` + `frontend/src/App.tsx:386`** — مشکل: صفحهٔ «اشتراک‌شده‌ها» (`<Route path="shared">`) هیچ نقطهٔ ورودی ندارد؛ برچسب `"اشتراک‌ها": "Shared with me"` در `SECTIONS` بی‌استفاده است. — اصلاح: همان برچسب را به‌عنوان یک آیتم در بخش «خودِ من» با مقصد `/app/shared` اضافه کن. — پذیرش: typecheck + بازبینی سایدبار در fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — یک ردیف سایدبار. (اگر مالک نخواهد: بخش ۵، مورد اختیاری.)
- [ ] **DESIGN-25 · P2 · فایل: `frontend/src/lib/mobileBottomBarSettings.ts:48,83` + `frontend/src/components/sidebar/SidebarNavSections.tsx:135,175` + `frontend/src/components/AppSidebar.tsx:399` + `frontend/src/components/task-detail/TaskMetaBar.tsx:144,156`** — مشکل: واژگان ناهمگون: «یادداشت‌ها» vs «نوت‌ها»؛ «صندوق» vs «صندوق ورودی»؛ «فولدرها» vs «پوشه»/«پوشهٔ تازه». — اصلاح: مبنا = برچسب سایدبار؛ سه جفت را یکدست کن (فقط رشته‌های متنی). — پذیرش: grep واژه‌های قدیمی صفر + بازبینی fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — متن.
- [ ] **DESIGN-26 · P2 · فایل: `frontend/src/pages/PlanningView.tsx:63-72` + `frontend/src/pages/SettingsView.tsx:791-792`** — مشکل: پاپ‌اور تنظیمات زمان در Planning همان تنظیمات تب تسک‌ها است و هیچ اشاره‌ای به محل دیگر ندارد. — اصلاح کمینه: افزودن یک متن کوتاه اشاره در پاپ‌اور (بدون حذف دکمه). — پذیرش: typecheck + بازبینی متن fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — یک خط متن.
- [ ] **DESIGN-27 · P2 · فایل: `frontend/src/pages/tasks/QuickAddTask.tsx:629,668,715,763,640` + `frontend/src/pages/TasksView.tsx:1094-1118`** — مشکل: چهار چیپ افزودن سریع ≈۲۴px (`px-2.5 py-1 … text-[11px]`) و شیت تاریخ `max-h-[88dvh]`. — اصلاح کمینه: `py-1`→`py-1.5`/`min-h-9` روی چهار چیپ (بدون انتقال چیپ‌ها به منو). — پذیرش: `npx vitest run src/pages/tasks/QuickAddTask.test.tsx` (یا تست TasksView) سبز + اندازهٔ هدف لمسی. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — ارتفاع چیپ‌ها.
- [ ] **DESIGN-28 · P2 · فایل: `frontend/src/components/TaskFilterSheet.tsx:630-643` (+ کنترل‌های تکراری در `frontend/src/pages/TasksView.tsx:1096-1106` و `frontend/src/pages/SettingsView.tsx:784`)** — مشکل: کنترل «تسک‌های تکمیل‌شده» در سه جا. — اصلاح کمینه: یک خط اشاره در شیت فیلتر که همین تنظیم در «تنظیمات → تسک‌ها» هم هست (بدون حذف هیچ کنترلی). — پذیرش: `npx vitest run src/components/TaskFilterSheet.test.tsx` سبز + متن در fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — یک خط متن.
- [ ] **DESIGN-29 · P2 · فایل: `frontend/src/components/TaskListItem.tsx:155,186-194,214-217,277-280`** — مشکل: کنش‌های پنهان (long-press، right-click، ContextMenu/Shift+F10، دوبار-کلیک = تکمیل) بدون هیچ دکمهٔ «…» دائمی و بدون `title`. — اصلاح: حذف `onDoubleClick` در `:277-280` (رفتار، بدون UI جدید) و افزودن `title` راهنما روی ردیف. — پذیرش: `npx vitest run src/components/TaskListItem.test.tsx` سبز + نبود تکمیل ناخواسته با دوبار-کلیک. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **DESIGN-30 · P2 · فایل: `frontend/src/components/SelectionActionToolbar.tsx:201,218`** — مشکل: `z-[2147483646]` و `z-[2147483647]` ممکن است شیت/توست/پنل AI را بپوشانند. — اصلاح: `z-[2147483646]`→`z-50` و `z-[2147483647]`→`z-[60]`. — پذیرش: `npx vitest run src/components/SelectionActionToolbar.test.tsx` سبز + تست دستی باز بودن شیت/توست روی متن انتخاب‌شده. — ریسک: متوسط (لایه‌بندی). — تغییر ظاهر: خیر در حالت عادی.
- [ ] **DESIGN-31 · P3 · فایل: `frontend/src/pages/settings/MobileBottomBarSettings.tsx:182` (+ پیمایش: hex در tsx ۱۵۲، hex در css ۱۷، `left-/right-` ۸۸، `text-left/right` ۳۹، `ml-/mr-` ۱۳)** — مشکل: کلاس‌های جهت‌محور فیزیکی در بلوکی که `dir` را از `isEn` می‌گیرد ⇒ در EN برچسب‌ها سمت اشتباه می‌چسبند؛ رنگ‌های hex پراکنده. — اصلاح: `text-right`→`text-end` در `MobileBottomBarSettings.tsx:182` و جایگزینی تدریجی hexهای پرتکرار با توکن. — پذیرش: grep کاهشی + بازبینی EN. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — اصلاح تراز در EN. (**پیمایش گسترده فقط در پنجرهٔ پایانی بستهٔ ۵.**)
- [ ] **DESIGN-32 · P3 · فایل: `frontend/src/pages/TodayDashboardView.tsx:691` + `frontend/src/pages/TasksView.tsx:1059`** — مشکل: نوار «افزودن سریع» چسبان با کلاس و استایل inline یکسان در دو صفحه تکرار شده (`sticky top-0 z-20 py-1.5 -mx-1 px-1 mb-2` + `style={{ background: "var(--page-surface, hsl(var(--background)))" }}`). — اصلاح: کامپوننت مشترک `StickyQuickAdd` و استفاده در هر دو نقطه. کلاس `.page-surface` در `index.css` **متعلق به بستهٔ ۵ است**؛ اگر لازم شد، درخواست را به آن بسته بده (قاعدهٔ ۵). — پذیرش: typecheck + تست هر دو صفحه سبز + ظاهر بدون تغییر. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **DESIGN-34 · P3 · فایل: `frontend/src/index.css:1754-1757`** — مشکل: تعریف‌های `.paper-row`/`.paper-chip` (راه‌حل هدف لمسی ۴۰px) در CSS مانده و در `*.tsx` صفر استفاده دارد. — اصلاح: حذف بلوک تعریف‌ها (گزینهٔ وصل‌کردن به چیپ‌های تسک تغییر ظاهر دارد و توصیه نمی‌شود). — پذیرش: grep صفر برای `paper-row`/`paper-chip` + بیلد exit 0. — ریسک: کم. — تغییر ظاهر: خیر برای حذف.
- [ ] **DESIGN-35 · P3 · فایل: `frontend/src/pages/tasks/TasksHeader.tsx:106-115` + `frontend/src/components/TaskFilterSheet.tsx:347,401,412,464,585-589`** — مشکل: تکیه بر ایموجی (`📋 🎯 🧱 ⏳ 📥 ⚪ 🔥 🔴 🟡 🔵`) به‌جای آیکن؛ ظاهر بین اندروید/ویندوز/وب متفاوت است. — اصلاح: جایگزینی با آیکن‌های موجود `lucide-react`. — پذیرش: `npx vitest run src/pages/tasks/TasksHeader.test.tsx` (یا تست TasksView) سبز + بازبینی fa/en. — ریسک: کم. — تغییر ظاهر: بله (آیکن به‌جای ایموجی).
- [ ] **DESIGN-36 · P3 · فایل: `frontend/src/components/TaskActionSheet.tsx:443-450` ↔ `frontend/src/components/TaskListItem.tsx:348-351` (+ چیپ سرصفحه `frontend/src/pages/TodayDashboardView.tsx:591-599`)** — مشکل: «کار بعدی» در سه سطح با برچسب‌های ناهم‌نام تکرار شده. — اصلاح: هم‌نام‌کردن برچسب ردیف شیت با ردیف تسک (`TaskActionSheet.tsx:446` ↔ `TaskListItem.tsx:350`)؛ چیپ سرصفحه فقط وقتی `nextTask` ست است (همین حالا برقرار است). — پذیرش: typecheck + بازبینی متن fa/en. — ریسک: کم. — تغییر ظاهر: بله (جزئی) — متن.
- [~] **DESIGN-23 · P2 · فایل: `frontend/src/components/KeyboardShortcutsDialog.tsx:6-13`** — مشکل: باقی‌مانده: میان‌برهای `Alt+1..4`، `Alt+N`، `Alt+M`، `Alt+D` (تعریف‌شده در `BottomTabBar.tsx:46-80`، کامنت `:33`) در دیالوگ مستند نشده‌اند. (رفع‌شده: آرایهٔ مردهٔ `tabs` و `Alt+5` حذف شدند.) — اصلاح: افزودن ردیف‌های متنی به آرایهٔ `SHORTCUTS` در `:6-13` (بدون UI جدید). — پذیرش: `npx vitest run src/components/KeyboardShortcutsDialog.test.tsx` (اگر هست) + بازبینی دیالوگ. — ریسک: کم. — تغییر ظاهر: خیر (افزودن ردیف متنی در دیالوگ موجود).

> **DESIGN-33 کاری برای انجام ندارد** (فایل `App.css` حذف شده و grep صفر است).
> **DESIGN-22 (کاهش‌یافته، OPEN)** در فهرست بالا آمده ولی **مسدود تا تصمیم مالک** است؛ جزئیات گزینه‌ها در بخش ۵ — OWNER-DEADFILES.

### ۴-۳. API، امنیت و استقرار — از `status-api.md` (۲۸ مورد)

- [ ] **API-03 · P1 · فایل: `api/user/delete-account.ts:39-46,55-59` + `api/_lib/accountDeletion.ts:13`** — مشکل: حذف حساب پیش از هر پاک‌سازی با ۵۰۳ برمی‌گردد چون مرحلهٔ `legacy-attachments` به سرویس FastAPI وابسته است که در Vercel مستقر نمی‌شود ⇒ هیچ کاربری نمی‌تواند حسابش را حذف کند. — اصلاح: وقتی `ARSH_API_BASE_URL` تنظیم نیست، `deleteLegacyAttachments` را no-op با `console.warn` کن و بقیهٔ مراحل را ادامه بده. — پذیرش: `cd frontend && npx vitest run ../api/user/delete-account.test.ts` (یا `npm run test:api`) + یک تست که در نبود متغیر محیطی، مسیر بدون ۵۰۳ تا `deleteAuthUser` می‌رود. — ریسک: متوسط (پیوست‌های سرویس قدیمی حذف نمی‌شوند = بدهی انطباقی مستند؛ مسیر جایگزین در بخش ۵ — OWNER-FASTAPI). — تغییر ظاهر: خیر.
- [ ] **API-04 · P1 · فایل: `api/_lib/accountDeletion.ts:13-21` + `api/user/delete-account.ts` (مرحلهٔ جدید) + مرجع `api/arsh/modules.ts:109`** — مشکل: `uid` در `module_codes/*/redeemers/*` پس از حذف حساب باقی می‌ماند (دادهٔ یتیم). — اصلاح: افزودن مرحلهٔ `deleteModuleCodeRedeemers(uid)` (پیمایش کدهای بازخریدشده و `codeRef.collection("redeemers").doc(uid).delete()`) و ثبت آن در `accountDeletion.ts:17` **پیش از** `deleteAuthUser`. — پذیرش: `npm run test:api` سبز + تست واحد با mock که خطای این مرحله، حذف Auth را متوقف نمی‌کند. — ریسک: متوسط (نیاز به collection-group query یا فهرست کدهای کاربر). — تغییر ظاهر: خیر.
- [~] **API-05 · P1 · فایل: `firebase.json` (ساخته شده)، `frontend/rules-tests/**`، `frontend/package.json:15`** — مشکل: کانال استقرار قواعد هنوز وجود ندارد؛ `firebase.json` ساخته شده ولی هیچ اسکریپت/CI آن را deploy نمی‌کند و `npm run test:rules` هم شکست می‌خورد (بخش ۷). (رفع‌شده: خود فایل `firebase.json` با نگاشت `firestore.rules`/`storage.rules`.) — اصلاح: تعیین کانال (CI با Firebase CLI یا اسکریپت مستند `npm run deploy:rules`) = تصمیم مالک (بخش ۵ — OWNER-RULES-DEPLOY)؛ **حداقل کار قابل انجام بدون مالک:** تمام‌کردن زیرساخت تست قواعد طبق بخش ۷. — پذیرش: `npm run test:rules` سبز (بدون نیاز به CLI) و/یا سند کانال استقرار. — ریسک: صفر برای کد اجرایی. — تغییر ظاهر: خیر.
- [ ] **API-07 · P1 · فایل: `api/arsh/modules.ts:45-51`** — مشکل: هیچ `handleCors` و هیچ شاخهٔ `OPTIONS` نیست ⇒ preflight از مبدأ Capacitor با ۴۰۱ شکست می‌خورد. — اصلاح: در ابتدای `:45` `if (handleCors(req, res)) return;` با import از `../_lib/response.js` (ترتیب: CORS پیش از بررسی پیکربندی). — پذیرش: `npm run test:api` + تستی که `OPTIONS` را می‌زند و ۲۰۴/۲۰۰ با هدرهای CORS می‌گیرد. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **API-08 · P1 · فایل: `api/_lib/auth.ts:19,72,97,126` + `api/_lib/firestore.ts:155,231,281,359,391`** — مشکل: نُه `fetch` بدون `signal` ⇒ در قطعی شبکه، تابع تا تایم‌اوت Vercel معلق می‌ماند. — اصلاح: افزودن `api/_lib/fetchWithTimeout.ts` و جایگزینی هر ۹ مورد؛ الگوی موجود در همان مخزن: `api/user/delete-account.ts:58` (`AbortSignal.timeout(20_000)`). — پذیرش: `npm run test:api` سبز + تستی که abort را شبیه‌سازی می‌کند و **۵۰۳** (نه ۴۰۱) می‌گیرد. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **API-09 · P1 · فایل: `api/_lib/firestore.ts:151-169,216-217,422` + `api/_lib/agentApi.ts:136` + `api/_lib/assistantTasks.ts:26`** — مشکل: حلقهٔ صفحه‌بندی کل مجموعه را در حافظه جمع می‌کند و بعد `slice` می‌زند؛ `listUserTasks(user, { limit: Number.MAX_SAFE_INTEGER })`؛ دو `collection(...).get()` بدون limit. — اصلاح: `pageSize` ورودی/سقف صفحه در `listUserTasks`، جایگزینی `Number.MAX_SAFE_INTEGER` با پرس‌وجوی بازه‌ای (مثلاً `work_date >= today-90d`) یا limit منطقی، و `.limit()` در دو نقطهٔ دیگر. — پذیرش: `npm run test:api` سبز + تست «کالکشن بزرگ ⇒ تعداد خوانده‌شده محدود». — ریسک: متوسط (تغییر قرارداد پاسخ `/api/tasks` و `/api/tasks/today` — هماهنگی با فرانت). — تغییر ظاهر: خیر.
- [~] **API-10 · P1 · فایل: `build-android-apk.bat:31,41-42`** — مشکل: باقی‌مانده: اسکریپت هنوز `gradlew.bat assembleDebug` می‌زند و خروجی را به ریشهٔ مخزن کپی می‌کند (`ARSHNAZ-debug.apk`، `Arshiam-latest.apk`)؛ فایل ۳۵٬۰۹۶٬۰۵۸ بایتی هنوز روی دیسک و ردیابی‌نشده است. (رفع‌شده: حذف staged از ایندکس + `.gitignore:85-87`؛ blob در تاریخ `b1e9d0b` می‌ماند = تصمیم مالک.) — اصلاح: تغییر به `assembleRelease` و انتقال خروجی به مسیری خارج از ریشه (یا `dist/`). — پذیرش: اسکریپت هیچ فایل `*.apk` در ریشهٔ مخزن تولید نکند (`git status` پاک). — ریسک: کم تا زمانی که امضا تنظیم نشده (`KEYSTORE_PATH` لازم است؛ بخش ۵ — OWNER-ANDROID-SIGN). — تغییر ظاهر: خیر.
- [ ] **API-11 · P2 · فایل: `api/_lib/agentApi.ts:977-978` + `api/_lib/rateLimiter.ts:13`** — مشکل: کلید محدودیت نرخ از هدر `authorization` **پیش از** احراز هویت ساخته می‌شود، سبدها درون‌حافظه‌ای و بدون eviction هستند، و مسیرهای `api/tasks/*` و `api/assistant/*` هیچ محدودیتی ندارند. — اصلاح: کلید را به UID تأییدشده (پس از `authenticateAssistant`) تغییر بده و `checkRateLimit` را به `api/tasks/index.ts`، `api/tasks/[id].ts`، `api/tasks/today.ts` و `api/assistant/tasks/*` اضافه کن. — پذیرش: `npm run test:api` سبز + تست «۴۲۹ پس از سقف با UID یکسان و هدر متفاوت». — ریسک: متوسط (سبدهای درون‌حافظه‌ای؛ رفع کامل نیازمند سرویس بیرونی است). — تغییر ظاهر: خیر.
- [ ] **API-12 · P2 · فایل: `api/_lib/agentApi.ts:1024` (+ `:627`، `:943-948`) + `api/_lib/assistantTasks.ts:21,94`** — مشکل: مسیر `audit-log` با اسکوپ `tasks:read` رکوردهای خاطرات/دفتر خاطرات را برمی‌گرداند و `before` کل سند قبلی را برمی‌گرداند. — اصلاح: اسکوپ `audit-log` را به `memories:read` تغییر بده یا رکوردها را وقتی اسکوپ فقط `tasks:read` است به `tasks:*`/`folders:*` فیلتر کن. — پذیرش: `npm run test:api` سبز + تست «توکن با `tasks:read` هیچ رکورد memory نمی‌بیند». — ریسک: متوسط (توکن‌های موجود ممکن است ۴۰۳ بگیرند). — تغییر ظاهر: خیر.
- [ ] **API-13 · P2 · فایل: `api/_lib/response.ts:12,27` + `vercel.json` (کل ۱۹ خط، بدون کلید `headers`)** — مشکل: `Access-Control-Allow-Origin: *` روی هر پاسخ (حتی ۴۰۱/۵۰۰) و نبود هدرهای امنیتی. — اصلاح: افزودن کلید `headers` در `vercel.json` برای `/(.*)`: `X-Content-Type-Options: nosniff`، `Referrer-Policy: strict-origin-when-cross-origin`، `X-Frame-Options: DENY`، `Strict-Transport-Security: max-age=63072000; includeSubDomains`. **CSP اضافه نکن** (اسکریپت inline تم در `frontend/index.html:5`) مگر با nonce. بخش CORS allow-list = تصمیم مالک (بخش ۵). — پذیرش: `vercel.json` معتبر JSON + بازبینی هدرها در پیش‌نمایش/تست محلی. — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **API-14 · P2 · فایل: `api/tasks/index.ts:103-108`، `api/tasks/[id].ts:116-121`، `api/tasks/today.ts:37-42`، `api/_lib/agentApi.ts:1172`، `api/user/me.ts:26-31`** — مشکل: بازتاب `error?.message` داخلی به کلاینت (نشت جزئیات). — اصلاح: پیام ثابت عمومی + افزودن `errorId` تصادفی به لاگ/پاسخ در هر پنج نقطه. — پذیرش: `npm run test:api` سبز + grep که هیچ‌کدام پیام خام را برنمی‌گردانند. — ریسک: کم (دیباگ سخت‌تر می‌شود؛ با errorId جبران می‌شود). — تغییر ظاهر: خیر.
- [ ] **API-15 · P2 · فایل: `api/_lib/agentApi.ts:15,26-35,291,595-600,634-636`** — مشکل: `idempotencyCache` درون‌حافظه‌ای با انقضای فقط-هنگام-خواندن و بدون eviction؛ در `handleCreateMemory` هیچ سقف طولی برای کلید نیست (سقف ۲۰۴۸ فقط در مسیر تسک `:291`). — اصلاح: افزودن سقف طول کلید در `:596` (همان `> 2048` خط `:291`) و سقف/eviction برای کش `:15`. — پذیرش: `npm run test:api` سبز + تست کلید بسیار بلند ⇒ ۴۰۰/۴۱۳. — ریسک: کم (انتقال به Firestore ریسک هزینه دارد — انجام نده). — تغییر ظاهر: خیر.
- [ ] **API-16 · P2 · فایل: `api/_lib/agentApi.ts:899-905`** — مشکل: PATCH تقویم بدون اعتبارسنجی: عنوان خالی مجاز است، `status` بدون allow-list، و `Boolean(body.completed)` برای رشتهٔ `"false"` مقدار `true` می‌دهد. — اصلاح: استفاده از `validateTaskInput(body)`/`taskCompletionWrite(body)` و رد ۴۰۰ برای عنوان خالی/`status` نامعتبر (هم‌الگو با `:363-368`). — پذیرش: `npm run test:api` سبز + تست `{completed: "false"}` ⇒ ۴۰۰ یا `false` درست. — ریسک: کم (کلاینت‌های buggy ممکن است ۴۰۰ بگیرند — رفتار کنونی باگ است). — تغییر ظاهر: خیر.
- [ ] **API-18 · P2 · فایل: `backend/attachments.py:29,151-154`** — مشکل: کل بدنهٔ آپلود پیش از بررسی حجم در حافظه خوانده می‌شود. — اصلاح: پیش از `await request.body()` هدر `Content-Length` را بررسی کن (۴۱۳ در صورت عبور از `MAX_BYTES`) و استریم را با شمارندهٔ بایت بخوان. — پذیرش: تست دستی/واحد با بدنهٔ بزرگ ⇒ ۴۱۳ بدون مصرف حافظه. — ریسک: کم **اگر** سرویس FastAPI واقعاً مستقر باشد (بخش ۵ — OWNER-FASTAPI). — تغییر ظاهر: خیر.
- [ ] **API-20 · P2 · فایل: `.github/workflows/api.yml` (جدید) + `package.json` ریشه (بدون اسکریپت تست)** — مشکل: هیچ CI و هیچ اسکریپت تست/typecheck در ریشهٔ مخزن وجود ندارد. — اصلاح: workflow با سه گام: `npm ci` (ریشه)، `cd frontend && npm run typecheck`، `cd frontend && npm run test:api`. — پذیرش: فایل YAML معتبر + اولین اجرا (یا اجرای دستی محلی همان سه دستور). — ریسک: صفر برای کد. — تغییر ظاهر: خیر.
- [ ] **API-21 · P2 · فایل: `backend/modules.py:45-47` در برابر `api/arsh/modules.ts:62-63`** — مشکل: دو مدل `is_admin` متفاوت (پایتون `role == "admin"` را می‌پذیرد، TS نه). — اصلاح: یکسان‌سازی مدل TS در پایتون (حذف پذیرش `role == "admin"`). — پذیرش: تست واحد پایتون (اگر سرویس زنده است) یا بازبینی کد + grep. — ریسک: کم. — تغییر ظاهر: خیر. (حذف کامل `backend/modules.py` = تصمیم مالک.)
- [ ] **API-22 · P2 · فایل: `backend/requirements.txt:24,57,110`** — مشکل: وابستگی از URL شخص‌ثالث (`litellm @ https://customer-assets.emergentagent.com/...#sha256=`) و پین‌های قدیمی (`fastapi==0.110.1`، `starlette==0.37.2`) و نبود lock پایتون. — اصلاح: پین `litellm` از PyPI با هش رسمی، ارتقای `fastapi`/`starlette`، افزودن `requirements.lock`. — پذیرش: نصب در محیط تمیز (اگر ممکن است) + اجرای تست‌های `backend/`. — ریسک: متوسط (ارتقای Starlette می‌تواند کد FastAPI را بشکند). — تغییر ظاهر: خیر.
- [~] **API-23 · P2 · فایل: `frontend/android/app/build.gradle:37,59` + `frontend/android/app/src/main/AndroidManifest.xml:5` + `frontend/android/app/src/main/res/xml/backup_rules.xml` و `data_extraction_rules.xml`** — مشکل: (الف) `allowBackup="true"` و `app_webview`/`databases` (localStorage و IndexedDB وب‌ویو شامل نشست Firebase) از بکاپ مستثنا **نشده‌اند**؛ (ب) `minifyEnabled false` در build type release؛ (ج) `androidx.security:security-crypto:1.1.0-alpha06`. — اصلاح قابل انجام بدون مالک: `minifyEnabled true` + `shrinkResources true` و ارتقای `security-crypto` و افزودن `app_webview`/`databases`/`shared_prefs` به هر دو فایل قواعد بکاپ. بخش `allowBackup="false"` = تصمیم مالک (بخش ۵). — پذیرش: `cd frontend/android && ./gradlew assembleRelease` (یا حداقل `gradlew tasks`) بدون خطا + بازبینی XML. — ریسک: متوسط (`minifyEnabled true` نیازمند قواعد ProGuard برای پلاگین‌های Capacitor است و می‌تواند بیلد را بشکند). — تغییر ظاهر: خیر.
- [ ] **API-24 · P2 · فایل: `.gitignore` (ریشه) + `frontend/android/app/build.gradle:22,27` + `frontend/android/.gitignore:55-58`** — مشکل: `*.jks`/`*.keystore` در هیچ‌کدام ignore نیستند (دو خط در `frontend/android/.gitignore` کامنت شده‌اند) و مسیر پیش‌فرض `file('release.keystore')` در build.gradle است. — اصلاح: افزودن `*.jks` و `*.keystore` به `.gitignore` ریشه و حذف مسیر پیش‌فرض `'release.keystore'` (فقط `KEYSTORE_PATH`). — پذیرش: `git check-ignore -v test.jks` → مسیر `.gitignore` + بازبینی `build.gradle`. — ریسک: کم (بیلد release بدون `KEYSTORE_PATH` دیگر امضا نمی‌شود). — تغییر ظاهر: خیر.
- [ ] **API-25 · P2 · فایل: `frontend/android/app/src/main/java/.../MainActivity.java:68-77,113-127` + `AndroidManifest.xml:23,30-35,43,88-90`** — مشکل: `arshnaz://` با `BROWSABLE` و `extractRawUrl` نشانی خام را بدون اعتبارسنجی مبدأ به وب‌ویو پاس می‌دهد؛ `WidgetConfigureActivity` و ویجت `exported="true"`. — اصلاح: اعتبارسنجی پارامتر `result` در `MainActivity.java:68-77` (نادیده‌گرفتن منبع بیرونی) یا راستی‌آزمایی سمت سرور؛ تغییر `WidgetConfigureActivity` به `exported="false"` **اگر** AppWidget configure اجازه دهد. — پذیرش: بازبینی کد + تست دستی deep link با مقدار جعلی. — ریسک: کم تا متوسط (ممکن است `exported=false` برای configure ممکن نباشد). — تغییر ظاهر: خیر.
- [ ] **API-26 · P2/P3 · فایل: `api/arsh/modules.ts:61,63`** — مشکل: `(process.env.ARSH_ADMIN_EMAILS || "").split(",")...` آرایهٔ `[""]` می‌سازد و `extraAdmins.includes(email)` با رشتهٔ خالی مقایسه می‌شود (نسخهٔ پایتون `backend/modules.py:42` فیلتر `if e.strip()` دارد). — اصلاح: `.filter(Boolean)` روی `extraAdmins` و `isAdmin = false` صریح در صورت خالی‌بودن ایمیل. — پذیرش: `npm run test:api` سبز + تست «متغیر محیطی تنظیم‌نشده ⇒ هیچ ادمینی». — ریسک: صفر. — تغییر ظاهر: خیر.
- [ ] **API-27 · P3 · فایل: `api/api.test.ts:620-654`** — مشکل: تست IDOR صوری است؛ mock در `:631-633` فقط مسیر `/users/uid_test/tasks/non_existent` را ۴۰۴ می‌کند و هیچ assertion روی URL فراخوانی‌شده یا سند کاربر دیگر ندارد. — اصلاح: mock سند `users/uid_B/tasks/...` + assertion روی URL فراخوانی‌شده. — پذیرش: `npm run test:api` (۸۵+ تست) سبز و تست جدید در حالت شکست عمدی، قرمز شود. — ریسک: صفر. — تغییر ظاهر: خیر.
- [ ] **API-28 · P3 · فایل: `test_reports/iteration_4.json:20`، `iteration_5.json:13`، `iteration_6.json:32`** — مشکل: گزارش‌ها کهنه/متناقض‌اند (ادعای «۳۶ تست» در حالی که `api/api.test.ts` اکنون ۲۶ تست و کل ۸۵ تست است؛ `"backend": "N/A"`)، هیچ‌کدام فیلد `date`/`commit` ندارند. — اصلاح: مهر `commit`/`date`/دستور اجرا روی گزارش‌ها + بایگانی گزارش‌های منقضی. — پذیرش: هر فایل JSON معتبر و دارای `commit`/`date`. — ریسک: صفر. — تغییر ظاهر: خیر.
- [ ] **API-29 · P3 · فایل: `api/arsh/modules.ts:35-37,46-49,74-76`** — مشکل: اگر `ARSH_SIGNING_SECRET` (≥۳۲ کاراکتر) تنظیم نباشد، **همهٔ** درخواست‌ها ۵۰۳ می‌شوند، در حالی که مسیر خواندن `/me` به آن نیازی ندارد. — اصلاح: فقط Firebase Admin برای `GET /me` الزام شود و `ARSH_SIGNING_SECRET` در مسیرهای redeem/admin بررسی شود؛ کد خطا تفکیک شود. — پذیرش: `npm run test:api` + تست «بدون signing secret: `/me` کار می‌کند، redeem ۵۰۳ می‌دهد». — ریسک: کم. — تغییر ظاهر: خیر.
- [ ] **API-30 · P3 · فایل: `backend/google_integration.py:150-159`** — مشکل: `jwt.decode(tok["id_token"], options={"verify_signature": False})` و سپس ذخیره در `google_tokens`. — اصلاح: حذف `verify_signature: False` و استفاده از `google.oauth2.id_token.verify_oauth2_token(..., GOOGLE_CLIENT_ID)`. — پذیرش: بازبینی کد + تست واحد با توکن جعلی ⇒ رد. — ریسک: کم (نیازمند `GOOGLE_CLIENT_ID` قابل‌اعتماد). — تغییر ظاهر: خیر.
- [ ] **API-31 · P3 · فایل: `api/_lib/agentApi.ts:971-974`** — مشکل: بررسی HTTPS بر پایهٔ `x-forwarded-proto` قابل‌جعل است و در نبود هدر هیچ بررسی‌ای انجام نمی‌شود. — اصلاح: حذف این بررسی (Vercel خودش HTTPS را اجباری می‌کند) و اتکا به HSTS بند API-13. — پذیرش: `npm run test:api` سبز. — ریسک: صفر. — تغییر ظاهر: خیر.
- [ ] **API-32 · P3 · فایل: `backend/attachments.py:121,129` + `backend/google_integration.py:215`** — مشکل: پسوند مسیر ذخیره‌سازی مستقیماً از نام فایل کاربر ساخته می‌شود. — اصلاح: allow-list، مثلاً `re.fullmatch(r"[a-z0-9]{1,10}", ext)` و در غیر این صورت استخراج از `mimetypes`. — پذیرش: تست واحد با نام‌های مخرب (`a.php`, `x.tar.gz`, بدون پسوند). — ریسک: کم. — تغییر ظاهر: خیر.
- [~] **API-33 · P3 · فایل: `frontend/public/robots.txt:13-14` + `.gitconfig` (ردیابی‌شده)** — مشکل: `robots.txt` ایندکس کامل را مجاز می‌کند و `.gitconfig` عامل (`github@emergent.sh`) در مخزن **ردیابی‌شده** است. — اصلاح قابل انجام بدون مالک: `git rm --cached .gitconfig` + افزودن `.gitconfig` به `.gitignore`. بخش `robots.txt` (`Disallow: /app/` و `/api/`) = تصمیم مالک (بخش ۵). — پذیرش: `git ls-files | findstr gitconfig` خالی + `git check-ignore -v .gitconfig`. — ریسک: کم (فقط تنظیمات محلی ابزارها). — تغییر ظاهر: خیر.

---

## ۵. تصمیم‌های مالک — بدون تأیید انسان اجرا نکن

پرسش‌ها را عیناً از مالک بپرس، گزینه‌ها و پیامدها را همین‌جا آورده‌ام. تا تصمیم، مورد را «مسدود/منتظر مالک» علامت بزن.

**OWNER-AUTH — سیاست احراز هویت `api/_lib/auth.ts:95-142` (یافتهٔ API-01، P0)**
- پرسش: آیا جریان «Gemini Spark» (توکن دسترسی گوگل → نشست Firebase) باید بماند؟
- گزینه (الف) فقط `verifyFirebaseIdToken`/`firebase-admin verifyIdToken` پذیرفته شود و مسیرهای ۲ و ۳ حذف شوند → بک‌دور P0 بسته می‌شود؛ جریان مستندشده در کامنت `:123` می‌شکند و تست موجود `api/api.test.ts:241-271` هم باید بازنویسی شود.
- گزینه (ب) مسیرهای گوگل با allow-list از `GOOGLE_CLIENT_ID`های مورد اعتماد + بررسی `aud` + `email_verified` محدود و پیش‌فرض غیرفعال → جریان حفظ می‌شود؛ نیازمند فهرست دقیق client-idها و تست رگرسیون؛ خطای پیکربندی = بازگشت همان بک‌دور.
- گزینه (ج) بدون تغییر → هر توکن دسترسی گوگل از هر اپ/پروژه با `accounts:signInWithIdp` روی API Key عمومی به نشست کامل Firebase تبدیل می‌شود ⇒ تصاحب حساب.

**OWNER-FASTAPI — آیا سرویس `backend/**` (FastAPI + MongoDB) در تولید مستقر است؟ (API-17 و اثر بر API-03/18/21/22/30/32)**
- پرسش: `ARSH_API_BASE_URL`/`VITE_ARSH_API_URL` در Vercel مقدار دارد؟
- گزینه (الف) بله، مستقر است → یافته‌های ۳، ۱۷، ۱۸، ۲۱، ۲۲، ۳۰، ۳۲ همه زنده‌اند و باید طبق بخش ۴-۳ رفع شوند؛ برای API-03 باید `ARSH_API_BASE_URL` معتبر بماند.
- گزینه (ب) خیر، بازنشسته شده → کوتاه‌ترین مسیر: حذف پوشهٔ `backend/`، حذف مرحلهٔ `legacy-attachments` و حذف `frontend/src/lib/weather.ts` — **تصمیم مالک برای حذف فیچر هواشناسی/گالری لازم است**.
- گزینه (ج) نامعلوم → فعلاً فقط اصلاحات کم‌ریسک (API-21/30/32) انجام شود و API-03/18 مسدود بماند.

**OWNER-RULES-DEPLOY — کانال استقرار قواعد (API-05)**
- پرسش: قواعد با CI deploy شوند یا دستی؟
- گزینه (الف) CI با Firebase CLI و سرویس‌اکانت → قواعد قابل بازتولید و محافظت‌شده؛ نیازمند راز جدید در CI.
- گزینه (ب) اسکریپت مستند `npm run deploy:rules` و اجرای دستی → کم‌هزینه؛ وابسته به انضباط انسانی. (اگر این انتخاب شود، `firebase.json` فعلی باید بماند.)
- گزینه (ج) بدون تغییر → یافتهٔ API-02 در تولید بی‌اثر می‌ماند؛ قواعد واقعی پروژهٔ `gen-lang-client-0845891098` از مخزن قابل اثبات نیست (وضعیت: UNVERIFIABLE-FROM-REPO).

**OWNER-CORS — مبدأهای مجاز در `api/_lib/response.ts:12,27` (بخش CORS یافتهٔ API-13)**
- پرسش: `*` بماند یا allow-list؟
- گزینه (الف) `*` بماند → هر سایتی با توکن به‌دست‌آمده می‌تواند درخواست کامل بزند و پاسخ را بخواند.
- گزینه (ب) allow-list: دامنهٔ خودتان + `capacitor://localhost` + `https://localhost` → سطح حملهٔ مرورگری کم می‌شود؛ هر مبدأ دیگر (پیش‌نمایش Vercel، دامنهٔ سفارشی، ابزار بیرونی) ۴۰۳ می‌گیرد و باید فهرست شود.

**OWNER-GITHISTORY — blob ۳۵MB بایگانی APK در تاریخ (یافتهٔ API-10)**
- پرسش: تاریخ بازنویسی شود؟
- گزینه (الف) blob بماند → هر clone کامل ۳۵MB را می‌گیرد؛ توکن‌های باقی‌مانده در APK دیباگ قدیمی قابل استخراج‌اند.
- گزینه (ب) `git filter-repo` (یا `commit --amend` روی `b1e9d0b`) + force-push → مخزن سبک و پاک؛ clone/PR و بازمانده‌های محلی دیگران می‌شکند. **هرگز بدون تأیید صریح مالک انجام نده.**

**OWNER-SIGN — کلید امضای Android (مرتبط با API-24/API-10)**
- پرسش: `KEYSTORE_PATH` در محیط بیلد وجود دارد؟
- گزینه (الف) بله → API-10/API-24 اجرا شوند (assembleRelease + حذف مسیر پیش‌فرض).
- گزینه (ب) خیر → بیلد release شکست می‌خورد؛ فقط ignore کردن `*.jks`/`*.keystore` انجام شود.

**OWNER-ALLOWBACKUP — `AndroidManifest.xml:5` (بخش مالک یافتهٔ API-23)**
- گزینه (الف) `allowBackup="false"` → نشست Firebase و دادهٔ محلی از بکاپ/انتقال خارج می‌شوند؛ کاربر با تعویض دستگاه دادهٔ محلی (نه ابری) را از دست می‌دهد.
- گزینه (ب) `allowBackup="true"` + مستثنا کردن `app_webview`/`databases`/`shared_prefs` در هر دو فایل قواعد بکاپ → پیکربندی پیچیده‌تر؛ احتمال باقی‌ماندن مسیر نشت در نسخه‌های آیندهٔ Capacitor.

**OWNER-ROBOTS — محتوای `frontend/public/robots.txt:13-14`**
- گزینه (الف) `Disallow: /app/` و `/api/` + هدر `X-Robots-Tag: noindex` → حریم خصوصی بهتر؛ امکان ایندکس‌شدن صفحهٔ معرفی/نصب از بین می‌رود.
- گزینه (ب) وضع فعلی (`Allow: /`) → پوستهٔ عمومی اپ شخصی سلامت روان/دفتر خاطرات ایندکس می‌شود.

**OWNER-SIGNOUT — پاک‌سازی دادهٔ دستگاه در خروج از حساب (CODE-32)**
- کد فعلی هیچ پاک‌سازی‌ای نمی‌کند (`hooks/useAuth.tsx:104-108`) و `clearUserLocalData` فقط دستی از `pages/SettingsView.tsx:693` اجرا می‌شود.
- گزینه (الف) اجرای `clearUserLocalData(previousUid)` در `handleSignOut` **پس از تأیید کاربر** → نشتی حریم خصوصی بسته می‌شود؛ اگر صف آفلاین همگام‌نشده باشد، تغییرات محلی از بین می‌رود.
- گزینه (ب) پاک‌سازی در ورود کاربر جدید وقتی uid عوض شده → بدون تأخیر خروج؛ همان ریسک از‌دست‌رفتن صف.
- گزینه (ج) پذیرش وضعیت فعلی → کش‌ها با uid کلید خورده‌اند و به کاربر بعدی نشان داده نمی‌شوند، ولی داده روی دستگاه می‌ماند.

**OWNER-SHADOW — بازگرداندن سایه‌ها (DESIGN-15)**
- `tailwind.config.ts:52-56` مقادیر `2xs/xs/sm/DEFAULT/md` همه `none` هستند و ۲۰۹ بار استفاده می‌شوند (`shadow-xs` ۸۷، `shadow-sm` ۶۹، `shadow-md` ۳۴، `shadow-2xs` ۱۹).
- گزینه (الف) بازگرداندن مقادیر واقعی → کل اپ عمق می‌گیرد ولی ظاهر سراسری عوض می‌شود = بازطراحی طبق `plan/plan.md:58-60` (ممنوع بدون تأیید).
- گزینه (ب) فقط یک توکن (`lg`/`xl` که به `var(--shadow-float)` نگاشت شده) برای دیالوگ/شیت تقویت شود و `2xs..md` خنثی بمانند → تغییر محدود به لایه‌های شناور.
- گزینه (ج) بدون تغییر → کارت‌ها مسطح و شلوغ می‌مانند.

**OWNER-MOBILEHEADER — سرصفحهٔ موبایل اشباع (DESIGN-01، P0)**
- گزینه (الف) کمینهٔ غیربازطراحی: فقط شمارندهٔ «x از y تکمیل‌شده» (`TodayDashboardView.tsx:604-608`) در `<sm` پنهان شود (همان اطلاع در فهرست دیده می‌شود) و دکمهٔ رنگ صفحه با `hidden sm:flex` به ≥sm منتقل شود؛ ساختار سرصفحه و ترتیب دکمه‌ها دست‌نخورده.
- گزینه (ب) انتقال یکی از چهار کنترل سراسری (رنگ/جستجو/تم/AI) به منوی «…» یا تنظیمات → تصمیم محصولی، ساختار سرصفحه تغییر می‌کند.
- گزینه (ج) بدون تغییر → در ۳۶۰px تیتر بریده می‌شود و دکمه‌ها به هم می‌چسبند.

**OWNER-DEADFILES — حذف فایل‌های مردهٔ وابسته به تست (DESIGN-22)**
- گزینه (الف) حذف `WindowsFluentBar.tsx`، `FoldableAdaptiveBar.tsx`، `DesktopFloatingDock.tsx`، `AdaptiveNavigation.test.tsx` و dispatch بی‌شنوندهٔ `BottomTabBar.tsx:78` → ۶۶۸ خط و یک تست حذف می‌شود؛ **اگر مالک رندر این نوارها را در آینده بخواهد، کد از دست می‌رود** (تست `AdaptiveNavigation.test.tsx:5-6` تنها ارجاع‌دهنده است).
- گزینه (ب) نگه‌داشتن فایل‌ها و فقط حذف dispatch بی‌شنونده → بدون ریسک از‌دست‌رفتن قابلیت؛ کد مرده می‌ماند.
- گزینه (ج) وضع فعلی → ادامهٔ کد مرده.
- **مرتبط:** OWNER-ISLAND — حذف `components/island/IslandScene.tsx` و `IslandAlbum.tsx` (CODE-20) در حالی که `lib/island.ts` هنوز از `hooks/useAuth.tsx:61` (`startIslandCloudSync`) زنده است. پرسش: قابلیت «جزیره» برمی‌گردد (و یک مسیر واقعی در `App.tsx` می‌گیرد) یا کامل حذف شود (شامل `lib/island.ts` و sync آن)؟

**OWNER-RAILSETTINGS — پیچیدگی ۵۹۶ خطی تنظیمات ریل (DESIGN-20)**
- گزینه (الف) کمینهٔ غیربازطراحی: حذف برچسب‌های `#{orderIndex}` (`SidebarQuickLinksSettings.tsx:212,578`) + متن راهنمای کوتاه؛ ساختار دو فهرست حفظ می‌شود.
- گزینه (ب) ادغام «فعال» و «کاتالوگ» → بازآرایی بصری در تنظیمات (نیازمند تأیید).
- گزینه (ج) پذیرش وضعیت فعلی و علامت «پذیرفته‌شده» روی یافته.

**تصمیم‌های اختیاری کوچک (اگر مالک نخواهد، «پذیرفته‌شده» علامت بخورد):** DESIGN-24 (افزودن یک ردیف سایدبار برای «اشتراک‌شده‌ها») و DESIGN-22 (حذف نوارهای ویندوز/تاشو).

---

## ۶. تقسیم کار پیشنهادی (۵ بسته + پنجرهٔ پایانی)

**قاعدهٔ انحصار:** هر فایل دقیقاً یک نویسنده دارد. فهرست‌های زیر انحصاری‌اند؛ اگر بسته‌ای به فایلی خارج از فهرستش نیاز داشت، درخواست را به نویسندهٔ آن فایل بدهد.

### بستهٔ ۱ — داده و منطق کد (پایهٔ همه)
- **شناسه‌ها:** CODE-03, CODE-08, CODE-10, CODE-12, CODE-13, CODE-14, CODE-15, CODE-16, CODE-17, CODE-18, CODE-19, CODE-24, CODE-25, CODE-26, CODE-27, CODE-28, CODE-29, CODE-31
- **فایل‌های انحصاری:** `frontend/src/lib/{reminders,firebaseStore,recurringTaskService,timeBuckets,firestoreSync,leitnerService,nlDate}.ts` و تست‌های همان‌ها، `frontend/src/components/{RemindersRunner,TaskDetail,FirebaseSyncCard,FolderAIChat}.tsx`، `frontend/src/components/knowledge/PharmacyImageViewer.tsx`، `frontend/src/hooks/useAuth.tsx`
- **دستور پذیرش:** `cd frontend && npx vitest run src/lib/reminders.test.ts src/lib/firebaseStore.test.ts src/lib/recurringTaskService.test.ts src/lib/timeBuckets.test.ts src/lib/firestoreSync.test.ts src/lib/leitnerService.test.ts src/lib/nlDate.test.ts && npm run typecheck`
- **ترتیب وابستگی:** CODE-15 (`insert`) **قبل از** CODE-03 (که به نتیجهٔ `insert` تکیه می‌کند)؛ CODE-13/CODE-14 هر دو در `firebaseStore` و پشت‌سرهم؛ CODE-19 (اجرای کامل) در **پایان** این بسته اجرا شود.

### بستهٔ ۲ — سطح تسک و UI
- **شناسه‌ها:** DESIGN-07, DESIGN-08, DESIGN-09, DESIGN-10, DESIGN-11, DESIGN-12, DESIGN-13, DESIGN-14, DESIGN-23, DESIGN-26, DESIGN-27, DESIGN-28, DESIGN-29, DESIGN-30, DESIGN-32, DESIGN-35, DESIGN-36
- **فایل‌های انحصاری:** `frontend/src/pages/TodayDashboardView.tsx`، `frontend/src/pages/TasksView.tsx`، `frontend/src/pages/PlanningView.tsx`، `frontend/src/pages/NotesView.tsx`، `frontend/src/components/TaskListItem.tsx`، `frontend/src/components/TaskActionSheet.tsx`، `frontend/src/components/TaskFilterSheet.tsx`، `frontend/src/components/ListViewSwitch.tsx`، `frontend/src/components/SelectionActionToolbar.tsx`، `frontend/src/components/KeyboardShortcutsDialog.tsx`، `frontend/src/components/task-detail/{TaskMetaBar,MetaTile}.tsx`، `frontend/src/pages/tasks/{TasksHeader,QuickAddTask}.tsx`، تست‌های همان‌ها، و فایل جدید `frontend/src/components/StickyQuickAdd.tsx`
- **دستور پذیرش:** `cd frontend && npx vitest run src/components/TaskListItem.test.tsx src/components/TaskActionSheet.test.tsx src/components/task-detail/TaskMetaBar.test.tsx src/pages/TasksView.test.tsx && npm run typecheck`
- **ترتیب وابستگی:** مستقل از بستهٔ ۱؛ **مراقب:** `frontend/src/index.css` مال بستهٔ ۵ است (DESIGN-10/DESIGN-32 نباید آن را لمس کنند).

### بستهٔ ۳ — API، امنیت و استقرار
- **شناسه‌ها:** API-03, API-04, API-05(زیرساخت تست), API-07, API-08, API-09, API-10, API-11, API-12, API-13, API-14, API-15, API-16, API-18, API-20, API-21, API-22, API-23(بخش غیرمالک), API-24, API-25, API-26, API-27, API-28, API-29, API-30, API-31, API-32, API-33(بخش `.gitconfig`) + CODE-22 + تمام بخش ۷
- **فایل‌های انحصاری:** `api/**`، `backend/**`، `vercel.json`، `.github/**`، `.gitignore`، `.gitconfig` (فقط `git rm --cached`)، `firebase.json`، `frontend/rules-tests/**`، `frontend/vitest.api.config.ts`، **`frontend/package.json`**، **`frontend/package-lock.json`**، `test_reports/**`، `frontend/android/**`، `build-android-apk.bat`، `frontend/public/robots.txt`
- **دستور پذیرش:** `npm ci` (ریشه) سپس `cd frontend && npm ci && npm run test:api && npm run typecheck`
- **ترتیب وابستگی:** (۱) بخش ۷ (test:rules) → (۲) API-08 (هلپر timeout) → (۳) API-11/12/14/15/16 → (۴) API-03/04 → (۵) CODE-22 (حذف وابستگی‌ها) **آخرین گام** تا نصب‌های میانی lock را جابه‌جا نکنند. API-23 قسمتی و API-25 نیازمند بیلد اندروید است؛ اگر گرادل در دسترس نیست، فقط کد را تغییر بده و در گزارش بنویس «تأیید بیلد انجام نشد».

### بستهٔ ۴ — ناوبری و i18n
- **شناسه‌ها:** DESIGN-04, DESIGN-05, DESIGN-16(بخش هشدار), DESIGN-19, DESIGN-21, DESIGN-24, DESIGN-25, DESIGN-31(بخش tsx)
- **فایل‌های انحصاری:** `frontend/src/components/CommandPalette.tsx`، `frontend/src/components/sidebar/**`، `frontend/src/components/AppSidebar.tsx`، `frontend/src/components/BottomTabBar.tsx`، `frontend/src/lib/sidebarQuickLinks.ts`، `frontend/src/lib/mobileBottomBarSettings.ts`، `frontend/src/pages/SettingsView.tsx`، `frontend/src/pages/settings/{SidebarQuickLinksSettings,MobileBottomBarSettings,AppearanceSettingsSection}.tsx`، تست‌های همان‌ها
- **دستور پذیرش:** `cd frontend && npx vitest run src/pages/SettingsView.test.tsx src/components/CommandPalette.test.tsx src/components/sidebar && npm run typecheck` (اگر نام تست دیگری بود، همان پوشه را هدف بگیر)
- **ترتیب وابستگی:** DESIGN-04 **پیش از** DESIGN-05 و DESIGN-21 (منبع واحد ناوبری، منبع آیکن‌ها) تا دوباره‌کاری نشود.

### بستهٔ ۵ — پاک‌سازی و CSS (+ پنجرهٔ پایانی)
- **شناسه‌ها:** CODE-20, DESIGN-17, DESIGN-34 + **پنجرهٔ پایانی:** DESIGN-18، پیمایش DESIGN-31 (hexها)، مهاجرت اختیاری DESIGN-16
- **فایل‌های انحصاری:** `frontend/src/index.css`، `frontend/src/components/knowledge/LessonCardLayout.css`، `frontend/src/pages/GardenView.css`، `frontend/src/pages/DailyDiaryView.css`، `frontend/src/components/island/island.css`، `frontend/src/components/AngelCompanion.css`، `frontend/src/components/island/{IslandScene,IslandAlbum}.tsx`، و **در پنجرهٔ پایانی فقط** فایل‌های DESIGN-18
- **دستور پذیرش:** `cd frontend && npm run typecheck && npx vite build` (exit 0)
- **ترتیب وابستگی:** DESIGN-18 و پیمایش‌های سراسری **فقط پس از توقف کامل بسته‌های ۱، ۲ و ۴** اجرا شوند (وگرنه ویرایش هم‌زمان همان فایل‌ها). بیلد فقط یک‌بار و در همین بسته اجرا شود.

**فایل‌هایی که باید دقیقاً یک نویسنده داشته باشند (جدول سریع):**

| فایل | نویسندهٔ انحصاری |
|---|---|
| `frontend/src/index.css` | بستهٔ ۵ |
| `frontend/package.json` + `frontend/package-lock.json` | بستهٔ ۳ |
| `frontend/src/hooks/useAuth.tsx` | بستهٔ ۱ |
| `frontend/src/components/TaskDetail.tsx` | بستهٔ ۱ |
| `frontend/src/lib/firestoreSync.ts` / `firebaseStore.ts` | بستهٔ ۱ |
| `frontend/src/components/TaskListItem.tsx` | بستهٔ ۲ |
| `frontend/src/pages/{TasksView,TodayDashboardView}.tsx` | بستهٔ ۲ |
| `frontend/src/components/TaskFilterSheet.tsx` | بستهٔ ۲ |
| `frontend/src/pages/SettingsView.tsx` | بستهٔ ۴ |
| `frontend/src/components/CommandPalette.tsx` | بستهٔ ۴ |
| `vercel.json` / `firebase.json` / `frontend/rules-tests/**` | بستهٔ ۳ |

---

## ۷. کارهای نیمه‌تمام از دور سوم (مهم — اول این را تعیین‌تکلیف کن)

در جریان دور سوم، دو فایل جدید ساخته شد و یک اسکریپت نیمه‌کاره ماند. **وضعیت دقیقاً این است:**

| مورد | وضعیت واقعی | شاهد |
|---|---|---|
| `firebase.json` در ریشهٔ مخزن | **ساخته شده و درست است**: `{"firestore":{"rules":"firestore.rules"},"storage":{"rules":"storage.rules"}}` | محتوای فایل (۱۰۵ بایت)، mtime ۲۳:۳۵ |
| `frontend/rules-tests/vitest.config.ts` | **ساخته شده**: `environment: "node"`، `include: ["rules.test.ts"]`، با کامنت «static invariants… dependency-free» | محتوای فایل، mtime ۲۳:۳۵ |
| `frontend/rules-tests/rules.test.ts` | **وجود ندارد** (`Test-Path` = False) | بررسی مستقیم |
| `firebase-tools` | **نصب نیست** و در `frontend/package.json` هم نیست (grep صفر) | بررسی مستقیم |
| `frontend/package.json` → `test:rules` | `GCE_METADATA_HOST=0.0.0.0 firebase emulators:exec --only firestore --project demo-arshnaz-rules --config firebase.emulator.json "vitest run --config rules-tests/vitest.config.ts --reporter=verbose"` | `frontend/package.json:15` |
| `frontend/firebase.emulator.json` | **وجود ندارد**؛ فایل فقط در ریشهٔ مخزن است (`Arshiam/firebase.emulator.json`) | `Test-Path` = False |
| نتیجه | چون اسکریپت از پوشهٔ `frontend/` اجرا می‌شود، هم `firebase` CLI غایب است، هم `--config firebase.emulator.json` پیدا نمی‌شود، و هم فایل تست وجود ندارد ⇒ **`npm run test:rules` قطعاً شکست می‌خورد** | جمع سه شاهد بالا |
| یادداشت جانبی | کامنت همان `vitest.config.ts` به `arshnaz-audit/round3-api.md` ارجاع می‌دهد که **وجود ندارد** (فهرست پوشهٔ `arshnaz-audit/` آن را ندارد) | `Get-ChildItem arshnaz-audit` |

**دو راه پیش رو — یکی را انتخاب و کامل کن (نیمه‌کاره رها نکن):**

1. **تمام‌کردن (توصیه‌شده، ارزان):** `frontend/rules-tests/rules.test.ts` را بساز با تست‌های **بدون وابستگی** (همان‌طور که کامنت خود کانفیگ می‌گوید) — مثلاً: (الف) `firebase.json` واقعاً به `firestore.rules` و `storage.rules` اشاره می‌کند و هر دو فایل موجودند؛ (ب) فهرست مستثناهای `match /{subcollection}/{docId=**}` در `firestore.rules` شامل `module_access`, `user_roles`, `assistant_grants`, `assistant_audit`, `assistant_trash`, `cycle_*` است (پارس متنی، نه امولاتور)؛ (ج) هیچ `allow write` سطح‌بالا برای `module_access` وجود ندارد. سپس خط `test:rules` را به `vitest run --config rules-tests/vitest.config.ts` تغییر بده (بدون `firebase emulators:exec`)؛ اگر مسیر امولاتور هم لازم است، `--config ../firebase.emulator.json` را در یک اسکریپت جدا (`test:rules:emulator`) نگه دار و `firebase-tools` را فقط اگر مالک تأیید کرد به `devDependencies` اضافه کن (قاعدهٔ ۳). ارجاع کهنه به `round3-api.md` را هم اصلاح یا حذف کن.
2. **بازگرداندن:** حذف `frontend/rules-tests/` و خط `test:rules` از `frontend/package.json` — **اما `firebase.json` را حذف نکن** (برای API-05 و کانال استقرار قواعد لازم است؛ بخش ۵ — OWNER-RULES-DEPLOY). این گزینه را فقط اگر مالک کل مسیر تست قواعد را رد کرد انتخاب کن.

**پذیرش نهایی این بخش:** `cd frontend && npm run test:rules` → خروج ۰ (بدون نیاز به Firebase CLI و بدون نیاز به emulator)، و هیچ ارجاع مرده‌ای در کانفیگ نماند.

---

## ۸. دروازهٔ پایانی (تعریف «تمام‌شده»)

پس از بستن همهٔ موارد بخش ۴ (به‌جز موارد بخش ۵)، همهٔ موارد زیر باید هم‌زمان برقرار باشند:

1. **همهٔ موارد غیرمالک بسته شده‌اند** و برای هرکدام شاهد داری: diff فایل + خروجی دستور پذیرش. موارد بخش ۵ صریحاً «منتظر تصمیم مالک» علامت خورده باشند (نه «انجام‌شده»).
2. **بخش ۷ تعیین‌تکلیف شده** (`npm run test:rules` یا سبز است یا مسیر «بازگرداندن» رسماً اجرا و مستند شده).
3. `cd frontend && npm run typecheck` → **exit 0**.
4. `cd frontend && npm run lint` → **۰ خطا** و **بدون هشدار جدید** نسبت به خط پایهٔ ۱۲۴ هشدار. اگر تعداد کاهش یافت، عدد جدید را ثبت کن.
5. `cd frontend && npm run test:api` → **۸۵/۸۵ سبز** (و اگر API-27 تست جدید اضافه کرد، عدد جدید ثبت شود).
6. `cd frontend && npm test` (تک‌پروسه، بدون هیچ اجرای موازی) → خط پایهٔ امروز **صفر شکست شناخته‌شده** در ۲۲۶ فایل / ۱۴۳۹ تست است؛ پس هر شکستی باید یا رفع شود یا (در صورت اثبات flaky بودن) مستند گردد. اختلاف‌ها را دانه‌دانه توضیح بده (کدام تست، چرا).
7. `cd frontend && npx vite build` → **exit 0** و precache حدود **۲۰۶ ورودی / ۷۶۶۱KiB** بماند (رشد بی‌دلیل = شکست؛ و `ort-wasm` ۲۵.۶MB نباید وارد precache شود).
8. **`arshnaz-audit/ARSHNAZ-AUDIT-FA.md` به‌روزرسانی شود**: بخش ۰ (کارهای انجام‌شده) با ردیف‌های دور سوم، جدول بخش ۱ (سلامت پروژه) با اعداد جدید، و بخش ۸ (نقشهٔ راه) با وضعیت هر بسته. همچنین اگر یافته‌ای رفع شد، در `ARSHNAZ-AUDIT-FA.md` و در صورت لزوم در فایل‌های `status-*.md` علامت بخورد.
9. **هیچ فایل مخزن در وضعیت «نیمه‌کاره» نماند** (نه کانفیگ بدون تست، نه اسکریپت بدون وابستگی، نه تست بدون اجرا).
10. در گزارش نهایی، فهرست «آنچه انجام نشد و چرا» صریح باشد (موارد مالک، موارد وابسته به بیلد اندروید، موارد وابسته به محیط Vercel).

---

## ۹. دام‌ها

1. **دو `package-lock.json`**: ریشه (`firebase-admin` برای توابع `api/`) و `frontend/`. `npm ci` را باید در **هر دو** مسیر جدا اجرا کنی. حذف/جابه‌جایی هیچ‌کدام ممنوع. `frontend/.npmrc` مقدار `legacy-peer-deps=true` دارد — دست نزن.
2. **کنسول PowerShell خروجی فارسی را mojibake می‌کند** (نمونهٔ واقعی: کامنت `.gitignore:91` در کنسول `â€”` دیده می‌شود ولی فایل سالم است؛ همچنین `typecheck.txt` فارسی را درست نشان می‌دهد). قبل از گزارش «فایل خراب است»، فایل را با ابزار `read` بخوان، نه با خروجی کنسول.
3. **`git` دربارهٔ LF/CRLF هشدار می‌دهد** (`LF will be replaced by CRLF`) — این نویز است، خطا نیست. با `git -C <repo> ...` کار کن چون cwd ممکن است مخزن نباشد.
4. **ادیتور/آنتی‌ویروس می‌تواند هنگام replace خطای Win32 1175 بدهد** (فایل قفل/جابه‌جا شده). راه‌حل: فایل را دوباره بخوان و همان ویرایش را تکرار کن؛ ویرایش را دوباره از صفر نساز.
5. **`frontend/dist/` حدود ۴۸.۱MB است** و **`ARSHNAZ-debug.apk` (۳۵٬۰۹۶٬۰۵۸ بایت) هنوز روی دیسک است ولی ردیابی‌نشده** (`.gitignore:31` و `.gitignore:85` پوشش می‌دهند). آن‌ها را commit نکن؛ حذف فیزیکی فقط با تأیید مالک (بخش ۵ — OWNER-GITHISTORY).
6. **`ort-wasm-simd-threaded.asyncify.wasm` (۲۵.۶MB در `frontend/dist`)** lazy است و هرگز در precache نبوده؛ هیچ تغییری در `vite.config.ts:152` نده که آن را وارد `globPatterns` کند، و `maximumFileSizeToCacheInBytes` را بالا نبر.
7. **تست کامل را موازی اجرا نکن**: `maxWorkers: 2`/`minWorkers: 2` است (`frontend/vitest.config.ts:10-11`) و بیلد ~۹ دقیقه طول می‌کشد. اگر `arshnaz-audit/tests-round3-pre-push.txt` در حال نوشته‌شدن است (پروسهٔ `node` فعال)، **صبر کن**.
8. **`testTimeout: 30_000` را کاهش نده** و آن را بهانهٔ «سبزکردن» تست‌های منطقی نکن؛ آن فقط تایم‌اوت‌های ذاتی سه فایل سنگین Knowledge را می‌پوشاند.
9. **درخت کاری ممکن است کثیف باشد** (۷۹ ورودی در لحظهٔ نوشتن این سند). پیش از هر `git checkout`/`git stash`/`git clean` مطمئن شو کارهای دور ۱–۳ را از دست نمی‌دهی.
10. **مسیرهای `arshnaz-audit/*` خارج از مخزن‌اند** — فایل‌های شاهد، ابزار و همین سند در `default-workspace/arshnaz-audit/` هستند و در `git status` مخزن دیده نمی‌شوند؛ آن‌ها را داخل مخزن کپی نکن.
