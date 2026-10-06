# وضعیت ۳۲ یافتهٔ `arshnaz-audit/code-bugs.md` در درخت کاری جاری Arshiam

**درخت بررسی‌شده:** `C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam`.
**وضعیت درخت در آغاز پایش:** HEAD `b1e9d0b` + ۷۹ ورودی uncommitted (`git status --porcelain`): ۴۹ فایل تغییریافته + ~۳۰ فایل حذف‌شده + ۳ مسیر جدید (`frontend/vitest.api.config.ts`، `firebase.json`، `frontend/rules-tests/`).
**وضعیت درخت در پایان پایش:** همان تغییرات در commit `308e906` («fix(audit): security, data integrity, i18n, dead code and first-load perf»، ۷۶ فایل) ثبت شد، سپس `869d556` («test: realistic vitest timeouts…»: `KnowledgeMindMapView.test.tsx` + `vitest.config.ts` + `firebase.json` + `frontend/rules-tests/vitest.config.ts`) و `1f68f13` («docs(audit)…»: انتقال گزارش‌ها به `docs/audit/`). **اکنون `HEAD = 1f68f13` و درخت کاملاً تمیز است (`git status` خالی).** **تمام ۱۶ مورد OPEN/PARTIAL دوباره در همین HEAD خط‌به‌خط بازبینی و تأیید شدند** (هیچ‌کدام در این جابه‌جایی‌ها تغییر نکرده‌اند)؛ تنها بند ۱۹ جابه‌جا شد و با نتیجهٔ اجرای واقعی همین لحظه به‌روز شده است.
**روش:** `git diff`/`git status` + خواندن محل ارجاع در فایل جاری (شماره‌خط‌ها جابه‌جا شده‌اند) + grep نماد + اجرای واقعی. هیچ فایلی در مخزن تغییر نکرد؛ تنها خروجی این پایش همین فایل است.

**شاهدهای محیطی که خودم در همین بررسی اجرا کردم (نه نقل از گزارش):**

| شاهد | فرمان | نتیجه |
|---|---|---|
| typecheck | `cd frontend && npx tsc -p tsconfig.app.json --noEmit` | خروجی صفر خط، `TSC_EXIT=0` (tsc 5.9.3) |
| تست کامل | `cd frontend && npx vitest run` | `Test Files 2 failed \| 224 passed (226)` · `Tests 3 failed \| 1436 passed (1439)` · ۸۶۵s |
| regex چک‌باکس | اجرای واقعی regex جاری روی ۴ ورودی با node | `data-checked="true"` و `data-checked="false"` دست‌نخورده می‌مانند؛ فقط `checked` واقعی حذف می‌شود |
| باندل تولید | grep روی `frontend/dist/assets/*.js` | `AppUpdate` = ۰ تطبیق · `pwa-update-available` = ۲ تطبیق |
| پیکربندی build | `frontend/vite.config.ts:204` | `pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : []` |

**راهنمای وضعیت:** `FIXED` رفع‌شده · `PARTIAL` جزئی/غیرقابل‌اثبات کامل · `OPEN` باز (اصلاحش روشن است) · `NEEDS-OWNER-DECISION` نیازمند تصمیم مالک · `REFUTED` ادعا در این درخت معتبر نیست.

---

## (الف) جدول وضعیت ۳۲ یافته

