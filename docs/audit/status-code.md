# وضعیت ۳۲ یافتهٔ `code-bugs.md` در درخت کاری فعلی

**مخزن:** `Arshiam` — HEAD `b1e9d0b` + تغییرات uncommitted (۳۶ فایل ویرایش‌شده، ~۴۰ فایل/مسیر حذف‌شده، ۳ فایل جدید: `frontend/vitest.api.config.ts`، `firebase.json`، `frontend/rules-tests/`).
**روش:** `git diff`/`git status` + خواندن ناحیهٔ ارجاع در فایل فعلی + grep نماد + دو اجرای واقعی (`npm run typecheck`، اجرای هدفمند vitest). هیچ فایلی در مخزن تغییر نکرد (تنها خروجی این ممیزی همین فایل است).
**قید مسیر:** مسیرها نسبت به `Arshiam/frontend/src/` هستند مگر با پیشوند `frontend/` یا `api/` ذکر شود. شماره‌خط‌ها مربوط به همین درخت کاری‌اند.
**هشدار درخت متحرک:** در جریان همین ممیزی (۲۳:۳۳–۲۳:۳۵) فایل‌های `frontend/vitest.config.ts` (`testTimeout: 30_000`)، `firebase.json` و `frontend/rules-tests/vitest.config.ts` توسط عامل دیگری اضافه/ویرایش شدند؛ داوری بند ۱۹ بر پایهٔ همین وضعیت جدید است. بقیهٔ بندها به این سه فایل وابسته نیستند.
**اثر انگشت وضعیت داوری:** `git diff HEAD | git hash-object --stdin` = `aff61a082cf531748521351bb23c76ca66e1f7da` (لحظهٔ پایان ممیزی؛ ۷۹ سطر در `git status --porcelain`).

**راهنمای وضعیت‌ها:** `FIXED` = رفع‌شده · `PARTIAL` = جزئی · `OPEN` = باز · `NEEDS-OWNER-DECISION` = نیازمند تصمیم مالک · `REFUTED` = ردشده (ادعای اولیه نادرست).

---

## (الف) جدول وضعیت ۳۲ یافته