| # | عنوان کوتاه | وضعیت | شاهد (file:line + snippet) |
|---|-------------|--------|-----------------------------|
| ۱ | نوشتن وضعیت ابری بدون بررسی نسخه | **FIXED** | `frontend/src/lib/cloudStateSync.ts:48-53` — `await runTransaction(db, async (transaction) => { const snap = await transaction.get(ref);` … `if (remoteAt > local.updatedAt) {` (نسخهٔ جدیدتر بازنویسی نمی‌شود؛ adopt می‌شود `:93-97`) |
| ۲ | تخریب `data-checked` در ریست چک‌باکس | **FIXED** | `frontend/src/lib/recurringTaskService.ts:91` — `updated.replace(/<input\b([^>]*?)\schecked(?:="[^"]*")?([^>]*?)>/gi, "<input$1$2>")` — اجرای واقعی: ورودی `data-checked="true"` بدون تغییر بیرون می‌آید |
| ۳ | تسک تکراری «چک‌این روزانه» | **OPEN** | `frontend/src/lib/reminders.ts:366` `.gte("created_at", startOfDay.toISOString());` · `:381` `await firebaseStore.from("tasks").insert(toInsert);` (نتیجه بررسی نمی‌شود) · `:383` `localStorage.setItem(LAST_TASK_KEY, today);` بی‌قید |
| ۴ | رد شدن ذخیره/حذف با `ConcurrentEditError` | **FIXED** | `frontend/src/lib/firestoreDataService.ts:236` — `if (typeof expected === "string" && typeof remoteRevision === "string" && remoteRevision !== expected) {` (همان قاعده در `:258` برای حذف) |
| ۵ | `typecheck`/`build` شکسته | **REFUTED** | `npx tsc -p tsconfig.app.json --noEmit` → صفر خط، `TSC_EXIT=0`؛ زنجیرهٔ ادعاشده اصلاً وجود ندارد: `api/_lib/taskSchedule.ts` (هم در working tree و هم در `git show HEAD:`) هیچ `import`ی ندارد، پس `api/_lib/assistantAccess.ts` هرگز وارد برنامهٔ tsc نمی‌شود |
| ۶ | استثنای ویجت، نتیجهٔ fetch را باطل می‌کند | **FIXED** | `frontend/src/features/tasks/taskService.ts:117` — `void Promise.resolve(syncAndroidWidget(tasks, userId)).catch(() => {});` |
| ۷ | لیسنرهای Firestore هرگز بسته نمی‌شوند | **FIXED** | `frontend/src/lib/firestoreLive.ts:48` `entry.unsubscribe = onSnapshot(` + `:104-111` `export function stopLiveListeners(): void {` … `registry.clear();` + فراخوانی `frontend/src/hooks/useAuth.tsx:66` `if (!user?.id) stopLiveListeners();` |
| ۸ | ورودی صف بدون مالک در TaskDetail | **OPEN** | `frontend/src/components/TaskDetail.tsx:568` — `const queued = await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: current.id } });` و در بازپخش: `frontend/src/lib/firestoreSync.ts:108-109` — `if (typeof mutation.expectedRevision !== "string" \|\| … ) return "stale";` (بدون `expectedRevision` قطعاً `stale` می‌شود) |
| ۹ | fail-open در بررسی نسخه | **FIXED** | `frontend/src/lib/firestoreSync.ts:243-247` — `if (remoteData === undefined) {` … `const serverSnapshot = await getDoc(docRef); remoteData = serverSnapshot.exists() ? serverSnapshot.data() : null;` + `:268-270` مسیر fail-closed (`return "failed"`) |
| ۱۰ | streak مطالعه با روز UTC | **OPEN** | `frontend/src/lib/leitnerService.ts:435` — `const key = checkDate.toISOString().slice(0, 10);` و `:443` `const yestKey = checkDate.toISOString().slice(0, 10);` و `:428` `reviewDates.add(c.last_reviewed_at.slice(0, 10));` (بدون `toLocalISO`) |
| ۱۱ | `isAdmin` همیشه false | **FIXED** | `frontend/src/hooks/useUserRole.tsx:19` — `const tokenResult = await auth.currentUser?.getIdTokenResult();` (شیء واقعی Firebase، نه `AppUser`) |
| ۱۲ | `localStorage.setItem` بدون محافظ | **OPEN** | `frontend/src/lib/reminders.ts:309` `localStorage.setItem(FIRED_TASKS_KEY, JSON.stringify(fired));` · `:340` `localStorage.setItem(LAST_NOTIFY_KEY, JSON.stringify(stored));` (بدون try/catch) و `frontend/src/components/RemindersRunner.tsx:51,58` `tick();` بدون `.catch()` |
| ۱۳ | fallback به اسکن کل کالکشن | **OPEN** | `frontend/src/lib/firebaseStore.ts:182-186` — `} catch (queryErr) { // Fallback: If composite index missing…` `snapshot = await getDocs(colRef); hasClientOnlyFilter = true; }` |
| ۱۴ | `.in()` با بیش از ۱۰ مقدار | **OPEN** | `frontend/src/lib/firebaseStore.ts:152-156` — `if (filter.value.length > 0 && filter.value.length <= 10) { constraints.push(fsWhere(filter.field, "in", filter.value)); } else { hasClientOnlyFilter = true; }` |
| ۱۵ | `insert` عملاً `upsert` است | **OPEN** | `frontend/src/lib/firebaseStore.ts:238` `private async write(input: Row \| Row[], _merge: boolean, onConflict?: string)` + `:281` `await setDoc(doc(db, "users", userId, this.table, id), row, { merge: true });` (`_merge` هرگز خوانده نمی‌شود) |
| ۱۶ | یک زیرتسک حذف‌شده کل تکمیل را می‌بندد | **OPEN** | `frontend/src/lib/recurringTaskService.ts:297` — `if (snapshots.some(snapshot => !snapshot.exists())) throw new Error("Recurring task changed before it could be advanced");` |
| ۱۷ | حالت strict تسک‌های تاریخ‌دار را پنهان می‌کند | **OPEN** | `frontend/src/lib/timeBuckets.ts:241` `if (!hierarchical \|\| (options.selectedBucketKinds && …)) {` … `:255 return { matches: false, matchReason: "none" };` — بررسی «تاریخ دقیق» پس از این شاخه (`:261`). تنها مصرف‌کنندهٔ واقعی `frontend/src/pages/TasksView.tsx:557` با `hierarchical: true` ⇒ مسیر strict فقط از تست اجرا می‌شود (تلهٔ کد) |
| ۱۸ | مقایسهٔ ساعت کلاینت‌ها | **NEEDS-OWNER-DECISION** | `frontend/src/lib/firestoreSync.ts:254-261` — `const remoteUpdatedAt = remoteData?.updated_at \|\| remoteData?.updatedAt;` … `if (remoteTime > localTime) { … return "stale"; }` (کد تأیید شد؛ آزمایش تجربی اختلاف ساعت انجام نشد = unproven) |
| ۱۹ | تست‌های قرمز | **PARTIAL** | اجرای کامل من روی درخت پیش از commit: `Tests 3 failed \| 1436 passed (1439)` · `Test Files 2 failed \| 224 passed (226)` — هر ۳ شکست timeout با بودجهٔ دستی ۱۰ ثانیه. **پس از commit و اصلاح هم‌زمان:** `frontend/src/components/review/KnowledgeMindMapView.test.tsx:163,180,195,256,297,372` → `}, 30000);`؛ اجرای هدفمند دو فایل روی HEAD `308e906` ⇒ `Test Files 2 passed (2)` · `Tests 28 passed (28)`. باقی‌مانده: `frontend/src/pages/InteractiveStudyView.test.tsx:227` هنوز `}, 10_000);` است و در اجرای کامل همان بودجه شکست خورد (بودجهٔ سراسری در `frontend/vitest.config.ts:16-17` = ۳۰s). دو خطای منطقی `taskService.ts:115` سبز شده‌اند |
| ۲۰ | صفحات/کامپوننت‌های مردهٔ جزیره | **PARTIAL** | حذف‌شده: `frontend/src/pages/IslandView.tsx`، `frontend/src/components/island/IslandMiniCard.tsx`، `IslandUnlockCelebration.tsx`، `frontend/src/components/garden/MiniGardenCard.tsx`. باقی‌ماندهٔ بی‌ارجاع: `frontend/src/components/island/IslandScene.tsx:270` و `IslandAlbum.tsx:14` (grep روی کل `frontend/src` فقط خط تعریف را برمی‌گرداند) |
| ۲۱ | ۱۶ کامپوننت UI بی‌استفاده | **FIXED** | هر ۱۶ فایل با وضعیت `D` در `git status` (`alert, aspect-ratio, breadcrumb, calendar, carousel, chart, context-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, resizable, table, toggle-group`)؛ grep روی `@/components/ui/<name>` صفر تطبیق |
| ۲۲ | وابستگی‌های بی‌استفاده | **PARTIAL** | حذف‌شده (۶): `@floating-ui/dom`، `@hookform/resolvers`، `react-hook-form`، `embla-carousel-react`، `input-otp`، `react-day-picker`. باقی‌مانده در `frontend/package.json`: `react-resizable-panels` و `zod` (grep در `frontend/src` صفر مصرف‌کننده) + ۶ بستهٔ `@radix-ui/react-{aspect-ratio,context-menu,hover-card,menubar,navigation-menu,toggle-group}` |
| ۲۳ | شیم تکراری `use-toast` | **FIXED** | `frontend/src/components/ui/use-toast.ts` حذف شده (`D` در git status)؛ grep برای `@/components/ui/use-toast` صفر تطبیق؛ `components/ui/toaster.tsx` مستقیم از `@/hooks/use-toast` می‌گیرد |
| ۲۴ | فیلد بی‌استفاده و نوع مردهٔ یادآور | **OPEN** | `frontend/src/lib/reminders.ts:230` `micro_prompt_enabled: boolean;` · `:393` `micro_prompt_enabled: false,` · `:327` `const tryFire = (kind: "sleep" \| "checkin", …)` و تنها فراخوانی `:337` `tryFire("checkin", …)` ⇒ شاخهٔ `"sleep"` و `stored.sleep` مرده |
| ۲۵ | شرط سه‌گانهٔ بی‌معنا در روز هفته | **OPEN** | `frontend/src/lib/nlDate.ts:46` — `if (delta === 0) delta = forceNext ? 7 : 7; // always the upcoming one, not today` (پارامتر `forceNext` بی‌اثر؛ همه‌جا `true` پاس می‌شود) |
| ۲۶ | «شب» داخل واژه‌هایی مثل «شبکه» | **OPEN** | `frontend/src/lib/nlDate.ts:132` — `const isPm = /(عصر\|بعدازظهر\|بعد از ظهر\|شب)/.test(working);` (بدون مرز واژه) |
| ۲۷ | تزریق نادرست ویژگی به `<img />` | **OPEN** | `frontend/src/components/knowledge/PharmacyImageViewer.tsx:12-15` — `let next = attrs;` … `return \`<img${next}>\`;` (اسلش پایانی تگ خودبسته حذف نمی‌شود ⇒ `<img src="x" / loading=…>`) |
| ۲۸ | ماه گرگوری برای فصل شمسی | **OPEN** | `frontend/src/lib/timeBuckets.ts:171-172` — `if (calendar === "jalali") {` `const q = Math.floor(d.getMonth() / 3);` (در برابر روش درست `frontend/src/lib/timeHorizon.ts:249`) |
| ۲۹ | قالب‌بندی سخت‌کد `fa-IR` | **OPEN** | `frontend/src/components/FirebaseSyncCard.tsx:46` `setLastVerified(new Date().toLocaleTimeString("fa-IR"));` · `:241` `{new Date(stats.lastSyncedAt).toLocaleString("fa-IR")}` · `frontend/src/components/FolderAIChat.tsx:231` `parseTaskDueDate(...)?.toLocaleDateString("fa-IR")` |
| ۳۰ | `console.log` در مسیر تولید | **REFUTED** | `frontend/vite.config.ts:204` — `pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],` ⇒ در build تولید حذف می‌شود؛ شاهد باندل: `frontend/dist/assets/*.js` رشتهٔ `pwa-update-available` را ۲ بار دارد (یعنی `lib/versionCheck.ts` باندل شده) ولی `AppUpdate` صفر تطبیق. ضمناً `components/ProcrastinationBusterModal.tsx` کاملاً حذف شده |
| ۳۱ | Context value در هر رندر ساخته می‌شود | **OPEN** | `frontend/src/hooks/useAuth.tsx:147-158` — `<AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut, … }}>` بدون `useMemo` |
| ۳۲ | خروج از حساب دادهٔ قبلی را پاک نمی‌کند | **NEEDS-OWNER-DECISION** | `frontend/src/hooks/useAuth.tsx:104-108` — `const handleSignOut = async () => { await logoutUser(); setUser(null); setSession(null); };` و `clearUserLocalData` فقط از `frontend/src/pages/SettingsView.tsx:693` (دکمهٔ دستی) صدا زده می‌شود |

---

## (ب) شمارش دقیق وضعیت‌ها

| وضعیت | تعداد | شماره‌ها |
|-------|-------|-----------|
| **FIXED** | ۹ | ۱، ۲، ۴، ۶، ۷، ۹، ۱۱، ۲۱، ۲۳ |
| **PARTIAL** | ۳ | ۱۹، ۲۰، ۲۲ |
| **OPEN** | ۱۶ | ۳، ۸، ۱۰، ۱۲، ۱۳، ۱۴، ۱۵، ۱۶، ۱۷، ۲۴، ۲۵، ۲۶، ۲۷، ۲۸، ۲۹، ۳۱ |
| **NEEDS-OWNER-DECISION** | ۲ | ۱۸، ۳۲ |
| **REFUTED** | ۲ | ۵، ۳۰ |
| **جمع** | **۳۲** | — |

از نظر شدت گزارش اصلی: تنها مورد **P0** (بند ۱) و ۴ مورد از ۵ مورد **P1** (بندهای ۲، ۴، ۶؛ و بند ۵ که REFUTED است) بسته شده‌اند؛ تنها **P1 باز = بند ۳** (چک‌این روزانه).

**موارد unproven (طبق دستور، صریح اعلام می‌شود):**
- **#۱۸** — کد قطعی است (مقایسهٔ ساعت کلاینت‌ها)، ولی اثر «رد شدن ویرایش معتبر با ساعت عقب» تجربی آزمایش نشد (نیازمند دو پروفایل با ساعت دستی).
- **#۱۶** — شاخهٔ خطا در کد قطعی است، ولی رسیدن به آن نیازمند حذف زیرتسک از دستگاه دوم است.
- **#۸** — «هرگز همگام نمی‌شود» در لایهٔ بازپخش قطعی است (`expectedRevision` رشته نیست ⇒ `stale`)، ولی **رسیدن** به خط ۵۶۸ باریک است: `frontend/src/hooks/useShareAccess.ts:34-37` وقتی `resourceOwnerId` تهی باشد `canEdit = true` می‌دهد، پس شاخه فقط برای تسک بدون `user_id` در حالت خروج قابل دسترسی است.