| # | عنوان کوتاه | وضعیت | شاهد (file:line + snippet کوتاه) |
|---|---|---|---|
| ۱ | نوشتن وضعیت ابری بدون بررسی نسخه | FIXED | `lib/cloudStateSync.ts:48-53` — `await runTransaction(db, async (transaction) => { const snap = await transaction.get(ref); … if (remoteAt > local.updatedAt) {` و `:75` `transaction.set(ref, { updatedAt: local.updatedAt, … })`؛ نسخهٔ جدیدتر بازنویسی نمی‌شود بلکه adopt می‌شود (`:93-97`) و `lib/todayPlanning.ts:139` سیاست `reconcilePending` دارد. |
| ۲ | تخریب `data-checked` در ریست چک‌باکس | FIXED | `lib/recurringTaskService.ts:91` — `updated.replace(/<input\b([^>]*?)\schecked(?:="[^"]*")?([^>]*?)>/gi, "<input$1$2>")` (وجود `\s` دیگر `data-checked` را نمی‌بلعد) + تست `lib/recurringTaskService.test.ts:102-107`: `expect(result).toContain('data-checked="false"')`. خود گزارش (`ARSHNAZ-AUDIT-FA.md:246`) شدت P1 این بند را رد کرده بود. |
| ۳ | تسک تکراری چک‌این روزانه | OPEN | `lib/reminders.ts:366` — `.gte("created_at", startOfDay.toISOString());` سپس `:367` `const existingTitles = new Set((existing \|\| []).map((t: any) => t.title));`؛ `:381` `await firebaseStore.from("tasks").insert(toInsert);` (نتیجه بررسی نمی‌شود) و `:383` `localStorage.setItem(LAST_TASK_KEY, today);` بی‌قید. |
| ۴ | رد شدن ذخیره/حذف با ConcurrentEditError | FIXED | `lib/firestoreDataService.ts:236` — `if (typeof expected === "string" && typeof remoteRevision === "string" && remoteRevision !== expected) { throw new ConcurrentEditError(); }` و `:258` همان قاعده در `deleteWithRevision`. |
| ۵ | typecheck/build شکسته | REFUTED | اجرای واقعی همین حالا: `npm run typecheck` → `[exit code: 0]`؛ و `lib/taskSchedulePhaseZero.test.ts:3` اکنون `import { scheduleWrite, taskDayOf } from "../../../api/_lib/taskSchedule";` (ماژول خالص؛ هیچ importی از `api/_lib/assistantAccess` در `frontend/src` نمانده — grep). گزارش خودش در `ARSHNAZ-AUDIT-FA.md:247` این ادعا را رد کرده بود («شکنندگی محیطی، نه build شکسته»). |
| ۶ | استثنای ویجت، fetch موفق را باطل می‌کند | FIXED | `features/tasks/taskService.ts:117` — `void Promise.resolve(syncAndroidWidget(tasks, userId)).catch(() => {});` (و `:127` در مسیر کش)؛ `lib/androidWidget.ts:93` `export async function syncAndroidWidget(…)` است، پس خطای همگام ممکن نیست. تست‌های `features/tasks/taskService.test.ts` در اجرای هدفمند همین ممیزی سبز شدند (بخش «و»: ۱۵۸/۱۵۹ سبز، صفر شکست در این فایل). |
| ۷ | لیسنرهای Firestore بسته نمی‌شوند | FIXED | `lib/firestoreLive.ts:48` — `entry.unsubscribe = onSnapshot(` (هندل نگه داشته می‌شود) + `:104-110` `export function stopLiveListeners(): void { for (const entry of registry.values()) { try { entry.unsubscribe(); } … registry.clear(); }`؛ فراخوانی در `hooks/useAuth.tsx:66` `if (!user?.id) stopLiveListeners();`. (باقیماندهٔ کوچک: جابه‌جایی مستقیم uid بدون عبور از حالت خروج.) |
| ۸ | ورودی صف بدون مالک | PARTIAL | `components/TaskDetail.tsx:568` هنوز `await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: current.id } });` بدون `user_id`/`expectedRevision`؛ اما مسیر اصلی حالا احراز‌هویت‌شده است: `:550-554` `if (user) { … await persistTask(user.id, { id: current.id, ...patch }) }` و شاخهٔ صف فقط وقتی `!user` است اجرا می‌شود (`:525` `if (!canEdit) return "failed";` + `hooks/useShareAccess.ts:35`). |
| ۹ | fail-open در بررسی نسخه | FIXED | `lib/firestoreSync.ts:243-247` — `if (remoteData === undefined) { const serverSnapshot = await getDoc(docRef); remoteData = serverSnapshot.exists() ? serverSnapshot.data() : null; }` + `:268-270` `console.warn(…refusing the write…)` و `return "failed"` (fail-closed). |
| ۱۰ | streak بر پایهٔ روز UTC | OPEN | `lib/leitnerService.ts:428` — `reviewDates.add(c.last_reviewed_at.slice(0, 10));` و `:435` `const key = checkDate.toISOString().slice(0, 10);` (و `:443` همان) — بدون `toLocalISO`. |
| ۱۱ | `isAdmin` همیشه false | FIXED | `hooks/useUserRole.tsx:19-20` — `await auth.authStateReady(); const tokenResult = await auth.currentUser?.getIdTokenResult();` (شیء واقعی Firebase، نه `AppUser`). |
| ۱۲ | `localStorage.setItem` بدون محافظ | OPEN | `lib/reminders.ts:309` `localStorage.setItem(FIRED_TASKS_KEY, JSON.stringify(fired));` و `:340` `localStorage.setItem(LAST_NOTIFY_KEY, JSON.stringify(stored));` بدون `try/catch`؛ و `components/RemindersRunner.tsx:51,58` `tick();` بدون `.catch()`. |
| ۱۳ | fallback به اسکن کل کالکشن | OPEN | `lib/firebaseStore.ts:182-186` — `} catch (queryErr) { // Fallback: If composite index missing or query incompatible… snapshot = await getDocs(colRef); hasClientOnlyFilter = true; }` (همهٔ خطاها یکسان دیده می‌شوند). |
| ۱۴ | `.in()` با بیش از ۱۰ مقدار | OPEN | `lib/firebaseStore.ts:151-156` — `if (filter.value.length > 0 && filter.value.length <= 10) { constraints.push(fsWhere(filter.field, "in", filter.value)); } else { hasClientOnlyFilter = true; }` (بدون chunking). |
| ۱۵ | `insert` عملاً upsert است | OPEN | `lib/firebaseStore.ts:238` — `private async write(input: Row \| Row[], _merge: boolean, onConflict?: string)` (پارامتر `_merge` هرگز خوانده نمی‌شود) و `:281` `await setDoc(doc(db, "users", userId, this.table, id), row, { merge: true });`. |
| ۱۶ | یک زیرتسک حذف‌شده کل تکمیل را می‌بندد | OPEN | `lib/recurringTaskService.ts:297` — `if (snapshots.some(snapshot => !snapshot.exists())) throw new Error("Recurring task changed before it could be advanced");` (شامل زیرتسک‌ها). |
| ۱۷ | حالت strict تسک‌های تاریخ‌دار را پنهان می‌کند | OPEN | `lib/timeBuckets.ts:241` `if (!hierarchical \|\| (options.selectedBucketKinds && options.selectedBucketKinds.length > 0)) { … :255 return { matches: false, matchReason: "none" }; }` — بررسی «تاریخ دقیق» بعد از این شاخه است (`:262-273`)؛ تنها مصرف‌کنندهٔ واقعی `pages/TasksView.tsx:557` `{ scopeKind: "week", hierarchical: true }`. |
| ۱۸ | مقایسهٔ ساعت کلاینت‌ها | OPEN | `lib/firestoreSync.ts:256-263` — `if (remoteUpdatedAt && localUpdatedAt) { const remoteTime = new Date(remoteUpdatedAt).getTime(); const localTime = new Date(localUpdatedAt).getTime(); if (remoteTime > localTime) { … return "stale"; } }` (سیاست ساعت کلاینت دست‌نخورده). |
| ۱۹ | تست‌های قرمز / نبود شبکهٔ اطمینان | PARTIAL | دو خطای منطقی رفع شد (بند ۶) و تست رگرسیون افزوده شد (`lib/cloudStateSync.test.ts` +۷۴ خط؛ `lib/firestoreSync.test.ts` سه تست بازپایه). اجرای هدفمند ۱۶ فایل (۱۲ فایل قرمزِ خط پایه + ۴ فایل lib): `Tests 1 failed \| 158 passed (159)` — تنها شکست، `components/review/KnowledgeMindMapView.test.tsx:279` با `}, 10000);` در `:297` است (بودجهٔ ۱۰ ثانیه‌ای داخل خود تست، فراتر از `testTimeout: 30_000` سراسری). آخرین اجرای کامل ثبت‌شده (`arshnaz-audit/tests-final.txt`) → `Tests 26 failed \| 1413 passed (1439)` / `Test Files 12 failed \| 214 passed (226)`. |
| ۲۰ | صفحات/کامپوننت‌های مردهٔ جزیره | PARTIAL | حذف‌شده‌ها (Test-Path=false): `pages/IslandView.tsx`، `components/island/IslandMiniCard.tsx`، `components/island/IslandUnlockCelebration.tsx`، `components/garden/MiniGardenCard.tsx`. باقی‌ماندهٔ بی‌ارجاع: `components/island/IslandScene.tsx` و `components/island/IslandAlbum.tsx` (grep سراسری `*.ts*` فقط خط تعریف را برمی‌گرداند). |
| ۲۱ | ۱۶ کامپوننت UI بی‌استفاده | FIXED | همه حذف شده‌اند (`alert, aspect-ratio, breadcrumb, calendar, carousel, chart, context-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, resizable, table, toggle-group` → `Test-Path = False`؛ `npm run typecheck` سبز). |
| ۲۲ | وابستگی‌های بی‌استفاده | PARTIAL | حذف‌شده از `frontend/package.json`: `@floating-ui/dom`, `@hookform/resolvers`, `react-hook-form`, `embla-carousel-react`, `input-otp`, `react-day-picker`. باقی‌ماندهٔ بی‌ارجاع (grep در `frontend/src` + `api` = ۰): `react-resizable-panels` (`frontend/package.json:94`)، `zod` (`:110`) و ۶ پکیج `@radix-ui/react-{aspect-ratio,context-menu,hover-card,menubar,navigation-menu,toggle-group}`. |
| ۲۳ | شیم تکراری `use-toast` | FIXED | `components/ui/use-toast.ts` حذف شده (`Test-Path = False`)؛ `components/ui/toaster.tsx:1` مستقیم `import { useToast } from "@/hooks/use-toast";`. |
| ۲۴ | فیلد تنظیمات و نوع مردهٔ یادآور | OPEN | `lib/reminders.ts:230` `micro_prompt_enabled: boolean;`، `:327` `const tryFire = (kind: "sleep" \| "checkin", …)` و تنها فراخوانی `:337` `tryFire("checkin", …)` (شاخهٔ `"sleep"` مرده). |
| ۲۵ | شرط سه‌گانهٔ بی‌معنا در روز هفته | OPEN | `lib/nlDate.ts:46` — `if (delta === 0) delta = forceNext ? 7 : 7; // always the upcoming one, not today` و `:121` `date = nextWeekday(base, wd.day, true);` (پارامتر بی‌اثر). |
| ۲۶ | «شب» داخل واژه‌هایی مثل «شبکه» | OPEN | `lib/nlDate.ts:132` — `const isPm = /(عصر\|بعدازظهر\|بعد از ظهر\|شب)/.test(working);` (بدون مرز واژه/لوک‌اراند). |
| ۲۷ | تزریق نادرست ویژگی به `<img />` | OPEN | `components/knowledge/PharmacyImageViewer.tsx:11-15` — `return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => { let next = attrs; … return `<img${next}>`; });` (اسلش انتهایی تگ خودبسته حفظ می‌شود → `<img src="x" / loading=…>`). |
| ۲۸ | ماه گرگوری برای فصل شمسی | OPEN | `lib/timeBuckets.ts:172` — `const q = Math.floor(d.getMonth() / 3);` در شاخهٔ `if (calendar === "jalali")` (در برابر روش درست `lib/timeHorizon.ts:249`). |
| ۲۹ | قالب‌بندی سخت‌کد `fa-IR` | OPEN | `components/FirebaseSyncCard.tsx:46` `setLastVerified(new Date().toLocaleTimeString("fa-IR"));`، `:241` `new Date(stats.lastSyncedAt).toLocaleString("fa-IR")`، `components/FolderAIChat.tsx:231` `parseTaskDueDate(...)?.toLocaleDateString("fa-IR")`. |
| ۳۰ | `console.log` در مسیر تولید | REFUTED | `frontend/vite.config.ts:204` — `pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],`؛ شاهد build فعلی: رشتهٔ `pwa-update-available` در ۲ فایل `dist/*.js` هست (یعنی `lib/versionCheck.ts` باندل شده) ولی رشتهٔ `AppUpdate` صفر مورد ⇒ حذف واقعی. (`components/ProcrastinationBusterModal.tsx` هم حذف شده است.) — خود گزارش در `ARSHNAZ-AUDIT-FA.md:251` همین را رد کرده بود. |
| ۳۱ | Context value در هر رندر | OPEN | `hooks/useAuth.tsx:147-158` — `<AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut, setUser, … }}>` بدون `useMemo`. |
| ۳۲ | خروج از حساب دادهٔ قبلی را پاک نمی‌کند | NEEDS-OWNER-DECISION | کد تغییر نکرده: `hooks/useAuth.tsx:104-108` `const handleSignOut = async () => { await logoutUser(); setUser(null); setSession(null); };` و `clearUserLocalData` فقط از `pages/SettingsView.tsx:693` (دکمهٔ دستی) صدا زده می‌شود. رفع آن رفتار نگه‌داری داده را عوض می‌کند (حذف صف آفلاین/پیش‌نویس‌های همگام‌نشده) ⇒ نیازمند تأیید مالک. |