---

## (پ) موارد باقی‌مانده به ترتیب اولویت

> ستون «بصری؟» = آیا اصلاح کمینه ظاهر UI را عوض می‌کند.

### P1

**۱) #۳ — چک‌این روزانهٔ تکراری + گم‌شدن در آفلاین — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/reminders.ts` — (الف) خط ۳۶۲-۳۶۷: قید `.gte("created_at", startOfDay.toISOString())` بردارید و روی «تسک بازِ هم‌عنوان» تطبیق دهید: `.select("title, completed").eq("user_id", userId)` و سپس `existing.some((t) => t.title === i.title && !t.completed)`؛ (ب) خط ۳۸۰-۳۸۳: `const { error } = await firebaseStore.from("tasks").insert(toInsert); if (error && navigator.onLine) return;` و `LAST_TASK_KEY` فقط پس از موفقیت (یا در حالت آفلاین) نوشته شود.
- **ریسک:** کم-متوسط — فقط مسیر `auto_create_daily_tasks` را عوض می‌کند؛ اگر تسکِ ناتمام قدیمی با همان عنوان بماند، دیگر نسخهٔ جدید ساخته نمی‌شود (رفتار دلخواه، ولی باید `due_date` امروز هم در صورت نیاز به‌روزرسانی شود).
- **آزمون پذیرش:** تست واحد جدید با mock `firebaseStore`؛ سنجه‌ها: (۱) تسک دیروز با `recurrence:"daily"` و `completed:false` ⇒ `insert` صدا زده نشود؛ (۲) `insert` مقدار `{ error }` برگرداند و `navigator.onLine === false` ⇒ `LAST_TASK_KEY` نوشته نشود. فرمان: `cd frontend && npx vitest run src/lib/reminders.test.ts`
- **بصری؟** خیر (فقط محتوای فهرست تسک‌ها).

### P2

**۲) #۱۹ — شبکهٔ اطمینان تست: یک بودجهٔ ۱۰ ثانیه‌ای و نوسان باقی‌مانده — PARTIAL**
- **وضعیت لحظه‌ای (اجرای واقعی من روی HEAD `308e906`):** `npx vitest run src/pages/InteractiveStudyView.test.tsx src/components/review/KnowledgeMindMapView.test.tsx` ⇒ `Test Files 2 passed (2)` · `Tests 28 passed (28)` · ۵۹s. یعنی هر دو فایل در اجرای هدفمند سبزند (بودجهٔ `KnowledgeMindMapView` هم‌زمان به ۳۰s رسید).
- **اصلاح کمینهٔ باقی‌مانده:** تنها بودجهٔ سخت‌کد ۱۰ ثانیه‌ای باقی‌مانده را با بودجهٔ سراسری هم‌راستا کنید: `frontend/src/pages/InteractiveStudyView.test.tsx:227` → `}, 30_000);` (یا حذف آرگومان سوم تا از `frontend/vitest.config.ts:16` ارث‌بری کند) — این تست در اجرای کامل من با همان ۱۰ ثانیه timeout خورد.
- **ریسک:** کم — فقط فایل تست.
- **آزمون پذیرش:** دو اجرای کامل پشت‌سرهم `cd frontend && npx vitest run` ⇒ انتظار `226 passed / 0 failed` در هر دو (اجرای هدفمند ۲۸/۲۸ امروز کافی نیست، چون شکست قبلی زیر بار اجرای کامل رخ داد).
- **بصری؟** خیر.

**۳) #۸ — صف بدون مالک/بدون `expectedRevision` هرگز همگام نمی‌شود — OPEN (unproven در دسترسی)**
- **اصلاح کمینه:** `frontend/src/components/TaskDetail.tsx:568` — اگر `user` نیست، تغییر را با `writeTaskDraft` (که همین حالا import شده، خط ۹۴) نگه دارید؛ یا حداقل `payload: { ...patch, user_id: current.user_id ?? user?.id }`، `match: { id: current.id, user_id: … }` و `expectedRevision` را همراه بفرستید.
- **ریسک:** کم — شاخهٔ کم‌تکرار؛ خطر اصلی، چسباندن مالک اشتباه به صف است، پس `current.user_id` ترجیح دارد.
- **آزمون پذیرش:** تست واحد: پس از `enqueueOp`، `getQueuedOpOwnerId(op)` رشتهٔ درست برگرداند و `canReplayForOwner(op, uid) === true`. فرمان: `cd frontend && npx vitest run src/components/TaskDetail.test.tsx`
- **بصری؟** خیر.

**۴) #۱۶ — یک زیرتسک حذف‌شده کل تکمیل تکرارشونده را می‌بندد — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/recurringTaskService.ts:296-305` — ناموجود‌بودن را فقط برای **والد** (`snapshots[0]`) خطا بدانید و patch زیرتسک‌های ناموجود را حذف کنید (فیلتر بر اساس `snapshot.exists()`).
- **ریسک:** متوسط — باید `updatedSubtaskCount` و ایندکس‌های `stepRefs` هم‌راستا فیلتر شوند تا `transaction.update` روی سند ناموجود صدا زده نشود.
- **آزمون پذیرش:** تست واحد با تراکنش mock که برای یکی از `stepRefs` سند ناموجود برمی‌گرداند ⇒ انتظار `{ success: true }` و عدم پرتاب. فرمان: `cd frontend && npx vitest run src/lib/recurringTaskService.test.ts`
- **بصری؟** خیر.

**۵) #۱۵ — `insert` عملاً `upsert` است — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/firebaseStore.ts:238,281` — از `_merge` استفاده کنید: `await setDoc(ref, row, _merge ? { merge: true } : undefined);` یا برای «ایجاد فقط» یک `runTransaction` با `get` بنویسید.
- **ریسک:** متوسط-بالا — `insert` مصرف‌کننده‌های زیادی دارد؛ نوشتن کامل می‌تواند فیلدهای موجود را پاک کند. مسیر امن‌تر: در `insert` فقط «رد در صورت وجود id» و دست‌نزدن به `upsert`.
- **آزمون پذیرش:** تست واحد: `insert` روی `id` موجود ⇒ انتظار خطا/عدم ادغام؛ `upsert` روی همان id ⇒ ادغام. فرمان: `cd frontend && npx vitest run src/lib/firebaseStore.test.ts`
- **بصری؟** خیر.

**۶) #۱۳ — هر خطای کوئری به اسکن کل کالکشن تبدیل می‌شود — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/firebaseStore.ts:182-186` — فقط برای خطای نبود ایندکس fallback بگیرید: `const code = (queryErr as any)?.code; if (code === "failed-precondition" \|\| /index/i.test(String((queryErr as any)?.message))) { snapshot = await getDocs(colRef); hasClientOnlyFilter = true; } else { throw queryErr; }`
- **ریسک:** متوسط — برخی محیط‌ها کد/پیام خطای متفاوتی برای ایندکس می‌دهند؛ باید مسیر آفلاین دستی تست شود.
- **آزمون پذیرش:** تست واحد: mock `getDocs` با `{code:"unavailable"}` ⇒ یک فراخوانی و بازگشت `{ data: null, error }`؛ با `{code:"failed-precondition"}` ⇒ دو فراخوانی. فرمان: `cd frontend && npx vitest run src/lib/firebaseStore.test.ts`
- **بصری؟** خیر.

**۷) #۱۴ — `.in()` با بیش از ۱۰ مقدار ⇒ خواندن کل کالکشن — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/firebaseStore.ts:151-156` — تقسیم به دسته‌های ۱۰تایی و اجرای موازی (`chunk(value, 10)` + `Promise.all`) و ادغام نتایج، به‌جای `hasClientOnlyFilter = true`.
- **ریسک:** متوسط — حفظ `orderBy`/`limit` سروری هنگام ادغام نیاز به بازنویسی کوچک در `shape()` دارد؛ مصرف‌کننده‌های واقعی: `frontend/src/lib/recurringTaskService.ts:276` و `frontend/src/features/tasks/taskService.ts:240,291`.
- **آزمون پذیرش:** تست واحد با ۱۲ مقدار در `.in()` ⇒ انتظار ۲ کوئری `in`. فرمان: `cd frontend && npx vitest run src/lib/firebaseStore.test.ts`
- **بصری؟** خیر.