---

## (ب) شمارش دقیق وضعیت‌ها

| وضعیت | تعداد | شناسه‌ها |
|---|---|---|
| FIXED | ۹ | ۱، ۲، ۴، ۶، ۷، ۹، ۱۱، ۲۱، ۲۳ |
| PARTIAL | ۴ | ۸، ۱۹، ۲۰، ۲۲ |
| OPEN | ۱۶ | ۳، ۱۰، ۱۲، ۱۳، ۱۴، ۱۵، ۱۶، ۱۷، ۱۸، ۲۴، ۲۵، ۲۶، ۲۷، ۲۸، ۲۹، ۳۱ |
| NEEDS-OWNER-DECISION | ۱ | ۳۲ |
| REFUTED | ۲ | ۵، ۳۰ |
| **جمع** | **۳۲** | — |

از ۱ مورد P0: **FIXED** (۱). از ۵ مورد P1: ۳ FIXED (۲، ۴، ۶)، ۱ OPEN (۳)، ۱ REFUTED (۵).

---

## (ج) کارهای باقی‌ماندهٔ قابل انجام (OPEN/PARTIAL به ترتیب اولویت)

> ستون «بازطراحی؟»: آیا اصلاح کمینه ظاهر UI را عوض می‌کند؟ همهٔ موارد زیر `false` هستند (هیچ‌کدام بازطراحی نیست؛ نهایتاً تغییر متن/فرمت در دو مورد).