**۸) #۱۲ — `localStorage.setItem` بدون محافظ در مسیر زمانی — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/reminders.ts:309,340` → `try { … } catch { /* ignore */ }`؛ `frontend/src/components/RemindersRunner.tsx:51,58` → `tick().catch(() => {})`.
- **ریسک:** کم.
- **آزمون پذیرش:** تست واحد با `vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); })` ⇒ انتظار عدم پرتاب. فرمان: `cd frontend && npx vitest run src/lib/reminders.test.ts`
- **بصری؟** خیر.

**۹) #۱۰ — streak مطالعه بر پایهٔ روز UTC — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/leitnerService.ts:428,435,443` — کلیدها با helper روز محلی: `const key = toLocalISO(checkDate);` (همان `frontend/src/lib/timeHorizon.ts:57`) و تبدیل `last_reviewed_at` به روز محلی.
- **ریسک:** کم-متوسط — عدد streak کاربران فعلی ممکن است یک بار جابه‌جا شود (بدون نیاز به مهاجرت داده).
- **آزمون پذیرش:** تست واحد با `TZ=Asia/Tehran` و دو مرور در ساعت ۰۰:۳۰ محلی دو روز متوالی ⇒ انتظار `streakDays === 2`. فرمان: `$env:TZ="Asia/Tehran"; cd frontend; npx vitest run src/lib/leitnerService.test.ts`
- **بصری؟** خیر (فقط عدد آمار).

**۱۰) #۱۸ — مقایسهٔ ساعت کلاینت‌ها — NEEDS-OWNER-DECISION**
- **تصمیم مالک:** آیا مرجع نسخه همان `updated_at` نوشته‌شده توسط کلاینت بماند (`frontend/src/lib/firestoreSync.ts:254-261`) یا به `serverTimestamp()`/revision سروری منتقل شود؟ بدون این تصمیم، هر تغییر فقط جابه‌جایی ریسک است.
- **اصلاح پیشنهادی در صورت تصمیم سروری:** افزودن `server_updated_at: serverTimestamp()` در نوشتن‌های `frontend/src/lib/firestoreDataService.ts` و `frontend/src/lib/firebaseStore.ts` و مقایسه بر همان در `firestoreSync.ts:254`.
- **ریسک:** بالا — معنای «stale» برای همهٔ موجودیت‌ها عوض می‌شود؛ نیاز به داده‌کاوی `WHERE updated_at IS NULL`.
- **آزمون پذیرش (دستی، چون unproven):** دو پروفایل مرورگر با اختلاف ساعت ۱۰ دقیقه و یک ویرایش روی هرکدام ⇒ ویرایش دستگاه با ساعت عقب نباید بی‌دلیل رد شود.
- **بصری؟** خیر.

**۱۱) #۱۷ — تلهٔ حالت strict — OPEN (کد مرده)**
- **اصلاح کمینه:** `frontend/src/lib/timeBuckets.ts:241-256` — بررسی «تاریخ دقیق» (منطق `:261`) را پیش از شاخهٔ strict انجام دهید، یا در strict تسک‌های با `work_date` داخل بازه را هم بپذیرید؛ یا اگر حالت strict منتفی است، پارامتر/شاخه حذف شود.
- **ریسک:** کم — تنها مصرف‌کنندهٔ واقعی `frontend/src/pages/TasksView.tsx:557` است که `hierarchical: true` می‌فرستد؛ تست `frontend/src/lib/timeBuckets.test.ts:108` رفتار فعلی را تثبیت کرده و باید به‌روزرسانی شود.
- **آزمون پذیرش:** `cd frontend && npx vitest run src/lib/timeBuckets.test.ts` با تست جدید: تسک دارای تاریخ دقیق داخل بازه + `hierarchical: false` ⇒ `matches === true`.
- **بصری؟** بله، فقط اگر روزی حالت strict به UI وصل شود.

### P3

**۱۲) #۲۲ — حذف وابستگی‌های باقی‌مانده — PARTIAL**
- **اصلاح کمینه:** از `frontend/package.json` حذف: `"react-resizable-panels"` و `"zod"` (grep در `frontend/src` صفر import) و سپس ۶ بستهٔ `@radix-ui/react-{aspect-ratio,context-menu,hover-card,menubar,navigation-menu,toggle-group}` که مصرف‌کننده‌هایشان در بند ۲۱ حذف شده‌اند؛ `npm install` برای به‌روزرسانی lock.
- **ریسک:** کم — پیش از حذف `zod`، وابستگی غیرمستقیم در `frontend/vite.config.ts`/اسکریپت‌ها بررسی شود.
- **آزمون پذیرش:** `cd frontend && npm install && npx tsc -p tsconfig.app.json --noEmit && npx vite build`
- **بصری؟** خیر.