### P1

1. **#۳ تسک تکراری چک‌این روزانه + گم‌شدن آفلاین** — اصلاح: در `lib/reminders.ts:360-383` شرط تکراری‌بودن را از `created_at >= startOfDay` به «تسک بازِ هم‌عنوان» تغییر دهید (`some(t => t.title === item.title && !t.completed)`)، نتیجهٔ `insert` را بگیرید (`const { error } = await firebaseStore.from("tasks").insert(toInsert); if (error && navigator.onLine) return;`) و `LAST_TASK_KEY` را فقط پس از موفقیت بنویسید. ریسک: **کم** (فقط مسیر `auto_create_daily_tasks`). بازطراحی: **false**. تست رگرسیون ندارد؛ افزودن یک تست به `lib/reminders.test.ts` (فایل موجود است) توصیه می‌شود.

### P2

2. **#۱۹ تکمیل شبکهٔ اطمینان تست** — اصلاح: بودجهٔ سخت‌کد ۱۰ ثانیه‌ای در `components/review/KnowledgeMindMapView.test.tsx:195,256,297` با `testTimeout` سراسری (`frontend/vitest.config.ts:16`) هم‌راستا شود (یا آن فایل به پروژهٔ Vitest جدا برود)؛ سپس یک اجرای کامل ثبت شود. افزودن تست رگرسیون برای `ensureDailyTasks` (تنها بندِ P0/P1 بدون تست). ریسک: **کم** (فقط پیکربندی/تست). بازطراحی: **false**.
3. **#۸ ورودی صف بدون مالک** — اصلاح: در `components/TaskDetail.tsx:564-571` یا `writeTaskDraft(...)` را جای `enqueueOp` بگذارید، یا `payload: { ...patch, user_id: user?.id }` و `expectedRevision` را همراه بفرستید. ریسک: **کم** (شاخهٔ کم‌تکرار). بازطراحی: **false**.
4. **#۱۲ محافظ `localStorage`** — اصلاح: `try { localStorage.setItem(...) } catch {}` در `lib/reminders.ts:309,340` و `.catch(() => {})` روی `tick()` در `components/RemindersRunner.tsx:51,58`. ریسک: **کم**. بازطراحی: **false**.
5. **#۱۳ fallback کورکورانهٔ کوئری** — اصلاح: در `lib/firebaseStore.ts:182` فقط وقتی `queryErr?.code === "failed-precondition"` به `getDocs(colRef)` برگردید، وگرنه `{ data: null, error: queryErr }`. ریسک: **متوسط** (رفتار خطا در کوئری‌های آفلاین؛ نیاز به تست دستی). بازطراحی: **false**.
6. **#۱۴ `.in()` بیش از ۱۰ مقدار** — اصلاح: در `lib/firebaseStore.ts:151-156` مقادیر را به دسته‌های ۱۰تایی بشکنید و کوئری‌ها را موازی اجرا کنید (`Promise.all(chunk(value,10).map(...))`) و نتایج را ادغام کنید؛ `hasClientOnlyFilter` فقط برای `in` خالی بماند. ریسک: **متوسط**. بازطراحی: **false**.
7. **#۱۶ زیرتسک حذف‌شده، تکمیل را می‌بندد** — اصلاح: در `lib/recurringTaskService.ts:296-305` فقط برای **والد** (`snapshots[0]`) ناموجود بودن را خطا بدانید و patch زیرتسک‌های ناموجود را حذف کنید. ریسک: **کم**. بازطراحی: **false**.
8. **#۱۵ `insert` = upsert** — اصلاح: در `lib/firebaseStore.ts:232-238` برای `insert` یک مسیر واقعی «ایجاد فقط» بسازید (تراکنش با `get` + `set` بدون `merge`، یا `merge:false`). ریسک: **متوسط-بالا** (بررسی همهٔ فراخوانی‌های `insert`، از جمله `lib/reminders.ts:381` و seedها لازم است). بازطراحی: **false**.
9. **#۱۷ تلهٔ حالت strict** — اصلاح: در `lib/timeBuckets.ts:240-256` بررسی «تاریخ دقیق» را پیش از شاخهٔ strict انجام دهید (یا در strict تسک تاریخ‌دار را هم بپذیرید). توجه: تست `lib/timeBuckets.test.ts:108` رفتار فعلی را تثبیت کرده و باید به‌روزرسانی شود. ریسک: **متوسط**. بازطراحی: **false**.
10. **#۱۰ کلید روز محلی در streak** — اصلاح: در `lib/leitnerService.ts:428,435,443` از `toLocalISO(...)` (`lib/timeHorizon.ts:57`) استفاده کنید. ریسک: **کم** (فقط آمار مطالعه). بازطراحی: **false**.
11. **#۱۸ سیاست ساعت کلاینت** — اصلاح: مقایسهٔ `new Date(remoteUpdatedAt).getTime() > ...` (`lib/firestoreSync.ts:256-263`) با revision سرور/`_firestoreSyncAt` جایگزین شود یا هنگام نوشتن ساعت سرور مبنا گرفته شود. ریسک: **متوسط-بالا** (نیازمند مهاجرت داده/سیاست واحد). بازطراحی: **false**.