**۱۳) #۲۰ — دو فایل مردهٔ باقی‌ماندهٔ «جزیره» — PARTIAL**
- **اصلاح کمینه:** حذف `frontend/src/components/island/IslandScene.tsx` و `frontend/src/components/island/IslandAlbum.tsx` (هیچ ارجاعی ندارند) — **مشروط** به تصمیم مالک دربارهٔ آیندهٔ قابلیت جزیره، چون `frontend/src/lib/island.ts` هنوز زنده و از `frontend/src/hooks/useAuth.tsx:61` همگام‌سازی می‌شود و `frontend/src/components/island/ZoomPan.tsx` ممکن است مصرف‌کنندهٔ دیگری (`components/garden/PlantCanvas.tsx`) داشته باشد.
- **ریسک:** کم.
- **آزمون پذیرش:** `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npx vite build` ⇒ موفق.
- **بصری؟** خیر.

**۱۴) #۲۹ — `fa-IR` سخت‌کد در رابط انگلیسی — OPEN**
- **اصلاح کمینه:** `frontend/src/components/FirebaseSyncCard.tsx:46,241` و `frontend/src/components/FolderAIChat.tsx:231` — همان الگوی بقیهٔ برنامه: `isEn ? "en-GB" : "fa-IR"` (نمونهٔ موجود: `frontend/src/components/diary/DiaryEntryList.tsx`).
- **ریسک:** کم.
- **آزمون پذیرش:** `cd frontend && npx vitest run src/components/FirebaseSyncCard.test.tsx` با سنجهٔ نبود ارقام فارسی در حالت `isEn`.
- **بصری؟** بله — فقط متن تاریخ/ساعت در رابط انگلیسی.

**۱۵) #۳۱ — `useMemo` برای Context — OPEN**
- **اصلاح کمینه:** `frontend/src/hooks/useAuth.tsx:146-158` — مقدار provider را در `useMemo` با وابستگی‌های کامل بپیچید و توابع `handle*` را `useCallback` کنید (وگرنه memo بی‌اثر است).
- **ریسک:** متوسط — وابستگی ناقص ⇒ مقدار کهنه در مصرف‌کنندگان.
- **آزمون پذیرش:** `cd frontend && npx vitest run src/hooks/useAuth.test.tsx` با شمارندهٔ رندر مصرف‌کننده: رندر مجدد provider بدون تغییر مقادیر ⇒ صفر رندر اضافه.
- **بصری؟** خیر.

**۱۶) #۲۴ — فیلد و نوع مردهٔ یادآور — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/reminders.ts:230,393` — حذف `micro_prompt_enabled` از نوع/پیش‌فرض؛ `:327` — محدود کردن `kind` به `"checkin"` و حذف شاخهٔ `"sleep"`.
- **ریسک:** کم.
- **آزمون پذیرش:** `cd frontend && npx tsc -p tsconfig.app.json --noEmit` + grep صفر تطبیق برای `micro_prompt_enabled` و `"sleep"`.
- **بصری؟** خیر.

**۱۷) #۲۵ — شرط سه‌گانهٔ بی‌معنا در روز هفته — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/nlDate.ts:42-46` — `if (delta === 0) delta = 7;` و حذف/استفادهٔ واقعی از `forceNext` (یا صریح `forceNext ? 0 : 7` با مستندسازی رفتار «امروز»).
- **ریسک:** کم-متوسط — رفتار پارس «شنبه» در روز شنبه عوض می‌شود.
- **آزمون پذیرش:** `cd frontend && npx vitest run src/lib/nlDate.test.ts` با تاریخ تزریقی و انتظار صریح.
- **بصری؟** بله (تاریخ پیشنهادی تسک).

**۱۸) #۲۶ — «شب» داخل واژه‌هایی مثل «شبکه» — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/nlDate.ts:132` — الگوی مرزدار: `/(?<![\p{L}\u200c])(عصر|بعدازظهر|بعد از ظهر|شب)(?![\p{L}\u200c])/u` (همین الگو در `strip(...)` خط ۱۴۶ هم).
- **ریسک:** کم — نیازمند پشتیبانی lookbehind در هدف build (Vite/esbuild پشتیبانی می‌کند).
- **آزمون پذیرش:** تست واحد: «تماشای شبکه ساعت ۸» ⇒ ساعت ۸:۰۰ نه ۲۰:۰۰. فرمان: `cd frontend && npx vitest run src/lib/nlDate.test.ts`
- **بصری؟** بله (ساعت پارس‌شده).

**۱۹) #۲۷ — اسلش پایانی در `<img />` — OPEN**
- **اصلاح کمینه:** `frontend/src/components/knowledge/PharmacyImageViewer.tsx:12` — پیش از افزودن ویژگی‌ها: `next = next.replace(/\/\s*$/, "");`
- **ریسک:** کم.
- **آزمون پذیرش:** تست واحد: `enhanceImagesHtml('<img src="x" />')` ⇒ `<img src="x" loading="lazy" decoding="async" alt="">`. فرمان: `cd frontend && npx vitest run src/components/knowledge/PharmacyImageViewer.test.ts`
- **بصری؟** خیر.

**۲۰) #۲۸ — فصل شمسی با ماه گرگوری — OPEN**
- **اصلاح کمینه:** `frontend/src/lib/timeBuckets.ts:172` — `const q = Math.floor(jGetMonth(d) / 3);` با import از `date-fns-jalali` (هم‌سبک `frontend/src/lib/timeHorizon.ts:249`).
- **ریسک:** کم — امروز برچسب‌ها تصادفاً درست‌اند؛ تست برچسب فصل باید به‌روزرسانی شود.
- **آزمون پذیرش:** تست واحد برچسب فصل شمسی در تاریخ‌های مرزی (۲۰/۲۱ مارس). فرمان: `cd frontend && npx vitest run src/lib/timeBuckets.test.ts`
- **بصری؟** خیر (مگر در تاریخ مرزی).