### P3

12. **#۲۲ حذف وابستگی‌های باقی‌مانده** — اصلاح: حذف `react-resizable-panels` (`frontend/package.json:94`) و `zod` (`:110`) و ۶ پکیج `@radix-ui/*` بی‌ارجاع + `npm install` برای به‌روزرسانی lock. ریسک: **کم**. بازطراحی: **false**.
13. **#۲۰ دو فایل مردهٔ باقی‌مانده** — اصلاح: حذف `components/island/IslandScene.tsx` و `components/island/IslandAlbum.tsx` (هیچ ارجاعی ندارند). ریسک: **کم**. بازطراحی: **false**. (اگر قابلیت «جزیره» قرار است برگردد، این بند باید «پذیرفته‌شده» علامت بخورد — تصمیم محصولی، بخش «د».)
14. **#۲۹ قالب‌بندی locale** — اصلاح: در `components/FirebaseSyncCard.tsx:46,241` و `components/FolderAIChat.tsx:231` از الگوی موجود در بقیهٔ اپ استفاده کنید (`components/diary/DiaryEntryList.tsx:66` — `toLocaleDateString(isEn ? "en-GB" : "fa-IR", …)`). ریسک: **کم**. بازطراحی: **false** (فقط متن).
15. **#۳۱ `useMemo` برای Context** — اصلاح: `hooks/useAuth.tsx:147-158` مقدار provider را در `useMemo` با وابستگی‌های `[user, session, loading, …handlers]` بپیچید (یا دو context جدا). ریسک: **کم-متوسط** (وابستگی‌های ناقص ⇒ مقدار کهنه). بازطراحی: **false**.
16. **#۲۵ و #۲۶ اصلاح `nlDate`** — اصلاح: `lib/nlDate.ts:46` → `if (delta === 0) delta = 7;` و حذف/استفادهٔ واقعی از `forceNext`؛ `:132` → الگوی مرزدار `/(?<![\p{L}\u200c])(عصر|بعدازظهر|بعد از ظهر|شب)(?![\p{L}\u200c])/u`. ریسک: **کم** (تست‌های `nlDate` باید بازبینی شوند). بازطراحی: **false**.
17. **#۲۷ مارک‌آپ `<img />`** — اصلاح: در `components/knowledge/PharmacyImageViewer.tsx:12` پیش از افزودن ویژگی‌ها `next = next.replace(/\/\s*$/, "")`. ریسک: **کم**. بازطراحی: **false**.
18. **#۲۴ پاک‌سازی فیلد/نوع مرده** — اصلاح: حذف `micro_prompt_enabled` از `lib/reminders.ts:230,393` و محدودکردن `kind` به `"checkin"` در `:327`. ریسک: **کم**. بازطراحی: **false**.
19. **#۲۸ فصل شمسی** — اصلاح: `lib/timeBuckets.ts:172` → `const q = Math.floor(jGetMonth(d) / 3);` با import از `date-fns-jalali` (هم‌سبک `lib/timeHorizon.ts:249`). ریسک: **کم**. بازطراحی: **false**.

---

## (د) نیازمند تصمیم مالک

1. **#۳۲ پاک‌سازی دادهٔ دستگاه در خروج از حساب** — کد فعلاً هیچ پاک‌سازی‌ای انجام نمی‌دهد (`hooks/useAuth.tsx:104-108`) و `clearUserLocalData` فقط دستی از `pages/SettingsView.tsx:693` اجرا می‌شود. گزینه‌ها: (الف) اجرای `clearUserLocalData(previousUid)` در `handleSignOut` **پس از تأیید کاربر** — نشتی حریم خصوصی را می‌بندد ولی اگر صف آفلاین همگام‌نشده باشد، تغییرات محلی از بین می‌رود؛ (ب) پاک‌سازی در ورود کاربر جدید وقتی uid عوض شده — بدون تأخیرِ خروج، همان ریسک از‌دست‌رفتن صف را دارد؛ (ج) پذیرش وضعیت فعلی (کش‌ها با uid کلید خورده‌اند و به کاربر بعدی نشان داده نمی‌شوند). پیامد هر گزینه رفتار کاربر را عوض می‌کند (نه ظاهر) و بدون تأیید مالک قابل اجرا نیست.
2. **#۲۰ آیندهٔ قابلیت «جزیره»** — `lib/island.ts` هنوز زنده است (`hooks/useAuth.tsx:61` `startIslandCloudSync(...)`) در حالی که صفحه و ۲ کامپوننت آن حذف شده‌اند. تصمیم: حذف کامل (شامل `lib/island.ts` و sync آن) یا بازگرداندن یک مسیر واقعی در `App.tsx`. تا تصمیم، بند ۲۰ در وضعیت PARTIAL می‌ماند.