**۲۱) #۳۲ — پاک‌سازی دادهٔ دستگاه در خروج از حساب — NEEDS-OWNER-DECISION**
- **گزینه‌های مالک:** (الف) `await clearUserLocalData(previousUid)` در `frontend/src/hooks/useAuth.tsx:104-108` **با تأیید کاربر** پیش از `setUser(null)` — نشتی حریم خصوصی بسته می‌شود ولی صف آفلاین/پیش‌نویس همگام‌نشده از بین می‌رود؛ (ب) پاک‌سازی هنگام ورود کاربر جدید اگر uid عوض شده — همان ریسک از‌دست‌رفتن صف؛ (ج) پذیرش وضعیت فعلی (کش‌ها با uid کلید خورده‌اند و به کاربر بعدی نشان داده نمی‌شوند). توجه: `frontend/src/lib/offlineQueue.ts:277` پاک‌سازی را فقط برای مالک فعال اجازه می‌دهد، پس گزینه (الف) باید **پیش از** پاک‌شدن نشست اجرا شود.
- **ریسک:** متوسط — رفتار نگه‌داری داده کاربر را عوض می‌کند (نه ظاهر).
- **آزمون پذیرش:** `cd frontend && npx vitest run src/lib/offlineQueue.test.ts src/hooks/useAuth.test.tsx` با سنجهٔ فراخوانی `clearUserLocalData(uid)` و خالی‌شدن کلیدهای `tasks:all:{uid}`.
- **بصری؟** خیر.

---

## (ت) توضیح دو مورد REFUTED (تا دوباره گزارش نشوند)

- **#۵:** ادعای «`npm run build` شکست می‌خورد» در این درخت بازتولید نمی‌شود: `npx tsc -p tsconfig.app.json --noEmit` با کد خروج ۰ و صفر خط خطا تمام می‌شود. مکانیزم ادعاشده (ورود `api/_lib/assistantAccess.ts` از راه `frontend/src/lib/taskSchedulePhaseZero.test.ts:3`) هم ناممکن است، چون `api/_lib/taskSchedule.ts` — هم در working tree و هم در `git show HEAD:` — هیچ `import`ی ندارد و به `firebase-admin` وابسته نیست. (تنها دو فایل `src` که از `../api/` import می‌کنند: `lib/taskSchedulePhaseZero.test.ts:3` و `test/modulesServer.test.ts:2`.)
- **#۳۰:** هر دو نمونهٔ گزارش یا حذف شده‌اند (`frontend/src/components/ProcrastinationBusterModal.tsx` کاملاً پاک شده) یا در build تولید حذف می‌شوند: `frontend/vite.config.ts:204` دستور `pure` را برای `console.log/debug/info` در حالت production تنظیم کرده و شاهد باندل این را تأیید می‌کند (`frontend/dist/assets/*.js`: رشتهٔ `pwa-update-available` ۲ بار — یعنی ماژول باندل شده — ولی `AppUpdate` صفر بار).

---

## (ث) یادداشت‌های اجرایی

- **درخت متحرک:** تغییرات uncommittedِ آغاز پایش در میانهٔ کار به commit `308e906` (۷۶ فایل) ثبت شد و پس از آن `869d556` (بودجهٔ تست‌ها) و `1f68f13` (انتقال گزارش‌ها به `docs/audit/`) اضافه شدند؛ اکنون `HEAD = 1f68f13` و درخت تمیز است. همهٔ ۱۶ مورد OPEN/PARTIAL پس از این جابه‌جایی‌ها دوباره خط‌به‌خط بازبینی شدند و هیچ‌کدام تغییر نکرده بود؛ فقط بند ۱۹ (بودجهٔ تست) به‌روز شد. نسخهٔ commit‌شدهٔ گزارش وضعیت در `docs/audit/status-code.md` است؛ همین فایل (`arshnaz-audit/status-code.md`) نسخهٔ تازهٔ این پایش با شاهدهای اجرایی امروز است.
- **نوسان تست:** اجرای کامل روی درخت پیش از commit سه شکست داد (هر سه timeout با بودجهٔ دستی ۱۰ ثانیه)، ولی اجرای هدفمند همان دو فایل پس از افزایش بودجه ⇒ `Test Files 2 passed (2)` · `Tests 28 passed (28)`. یعنی بخشی از آن سه شکست نوسانی/وابسته به بار اجرای کامل بوده است؛ تنها راه بستن قطعی بند ۱۹، هم‌راستا کردن بودجهٔ `InteractiveStudyView.test.tsx:227` (که در HEAD فعلی `1f68f13` هم هنوز `}, 10_000);` است) و سپس دو اجرای کامل پشت‌سرهم بدون شکست است.
- **نکتهٔ خارج از ۳۲ بند:** `frontend/rules-tests/` در لحظهٔ بررسی فقط `vitest.config.ts` دارد و فایل تستی که همان config به آن ارجاع می‌دهد دیده نشد ⇒ احتمال شکست `npm run test:rules` با «no test files found» (مرتبط با گزارش امنیت API، نه این ۳۲ بند).