---

## (ه) یادداشت‌های اجرایی (خارج از ۳۲ یافته، برای اطلاع)

- `npm run typecheck` → **exit 0** (اجرای واقعی در همین ممیزی).
- در جریان ممیزی، `frontend/vitest.config.ts` (افزودن `testTimeout`/`hookTimeout: 30_000`)، `firebase.json` و `frontend/rules-tests/vitest.config.ts` اضافه/تغییر کرد؛ در لحظهٔ نوشتن این سند، `frontend/rules-tests/` فقط `vitest.config.ts` دارد و فایل `rules.test.ts` که همان config به آن ارجاع می‌دهد وجود ندارد ⇒ `npm run test:rules` در این وضعیت با «no test files found» شکست می‌خورد (مرتبط با گزارش امنیت API، نه این ۳۲ بند).

---

## (و) شواهد اجرای تست هدفمند (برای بندهای ۱، ۲، ۴، ۶، ۹، ۱۹)

فرمان: `npx vitest run` روی ۱۲ فایل قرمزِ خط پایه (`InteractiveStudyView`, `review/KnowledgeMindMapView`, `features/tasks/taskService`, `KnowledgeBaseView`, `knowledge/AiQuestionGeneratorModal`, `TaskAIPanel`, `knowledge/KnowledgeDocumentEditorModal`, `TasksView.split`, `AndroidSettings`, `lib/dataIntegrityPhaseA`, `MakeChildDialog`, `SettingsView`) + ۴ فایل مرتبط با رفع‌ها (`lib/cloudStateSync.test.ts`, `lib/firestoreDataService.test.ts`, `lib/firestoreSync.test.ts`, `lib/recurringTaskService.test.ts`).

```
 ✓ src/lib/firestoreSync.test.ts (25 tests) 313ms
 ✓ src/lib/recurringTaskService.test.ts (16 tests) 242ms
 ✓ src/lib/cloudStateSync.test.ts (7 tests) 73ms
 Test Files  1 failed | 15 passed (16)
      Tests  1 failed | 158 passed (159)
   Duration  173.90s
 FAIL  src/components/review/KnowledgeMindMapView.test.tsx:279
 Error: Test timed out in 10000ms.   ← بودجهٔ سخت‌کد داخل خود تست (:297)
```

نتیجه: هر دو شکست منطقی `fetchTasks` (بند ۶) و کل خانوادهٔ Knowledge/Settings/Android/TaskAIPanel سبز شدند؛ تنها بازمانده یک تایم‌اوتِ درون‌تستی در `KnowledgeMindMapView` است.
