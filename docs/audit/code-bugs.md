# گزارش باگ‌های کد و رفتار — ARSHNAZ (فرانت‌اند)

**دامنه:** `Arshiam/frontend/src` — باگ‌های عملکردی و کد (طراحی بصری در گزارش دیگری بررسی می‌شود).
**روش:** خواندن مستقیم فایل‌های واقعی + اجرای الگوهای regex برای تأیید رفتار (فقط read-only). خروجی‌های `typecheck.txt` و `tests.txt` به‌عنوان شاهد محیطی استفاده شده‌اند.
**مجموع یافته‌ها:** ۳۲ مورد — P0: ۱ · P1: ۵ · P2: ۱۳ · P3: ۱۳.

> نکتهٔ مهم: هیچ‌کدام از موارد زیر «سبکی» نیست؛ هر مورد یک مسیر اجرایی مشخص با پیامد قابل مشاهده دارد. مواردی که نتوانستم کنترل‌فلو را کامل تأیید کنم با برچسب **نیازمند تأیید** و آزمایش دقیق لازم مشخص شده‌اند.

---

## ۱۰ باگ مهم (به ترتیب اثر)

۱. **بازنویسی وضعیت ابری بدون بررسی نسخه** — `cloudStateSync.ts:40`: هر دستگاه محلی، `setDoc` را بدون مقایسهٔ `updatedAt` سرور می‌نویسد؛ دستگاهی که آفلاین مانده، وضعیت جدیدتر دستگاه دیگر را پاک می‌کند (تنظیمات، برنامهٔ امروز، باغ، جزیره، اهداف کانبان).
۲. **تخریب HTML چک‌باکس در هر تکرار تسک** — `recurringTaskService.ts:89`: regex روی `data-checked` هم منطبق می‌شود و آن را به `data-` تبدیل می‌کند؛ هر بار که تسک تکرارشونده تکمیل می‌شود، متن کاربر بازنویسی و خراب می‌شود (با اجرای واقعی regex تأیید شد).
۳. **ساخت تسک تکراری «چک‌این روزانه»** — `reminders.ts:360-383`: بررسی تکراری‌بودن فقط تسک‌های «امروز ساخته‌شده» را می‌بیند، پس تسکی که با مکانیزم تکرار به امروز منتقل شده دوباره ساخته می‌شود؛ هر روز یک نسخه اضافه می‌شود. هم‌زمان نتیجهٔ `insert` نادیده گرفته می‌شود و روز «انجام‌شده» علامت می‌خورد (تلف شدن تسک در حالت آفلاین).
۴. **رد شدن دائمی ذخیره/حذف تسک** — `firestoreDataService.ts:230` و `:249`: اگر نسخهٔ مبنا در کش محلی نباشد (کش پاک‌شده، دستگاه جدید، یا شکست `cacheSet`) یا سند قدیمی فیلد `updated_at/updatedAt` نداشته باشد، `ConcurrentEditError` پرتاب می‌شود، تغییر به‌صورت خاموش برگردانده می‌شود و پیام «نسخهٔ ابری تغییر کرده» نمایش داده می‌شود — کاربر هرگز نمی‌تواند ذخیره کند.
۵. **شکستن build پروژه** — `api/_lib/assistantAccess.ts:2-3` از طریق `frontend/src/lib/taskSchedulePhaseZero.test.ts:3` وارد برنامهٔ tsc می‌شود و `npm run typecheck` (و در نتیجه `npm run build`) با دو خطای TS2307 شکست می‌خورد.
۶. **نادیده گرفتن نتیجهٔ fetch موفق** — `features/tasks/taskService.ts:115`: اگر `syncAndroidWidget` مقدار غیر-Promise برگرداند (یا همگام‌سازی ویجت خطا بدهد)، استثنا کل `fetchTasks` را به کش قدیمی برمی‌گرداند؛ همین خط دلیل قطعی شکست دو تست موجود است.
۷. **لیسنرهای Firestore هرگز بسته نمی‌شوند** — `firestoreLive.ts:27`: خروجی `onSnapshot` دور ریخته می‌شود و `registry` فقط در خطا پاک می‌شود؛ هر جدول یک لیسنر دائمی دارد که پس از خروج از حساب هم باقی می‌ماند (نشتی حافظه/شبکه + داده‌های کهنه).
۸. **ورودی صف بدون مالک** — `components/TaskDetail.tsx:568`: `enqueueOp` بدون `ownerId`/`user_id` ثبت می‌شود؛ `canReplayForOwner` همیشه false است، پس این تغییر هیچ‌وقت همگام نمی‌شود و به‌عنوان «تغییر معلق» در صف می‌ماند.
۹. **شکست ولرم بررسی تعارض** — `lib/firestoreSync.ts:230-255`: اگر نه لیسنر زنده باشد و نه کش محلی سند را داشته باشد، بررسی نسخه کاملاً رد می‌شود و نوشتن بدون هیچ کنترلی انجام می‌شود (کامنت خط ۲۵۶ خلاف این را ادعا می‌کند).
۱۰. **محاسبهٔ نادرست streak مطالعه** — `lib/leitnerService.ts:433-445`: کلید روز از `toISOString()` (UTC) ساخته می‌شود، در حالی که روز کاربر محلی است؛ برای UTC+ (ایران ۳:۳۰+، سیدنی ۱۱+) مرز روز جابه‌جا می‌شود و streak کم‌شماری می‌شود.

---

## جدول خلاصه

| # | شدت | باگ | فایل:خط | اثر |
|---|-----|-----|---------|-----|
| ۱ | P0 | نوشتن وضعیت ابری بدون بررسی نسخه | `lib/cloudStateSync.ts:40` | از دست رفتن تنظیمات/برنامهٔ امروز/باغ روی چند دستگاه |
| ۲ | P1 | تخریب `data-checked` در ریست چک‌باکس‌ها | `lib/recurringTaskService.ts:89` | خرابی متن تسک در هر تکرار |
| ۳ | P1 | تسک تکراری چک‌این روزانه | `lib/reminders.ts:360-383` | انبوه‌شدن تسک‌های تکراری + از دست رفتن تسک آفلاین |
| ۴ | P1 | رد شدن ذخیره/حذف با ConcurrentEditError | `lib/firestoreDataService.ts:230,249` | کاربر نمی‌تواند تسک را ذخیره/حذف کند |
| ۵ | P1 | typecheck/build شکسته | `api/_lib/assistantAccess.ts:2-3` | `npm run build` موفق نمی‌شود |
| ۶ | P1 | استثنای ویجت، fetch را باطل می‌کند | `features/tasks/taskService.ts:115` | بازگشت به کش قدیمی و دو تست قرمز |
| ۷ | P2 | لیسنرهای بسته‌نشدهٔ Firestore | `lib/firestoreLive.ts:27` | نشتی حافظه/کوتا + باقی‌ماندن داده پس از خروج |
| ۸ | P2 | صف بدون مالک در TaskDetail | `components/TaskDetail.tsx:568` | تغییر هرگز همگام نمی‌شود |
| ۹ | P2 | fail-open در بررسی نسخه | `lib/firestoreSync.ts:230-262` | بازنویسی سند جدیدتر روی دستگاه تازه |
| ۱۰ | P2 | streak با تاریخ UTC | `lib/leitnerService.ts:433` | آمار نادرست مطالعه |
| ۱۱ | P2 | `isAdmin` همیشه false | `hooks/useUserRole.tsx:15` | پنل مدیریت هرگز فعال نمی‌شود |
| ۱۲ | P2 | `localStorage.setItem` بدون محافظ در مسیر زمانی | `lib/reminders.ts:309,340` | unhandled rejection در حالت private/quota |
| ۱۳ | P2 | fallback به اسکن کل کالکشن روی هر خطای کوئری | `lib/firebaseStore.ts:182-186` | هزینهٔ خواندن بالا + پنهان‌شدن خطا |
| ۱۴ | P2 | `.in()` با بیش از ۱۰ مقدار → خواندن کل کالکشن | `lib/firebaseStore.ts:151-156` | کندی و مصرف سهمیه |
| ۱۵ | P2 | `insert` عملاً upsert است | `lib/firebaseStore.ts:232-281` | نبود تضمین «ایجاد فقط» |
| ۱۶ | P2 | شکست کل تکمیل تکرارشونده با یک زیرتسک حذف‌شده | `lib/recurringTaskService.ts:295` | بن‌بست در تکمیل تسک |
| ۱۷ | P2 | حالت strict، تسک‌های دارای تاریخ را پنهان می‌کند | `lib/timeBuckets.ts:241-256` | ناپدید شدن تسک از نمای باکت |
| ۱۸ | P2 | مقایسهٔ ساعت کلاینت‌ها در بررسی نسخه | `lib/firestoreSync.ts:245-254` | رد شدن ویرایش معتبر روی دستگاه با ساعت عقب |
| ۱۹ | P2 | ۱۷ تست قرمز در ۸ فایل (۲ خطای منطقی + ۱۵ شکست/تایم‌اوت) | `arshnaz-audit/tests.txt` | نبود شبکهٔ اطمینان برای تغییرات |
| ۲۰ | P3 | صفحات/کامپوننت‌های مردهٔ جزیره | `pages/IslandView.tsx:26` و ۴ فایل دیگر | ~حجم و سردرگمی نگهداری |
| ۲۱ | P3 | ۱۶ کامپوننت UI بی‌استفاده | `components/ui/*` | کد و وابستگی مرده |
| ۲۲ | P3 | وابستگی‌های بی‌استفاده | `frontend/package.json:29,30,82,88,94,99,115` | نصب/به‌روزرسانی بی‌دلیل |
| ۲۳ | P3 | شیم تکراری `use-toast` | `components/ui/use-toast.ts:1` | پیاده‌سازی تکراری |
| ۲۴ | P3 | فیلد تنظیمات بی‌استفاده و نوع مردهٔ یادآور | `lib/reminders.ts:230,327` | کد و UI بی‌اثر |
| ۲۵ | P3 | شرط سه‌گانهٔ بی‌معنا در روز هفته | `lib/nlDate.ts:46` | رفتار همیشه «هفتهٔ بعد» |
| ۲۶ | P3 | «شب» داخل واژه‌هایی مثل «شبکه» | `lib/nlDate.ts:132` | تشخیص اشتباه بعدازظهر |
| ۲۷ | P3 | تزریق نادرست ویژگی به `<img />` | `components/knowledge/PharmacyImageViewer.tsx:11` | مارک‌آپ نامعتبر |
| ۲۸ | P3 | ماه گرگوری برای فصل شمسی | `lib/timeBuckets.ts:172` | شکنندگی پنهان |
| ۲۹ | P3 | قالب‌بندی سخت‌کد `fa-IR` در رابط انگلیسی | `components/FirebaseSyncCard.tsx:46`, `FolderAIChat.tsx:231` | ناهماهنگی زبان |
| ۳۰ | P3 | `console.log` در مسیر تولید | `components/ProcrastinationBusterModal.tsx:104`, `lib/versionCheck.ts:48` | نویز کنسول |
| ۳۱ | P3 | Context value در هر رندر ساخته می‌شود | `hooks/useAuth.tsx:142-155` | رندر مجدد کل مصرف‌کنندگان |
| ۳۲ | P3 | خروج از حساب داده‌های قبلی را پاک نمی‌کند | `hooks/useAuth.tsx:100` / `pages/SettingsView.tsx:693` | باقی‌ماندن دادهٔ کاربر قبلی روی دستگاه |

---

## جزئیات

### ۱) نوشتن وضعیت ابری بدون بررسی نسخهٔ سرور (P0)
**شاهد:** `frontend/src/lib/cloudStateSync.ts:35-51`
```ts
const flush = async () => {
  timer = null;
  const local = opts.read();
  if (!local || stopped) return;
  try {
    await setDoc(ref, { updatedAt: local.updatedAt, json: JSON.stringify(local.data) });
  } catch (e) { console.warn(`[cloudState] could not upload ${name}`, e); }
};
```
**چرا باگ است:** مستندات خود ماژول (خط ۱۳) می‌گوید «آخرین نویسنده بر اساس `updatedAt` برنده است»، اما `flush` هیچ‌گاه نسخهٔ سرور را نمی‌خواند و همیشه می‌نویسد. منطق `adoptRemote` (خط ۹۵) فقط زمانی اجرا می‌شود که یک snapshot **دریافت شود**؛ دستگاهی که آفلاین ویرایش کرده و بعد آنلاین می‌شود، بدون دریافت snapshot اول، `setDoc` با `updatedAt` قدیمی‌تر می‌فرستد.
**سناریوی خرابی:** دستگاه A آفلاین «برنامهٔ امروز» را ویرایش می‌کند (`updatedAt = T1`). دستگاه B آنلاین همان بلاب را ویرایش و ذخیره می‌کند (`T2 > T1`). A آنلاین می‌شود؛ در بازهٔ کوتاه پیش از رسیدن snapshot، تایمر ۱۲۰۰ms شلیک می‌شود و `T1` را روی سرور می‌نویسد → کار دستگاه B از بین می‌رود. همین الگو برای `garden.ts:295`, `island.ts:193`, `kanbanGoals.ts:238`, `uiPrefsSync.ts:42`, `todayPlanning.ts:137` تکرار می‌شود.
**اصلاح کمینه:** نوشتن داخل تراکنش با مقایسهٔ نسخه:
```ts
await runTransaction(db, async tx => {
  const snap = await tx.get(ref);
  const remoteAt = snap.exists() ? Number(snap.data().updatedAt || 0) : 0;
  if (local.updatedAt < remoteAt) { opts.apply(snap.data()!.json ? JSON.parse(snap.data()!.json) : null, remoteAt, local); return; }
  tx.set(ref, { updatedAt: local.updatedAt, json: JSON.stringify(local.data) });
});
```

### ۲) regex ریست چک‌باکس، ویژگی `data-checked` را تخریب می‌کند (P1)
**شاهد:** `frontend/src/lib/recurringTaskService.ts:85-89`
```ts
let updated = desc.replace(/- \[[xX]\]/g, "- [ ]");
updated = updated.replace(/data-checked="true"/g, 'data-checked="false"');
updated = updated.replace(/<input\s+([^>]*?)checked(?:="[^"]*")?([^>]*?)>/gi, '<input $1$2>');
```
**تأیید عملی (اجرای واقعی همین regex):**
```
IN : <input type="checkbox" data-checked="true">
OUT: <input type="checkbox" data->
IN : <input data-checked="false" class="x">
OUT: <input data- class="x">
```
**چرا باگ است:** `[^>]*?` می‌تواند `data-` را ببلعد و سپس `checked` داخل `data-checked` را به‌عنوان ویژگی `checked` تطبیق دهد؛ در نتیجه خود ویژگی `data-checked` (که رندرکنندهٔ چک‌لیست به آن تکیه دارد) از بین می‌رود و یک ویژگی بی‌معنای `data-` باقی می‌ماند. این تابع در هر بار تکمیل تسک تکرارشونده روی **متن خود کاربر** اجرا می‌شود (`recurringTaskService.ts:169` و `:244`) و در صورت نیاز چندبار عود (idempotent نیست).
**سناریوی خرابی:** تسکی با چک‌لیست HTML در توضیحات، هر روز تکمیل می‌شود؛ پس از چند روز مارک‌آپ چک‌باکس‌ها به `<input type="checkbox" data->` تبدیل شده و وضعیت «تیک‌خورده/نشده» دیگر قابل بازسازی نیست → نیاز به بازنویسی دستی متن.
**اصلاح کمینه:** فقط ویژگی `checked` واقعی را حذف کنید (مرز واژه‌ای روی نام ویژگی):
```ts
updated = updated.replace(/<input\b([^>]*?)\schecked(?:="[^"]*")?([^>]*)>/gi, "<input$1$2>");
```
یا بهتر: با DOMParser فقط `el.removeAttribute("checked")` و `el.setAttribute("data-checked","false")` را انجام دهید.

### ۳) چک‌این روزانه هر روز یک نسخهٔ تکراری می‌سازد و در آفلاین گم می‌شود (P1)
**شاهد:** `frontend/src/lib/reminders.ts:343-384`
```ts
const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
const { data: existing } = await firebaseStore.from("tasks").select("title")
  .eq("user_id", userId).gte("created_at", startOfDay.toISOString());
const existingTitles = new Set((existing || []).map((t: any) => t.title));
...
if (toInsert.length > 0) { await firebaseStore.from("tasks").insert(toInsert); }
localStorage.setItem(LAST_TASK_KEY, today);
```
**چرا باگ است:** (این مسیر تنها وقتی فعال است که کاربر `auto_create_daily_tasks` را روشن کرده باشد — خط ۳۴۴.) دو اشکال مستقل:
۱. بررسی تکراری‌بودن فقط تسک‌هایی را می‌بیند که **امروز ساخته شده‌اند**. تسک چک‌این روزهای قبل با `recurrence: "daily"` (خط ۳۷۷) توسط `advanceRecurringTask` به امروز منتقل می‌شود ولی `created_at` آن قدیمی است → در مجموعهٔ `existingTitles` نیست → نسخهٔ دوم ساخته می‌شود. با هر روز تکمیل‌نشدن، تعداد نسخه‌ها زیاد می‌شود.
۲. نتیجهٔ `insert` بررسی نمی‌شود و در هر حالت `LAST_TASK_KEY = today` ثبت می‌شود؛ چون این مسیر از outbox استفاده نمی‌کند (`firebaseStore.insert` مستقیم به Firestore می‌نویسد)، در حالت آفلاین تسک ساخته نمی‌شود ولی روز «انجام‌شده» علامت می‌خورد و دیگر تلاشی صورت نمی‌گیرد.
**سناریوی خرابی:** کاربر با اینترنت قطع برنامه را باز می‌کند → چک‌این آن روز هرگز ساخته نمی‌شود. کاربر آنلاین که دیروز چک‌این را تیک زده، امروز دو تسک «چک‌این روزانه 📝» می‌بیند.
**اصلاح کمینه:** تطبیق بر اساس «تسک باز با همان عنوان و برنامهٔ امروز» (نه `created_at`)، و ثبت `LAST_TASK_KEY` تنها پس از موفقیت:
```ts
const already = (existing || []).some(t => t.title === item.title && !t.completed);
...
const { error } = await firebaseStore.from("tasks").insert(toInsert);
if (error && navigator.onLine) return;            // اجازهٔ تلاش دوباره
localStorage.setItem(LAST_TASK_KEY, today);
```

### ۴) رد شدن ذخیره/حذف تسک وقتی نسخهٔ مبنا در دسترس نیست (P1)
**شاهد:** `frontend/src/lib/firestoreDataService.ts:225-238` و `:240-252` و `:376`
```ts
await runTransaction(db, async transaction => {
  const snapshot = await transaction.get(ref);
  if (snapshot.exists()) {
    const remoteRevision = remote?.updated_at ?? remote?.updatedAt;
    if (!expected || typeof remoteRevision !== "string" || remoteRevision !== expected) {
      throw new ConcurrentEditError();       // ← اینجا
    }
  } else if (wasKnownLocal) { throw new ConcurrentEditError(); }
```
**چرا باگ است:** `expected` فقط از کش محلی می‌آید (`previousTask?.updated_at`، خط ۳۷۶). پس:
- روی دستگاه جدید/کش پاک‌شده، یا اگر خودِ `cacheSet` شکست خورده باشد (خط ۳۵۷ خطا را می‌گیرد و ادامه می‌دهد)، `previousTask` تعریف‌نشده است → ذخیرهٔ یک تسک موجود با `ConcurrentEditError` رد می‌شود، `rollbackOptimisticTaskWrite` تغییر را برمی‌گرداند و UI پیام «نسخهٔ ابری تغییر کرده» می‌دهد، در حالی که هیچ تغییر همزمانی رخ نداده است.
- برای سندهای قدیمی که فیلد `updated_at`/`updatedAt` ندارند، `expected` همیشه `undefined` است → این سندها **هرگز** قابل ذخیره یا حذف نیستند. در مسیر حذف (`deleteWithRevision:249`) نتیجهٔ حذف هم به outbox می‌رود ولی `replayQueuedEntityWithOutcome` (`lib/firestoreSync.ts:96-97`) چون `expectedRevision` رشته نیست، آن را دائماً `stale` علامت می‌زند → پیام تکراری «نسخهٔ جدیدتری در فضای ابری وجود دارد» و تغییر معلق دائمی.
**سناریوی خرابی:** کاربر روی دستگاه دوم (یا پس از پاک‌کردن دادهٔ سایت) یک تسک را باز می‌کند، عنوان را تغییر می‌دهد → autosave با خطا برمی‌گردد و ویرایش از بین می‌رود.
**اصلاح کمینه:** در نبود نسخهٔ مبنا، از «درج شرطی بر پایهٔ محتوای محلی» استفاده کنید: اگر `expected === undefined` و سند روی سرور وجود دارد، به‌جای پرتاب خطا، فقط فیلدهای تغییرکرده را با `merge` بنویسید ولی اگر سند **دور از انتظار** تغییر کرده (revision خوانده‌شده از سرور ≠ هیچ‌کدام از دو مقدار) تعارض بدهید؛ و برای پیام خطا، حالت «نسخهٔ نامعلوم» را از «تعارض واقعی» تفکیک کنید.

### ۵) `npm run typecheck` و در نتیجه `npm run build` شکست می‌خورد (P1)
**شاهد:** `arshnaz-audit/typecheck.txt`
```
../api/_lib/assistantAccess.ts(2,66): error TS2307: Cannot find module 'firebase-admin/app' ...
../api/_lib/assistantAccess.ts(3,30): error TS2307: Cannot find module 'firebase-admin/firestore' ...
```
و مسیر ورود به برنامهٔ tsc: `frontend/src/lib/taskSchedulePhaseZero.test.ts:3`
```ts
import { scheduleWrite, taskDayOf } from "../../../api/_lib/taskSchedule";
```
**چرا باگ است:** `frontend/package.json:9` می‌گوید `"build": "npm run typecheck && vite build"`؛ پس با وجود این دو خطا، خروجی تولیدی هرگز ساخته نمی‌شود. ریشه: یک فایل تست داخل `src` (که `tsconfig.app.json` با `"include": ["src"]` آن را وارد می‌کند) کد سمت سرور را import می‌کند و آن کد به `firebase-admin` نیاز دارد که در `frontend/node_modules` نصب نیست (فقط در `Arshiam/node_modules`).
**اصلاح کمینه:** مسیرهای تستی سرور را از برنامهٔ tsc فرانت جدا کنید (`exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"]` در `tsconfig.app.json` به‌همراه یک `tsconfig.test.json` برای vitest) یا حداقل import را به `import type`/mock تبدیل کنید.

### ۶) یک خطای جانبی ویجت، نتیجهٔ موفق fetch را دور می‌ریزد (P1)
**شاهد:** `frontend/src/features/tasks/taskService.ts:108-116`
```ts
if (!accepted) return getCachedTasks(userId);
void syncAndroidWidget(tasks, userId).catch(() => {});   // ← خط ۱۱۵
return tasks;
```
**شاهد محیطی (tests.txt):**
```
stderr | src/features/tasks/taskService.test.ts > fetchTasks cache completeness > ...
[TaskService] Firestore fetch warning: TypeError: Cannot read properties of undefined (reading 'catch')
    at Module.fetchTasks (...\src\features\tasks\taskService.ts:115:35)
```
**چرا باگ است:** فراخوانی درون `try` قرار دارد؛ اگر `syncAndroidWidget` به‌جای Promise مقدار `undefined` برگرداند (یا پیش از بازگشت استثنا بدهد — مثلاً پل بومی Capacitor در دسترس نباشد)، خودِ `.catch` استثنا می‌دهد، کنترل به `catch` بیرونی می‌رود و دادهٔ تازهٔ سرور کنار گذاشته می‌شود؛ کاربر فهرست قدیمی کش را می‌بیند بدون هیچ نشانه‌ای از خطا. همین رفتار دو تست موجود را قرمز کرده است (`taskService.test.ts:294` و `:318`).
**اصلاح کمینه:**
```ts
try { void Promise.resolve(syncAndroidWidget(tasks, userId)).catch(() => {}); } catch { /* widget sync is best-effort */ }
return tasks;
```
و در تست، mock را به `vi.fn().mockResolvedValue(undefined)` تغییر دهید.

### ۷) لیسنرهای Firestore هرگز بسته نمی‌شوند (P2)
**شاهد:** `frontend/src/lib/firestoreLive.ts:26-51`
```ts
const fallback = setTimeout(() => settle(gotSnapshot), 6000);
onSnapshot(collection(db, "users", uid, table),
  (snap) => { ... },
  (error) => { entry.failed = true; registry.delete(key); ... });
```
**چرا باگ است:** مقدار بازگشتی `onSnapshot` (تابع unsubscribe) ذخیره نمی‌شود و هیچ API برای بستن لیسنر وجود ندارد؛ `registry` فقط زمانی پاک می‌شود که لیسنر خطا بدهد. برای هر `(uid, table)` یک لیسنر دائمی تا پایان عمر تب باقی می‌ماند.
**سناریوی خرابی:** کاربر مهمان وارد می‌شود، سپس از حساب خارج و با حساب دیگری وارد می‌شود → لیسنرهای حساب قبلی فعال می‌مانند (مصرف شبکه/سهمیه، نگه‌داشتن ردیف‌های حساب قبلی در حافظه)، و هر بار بازدید یک صفحهٔ جدید، برای جدول‌های تازه لیسنر اضافه می‌شود.
**اصلاح کمینه:** نگه‌داشتن `unsubscribe` در `Entry` و افزودن `releaseLiveTable(uid, table)`؛ صدا زدن آن در `signOut` (`hooks/useAuth.tsx:100`) و هنگام تغییر uid در `AuthProvider`.

### ۸) تغییر صف‌شده بدون مالک، هرگز همگام نمی‌شود (P2)
**شاهد:** `frontend/src/components/TaskDetail.tsx:564-571`
```ts
const queued = await enqueueOp({ table: "tasks", op: "update", payload: patch, match: { id: current.id } });
```
**چرا باگ است:** `enqueueOps` در نبود `ownerId` سراغ `getAuthenticatedUserId()` می‌رود (`lib/offlineQueue.ts:75-80`) که در همین مسیر تعریف‌نشده است (کامنت خط ۵۶۵ خودش می‌گوید «احراز هویت موقتاً در دسترس نیست»). چون `payload` هم `user_id` ندارد و `match` فقط `id` است، `getQueuedOpOwnerId` مقدار `undefined` می‌دهد و `canReplayForOwner` (`offlineQueue.ts:150`) همیشه false است → این تغییر در `flushQueue` پرش می‌شود و تا ابد در صف می‌ماند؛ کاربر فقط با «دریافت نسخهٔ محلی برای بازیابی» آن را می‌بیند. علاوه بر این، `op: "update"` بدون `expectedRevision` در مسیر تسک‌ها (`replayQueuedEntityWithOutcome`) قطعاً `stale` می‌شود.
**اصلاح کمینه:** اگر `user` در دسترس نیست، تغییر را در پیش‌نویس محلی (`writeTaskDraft`) نگه دارید و منتظر بازگشت احراز هویت بمانید؛ یا حداقل `expectedRevision` و `user_id` را در payload قرار دهید.

### ۹) بررسی نسخه در `saveEntityToFirestoreWithOutcome` به‌صورت fail-open عمل می‌کند (P2)
**شاهد:** `frontend/src/lib/firestoreSync.ts:230-262`
```ts
let remoteData = liveDoc(userId, collectionName, docId);
if (remoteData === undefined) {
  try { const cached = await getDocFromCache(docRef); remoteData = cached.exists() ? cached.data() : null; }
  catch { remoteData = null; }
}
if (remoteData) { ... if (remoteTime > localTime) return "stale"; }
...
await setDoc(docRef, { ...stripUndefinedDeep(data), ... }, { merge: true });
```
**چرا باگ است:** کامنت خط ۲۵۷-۲۵۸ می‌گوید در نبود نسخهٔ خوانا نوشتن «رد می‌شود»، اما این فقط در شاخهٔ `catch` درست است: زمانی که `getDocFromCache` موفق شود ولی سند در کش نباشد (دستگاه تازه، persistence خالی)، `remoteData = null` می‌شود و بررسی کاملاً رد می‌شود → نوشتن روی سند جدیدترِ سرور بدون هیچ کنترلی.
**سناریوی خرابی:** دستگاه تازه با همان حساب، یک یادداشت را ذخیره می‌کند → نسخهٔ دستگاه دیگر بی‌سروصدا بازنویسی می‌شود.
**اصلاح کمینه:** وقتی هیچ نسخهٔ خوانایی نداریم و کاربر آنلاین است، پیش از نوشتن یک `getDoc` سروری بگیرید یا در `catch`/`null` نتیجه را `"failed"` برگردانید (همان‌طور که کامنت ادعا می‌کند).
**وضعیت:** بخش «کش خالی در حالت آفلاین» **نیازمند تأیید** است؛ آزمایش: با `persistence` خالی و بدون لیسنر زنده، ذخیرهٔ سندی که روی سرور وجود دارد و بررسی اینکه آیا نتیجه `"saved"` است.

### ۱۰) آمار streak بر پایهٔ روز UTC (P2)
**شاهد:** `frontend/src/lib/leitnerService.ts:432-448`
```ts
const checkDate = new Date(now);
while (true) {
  const key = checkDate.toISOString().slice(0, 10);
  if (reviewDates.has(key)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
```
و کلید کارت‌ها در خط ۴۲۸ (`c.last_reviewed_at.slice(0, 10)`) هم روز UTC است.
**چرا باگ است:** «امروز» کاربر یک روز محلی است ولی کلیدها با `toISOString()` (UTC) ساخته می‌شوند. برای ایران (۳:۳۰+) هر مرور پیش از ساعت ۰۳:۳۰ بامداد و برای سیدنی (۱۱+) هر مرور پیش از ساعت ۱۱ صبح به روز قبل نسبت داده می‌شود؛ اگر کاربر دو روز محلی پشت‌سرهم مرور کند ولی هر دو در یک روز UTC بیفتند، streak یکی کم می‌شود.
**اصلاح کمینه:** از یک helper محلی استفاده کنید: `const key = toLocalISO(checkDate)` (`lib/timeHorizon.ts:57`) و همان helper را در خط ۴۲۸ هم به کار ببرید (یا `last_reviewed_at` را در بدو ثبت به روز محلی تبدیل کنید).

### ۱۱) `isAdmin` هرگز true نمی‌شود (P2)
**شاهد:** `frontend/src/hooks/useUserRole.tsx:15`
```ts
const tokenResult = await (user as any).getIdTokenResult?.();
```
**چرا باگ است:** `user` اینجا `AppUser` است — یک شیء ساده که در `hooks/useAuth.tsx:69-84` ساخته می‌شود و متد `getIdTokenResult` ندارد. فراخوانی اختیاری (`?.`) مقدار `undefined` برمی‌گرداند، `claims` خالی می‌ماند و `isAdmin` همیشه `false` است. یعنی شرط سرور-محور ادعاشده در کامنت خط ۱۴ هرگز ارزیابی نمی‌شود و اگر روزی `capabilities.ts:25` فعال شود، پنل مدیریت برای ادمین واقعی هم باز نمی‌شود.
**اصلاح کمینه:** از `auth.currentUser?.getIdTokenResult()` استفاده کنید (Firebase user واقعی) یا `getIdTokenResult` را در `AppUser` از `fbUser` کپی کنید.

### ۱۲) نوشتن بدون محافظ در `localStorage` داخل مسیر زمانی (P2)
**شاهد:** `frontend/src/lib/reminders.ts:309` و `:340`
```ts
localStorage.setItem(FIRED_TASKS_KEY, JSON.stringify(fired));   // خط ۳۰۹
...
localStorage.setItem(LAST_NOTIFY_KEY, JSON.stringify(stored));   // خط ۳۴۰
```
**چرا باگ است:** بقیهٔ ماژول‌ها `setItem` را در `try/catch` می‌پیچند (مثلاً `lib/jalali.ts:21`)، ولی این دو جا نه. در حالت private/سهمیهٔ پر، `setItem` پرتاب می‌کند؛ تابع `async` است و از `components/RemindersRunner.tsx:37-38` با `await` و از خط ۵۸ بدون `catch` (پرامیس شناور) صدا زده می‌شود → unhandled rejection در هر تیک ۶۰ ثانیه‌ای، و کل تابع یادآورها نیمه‌کاره رها می‌شود (یادآورهای بعدی همان تیک اجرا نمی‌شوند).
**اصلاح کمینه:** `try { localStorage.setItem(...) } catch { /* ignore */ }` و افزودن `.catch()` به `tick()` در `RemindersRunner.tsx:58`.

### ۱۳) هر خطای کوئری به اسکن کامل کالکشن تبدیل می‌شود (P2)
**شاهد:** `frontend/src/lib/firebaseStore.ts:174-186`
```ts
} catch (queryErr) {
  // Fallback: If composite index missing or query incompatible, gracefully fallback to client filtering
  snapshot = await getDocs(colRef);
  hasClientOnlyFilter = true;
}
```
**چرا باگ است:** این `catch` همهٔ خطاها را یکسان می‌بیند — از نبود ایندکس ترکیبی تا قطع شبکه، رد شدن دسترسی و سهمیهٔ تمام‌شده. در حالت آفلاین این یعنی هر کوئری ناموفق یک بار دیگر کل کالکشن را می‌خواند (هزینهٔ بالا در `users/{uid}/tasks` با هزاران سند) و خطای اصلی هرگز گزارش/مدیریت نمی‌شود.
**اصلاح کمینه:** فقط برای خطای `failed-precondition` (نبود ایندکس) fallback بگیرید و در غیر این صورت `{ data: null, error }` برگردانید.

### ۱۴) فیلتر `in` با بیش از ۱۰ مقدار → خواندن کل کالکشن (P2)
**شاهد:** `frontend/src/lib/firebaseStore.ts:151-156`
```ts
} else if (filter.operator === "in" && Array.isArray(filter.value)) {
  if (filter.value.length > 0 && filter.value.length <= 10) constraints.push(fsWhere(filter.field, "in", filter.value));
  else hasClientOnlyFilter = true;
```
**چرا باگ است:** با `hasClientOnlyFilter = true` هم `limit` و هم `orderBy` سروری حذف می‌شوند (خطوط ۱۶۶ و ۱۷۰) و کل کالکشن خوانده و در کلاینت فیلتر می‌شود — بدون هیچ هشداری. مصرف‌کننده‌های واقعی: `lib/recurringTaskService.ts:276` (`.in("task_id", ...)` روی همهٔ زیرتسک‌ها) و `features/tasks/taskService.ts:240` و `:291` (`.in("task_id", idsToDelete)` روی `task_knowledge_links` و `task_tags`). برای یک تسک با ۱۱ زیرتسک، هر تکمیل تکرارشونده یک اسکن کامل چند کالکشن است.
**اصلاح کمینه:** تقسیم به دسته‌های ۱۰تایی و اجرای موازی کوئری‌ها (`chunk(values, 10).map(...)`) به‌جای حذف کامل فیلتر.

### ۱۵) `insert` در واقع `upsert` است (P2)
**شاهد:** `frontend/src/lib/firebaseStore.ts:232-238` و `:270-282`
```ts
insert(input: Row | Row[]) { return new FirestoreMutation<Row[]>(this, () => this.write(input, false)); }
...
private async write(input: Row | Row[], _merge: boolean, onConflict?: string) {   // _merge استفاده نمی‌شود
  ...
  await setDoc(doc(db, "users", userId, this.table, id), row, { merge: true });
```
**چرا باگ است:** پارامتر `_merge` هرگز خوانده نمی‌شود و همیشه `merge: true` نوشته می‌شود؛ پس `insert` روی یک `id` موجود، بی‌صدا سند قبلی را ادغام می‌کند (نه خطا، نه بازنویسی کامل). کدهایی که برای «جلوگیری از رکورد تکراری» به شکست `insert` تکیه می‌کنند (مثلاً `lib/reminders.ts:381`) هیچ تضمینی ندارند.
**اصلاح کمینه:** از `merge: false` (یا `setDoc` بدون merge) برای `insert` استفاده کنید و در صورت نیاز به «ایجاد در صورت نبود» یک تراکنش با `get` بنویسید.

### ۱۶) یک زیرتسک حذف‌شده، کل تکمیل تسک تکرارشونده را می‌بندد (P2) — نیازمند تأیید
**شاهد:** `frontend/src/lib/recurringTaskService.ts:290-299`
```ts
const snapshots = await Promise.all([...taskRefs, ...stepRefs].map(ref => transaction.get(ref)));
if (snapshots.some(snapshot => !snapshot.exists())) throw new Error("Recurring task changed before it could be advanced");
...
if (currentParent && JSON.stringify(readSchedule(currentParent, settings)) !== JSON.stringify(schedule)) {
  throw new Error("Recurring task schedule changed before it could be advanced");
}
```
**چرا باگ است:** فهرست زیرتسک‌ها از کش محلی خوانده می‌شود (خط ۲۱۹). اگر یکی از آن‌ها همان لحظه روی دستگاه دیگر حذف شده باشد، `transaction.get` سند ناموجود برمی‌گرداند، کل تراکنش لغو و خطای عمومی برگردانده می‌شود (`{ success: false }` در خط ۳۰۷) — یعنی کاربر در آن لحظه **نمی‌تواند** تسک تکرارشونده را تکمیل کند و پیام قابل‌فهمی هم نمی‌بیند؛ فقط با رفرش کش درست می‌شود.
**آزمایش لازم:** حذف یک زیرتسک از دستگاه دوم و سپس تیک‌زدن تسک والد؛ انتظار: تکمیل با نادیده‌گرفتن زیرتسک ناموجود (یا پیام مشخص)، نه شکست کامل.
**اصلاح کمینه:** زیرتسک‌های ناموجود را از `taskPatches` حذف کنید و تنها در صورت ناموجود بودن **خودِ والد** خطا بدهید.

### ۱۷) حالت strict، تسک‌های دارای تاریخ را از نمای باکت پنهان می‌کند (P2)
**شاهد:** `frontend/src/lib/timeBuckets.ts:240-256`
```ts
if (!hierarchical || (options.selectedBucketKinds && options.selectedBucketKinds.length > 0)) {
  const targetKinds = ...;
  if (task.bucket_kind && targetKinds.includes(task.bucket_kind)) { ... }
  return { matches: false, matchReason: "none" };     // ← بررسی «تاریخ دقیق» انجام نمی‌شود
}
```
**چرا باگ است:** بررسی بخش «A. تاریخ دقیق» (خط ۲۶۲) فقط در حالت سلسله‌مراتبی اجرا می‌شود؛ پس با `hierarchical: false` یک تسک که `work_date` آن دقیقاً داخل بازهٔ باکت است، تطبیق نمی‌خورد و از نما ناپدید می‌شود.
**وضعیت:** تنها مصرف‌کنندهٔ فعلی `pages/TasksView.tsx:557` با `hierarchical: true` است، بنابراین این مسیر امروز فقط توسط تست (`lib/timeBuckets.test.ts:108`) اجرا می‌شود — یعنی **کد مرده/تله‌گذاری‌شده**: هر توسعه‌دهنده‌ای که تنظیم strict را وصل کند، تسک‌های دارای تاریخ را از دست می‌دهد.
**اصلاح کمینه:** بررسی تاریخ دقیق را پیش از شاخهٔ strict انجام دهید، یا در `strict` صریحاً تسک‌های تاریخ‌دار را نیز شامل کنید.

### ۱۸) مقایسهٔ ساعت کلاینت‌ها در بررسی نسخه (P2) — نیازمند تأیید
**شاهد:** `frontend/src/lib/firestoreSync.ts:245-254`
```ts
const remoteUpdatedAt = remoteData?.updated_at || remoteData?.updatedAt;
const localUpdatedAt = data.updated_at || data.updatedAt;
if (remoteUpdatedAt && localUpdatedAt) {
  if (new Date(remoteUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()) return "stale";
}
```
**چرا مشکوک است:** `updated_at` را خود کلاینت‌ها با ساعت دستگاه می‌نویسند (`firestoreDataService.ts:335`, `firebaseStore.ts:271`)؛ با اختلاف ساعت بین دو دستگاه، دستگاهِ با ساعت عقب‌تر ویرایش معتبر خود را همیشه «stale» می‌بیند و دستگاه با ساعت جلوتر می‌تواند روی سند جدیدتر بنویسد. کامنت خط ۲۴۲-۲۴۴ این را می‌پذیرد ولی راه‌حلی ندارد.
**آزمایش لازم:** دو پروفایل مرورگر با ساعت‌های دستی متفاوت (اختلاف ۱۰ دقیقه) و یک ویرایش روی هرکدام؛ بررسی کنید کدام ویرایش رد می‌شود.

### ۱۹) وضعیت تست‌ها: ۱۷ تست قرمز و شکاف‌های پوشش (P2)
**شاهد:** `arshnaz-audit/tests.txt` (خروجی اجرای واقعی)
خطاهای منطقی (تایم‌اوت ناشی از کندی نیستند):
```
× fetchTasks cache completeness > does not persist an older response after a newer fetch has finished 34ms
× fetchTasks cache completeness > preserves known tasks for an offline partial fetch and accepts an empty server list 33ms
   → TypeError: Cannot read properties of undefined (reading 'catch')   (taskService.ts:115)
```
بقیهٔ ۱۵ شکست در ۷ فایل (عمدتاً Timeout در محیط jsdom):
```
❯ src/pages/InteractiveStudyView.test.tsx        (10 tests | 1 failed)
❯ src/components/review/KnowledgeMindMapView.test.tsx (18 tests | 3 failed)
❯ src/pages/KnowledgeBaseView.test.tsx           (11 tests | 2 failed)
❯ src/components/knowledge/AiQuestionGeneratorModal.test.tsx (6 tests | 3 failed)
❯ src/components/TaskAIPanel.test.tsx            (6 tests | 3 failed)
❯ src/components/knowledge/KnowledgeDocumentEditorModal.test.tsx (3 tests | 2 failed)
❯ src/pages/TasksView.split.test.tsx             (5 tests | 1 failed)
```
(جمع: ۱۷ تست قرمز در ۸ فایل — از `arshnaz-audit/tests.txt`)
**چرا مهم است:** شبکهٔ اطمینان پروژه در وضعیت قرمز است؛ هر تغییر بعدی در همان ماژول‌ها بدون علامت هشدار عبور می‌کند. همچنین هیچ تستی برای «بازنویسی وضعیت ابری» (`cloudStateSync.flush`) و «چک‌این روزانه» (`ensureDailyTasks`) وجود ندارد — دو موردی که در همین گزارش P0/P1 هستند.
**اصلاح کمینه:** تثبیت mock‌ها (Promise-محور)، جدا کردن تست‌های سنگین jsdom با `testTimeout` بالاتر یا انتقال منطق به تست‌های خالص، و افزودن تست رگرسیون برای موارد ۱ و ۳.

### ۲۰) صفحات و کامپوننت‌های مردهٔ «جزیره» (P3)
**شاهد:** `frontend/src/pages/IslandView.tsx:26` (`export default function IslandView()`) — هیچ import یابنده‌ای در `App.tsx` یا جای دیگر وجود ندارد (جست‌وجوی کل `src` فقط همین تعریف را برمی‌گرداند؛ مسیرهای `/app` در `App.tsx:325-384` هیچ مسیری برای جزیره ندارند). با آن، این فایل‌ها هم یتیم می‌شوند:
- `components/island/IslandScene.tsx` (فقط `IslandView` آن را import می‌کند، خط ۹)
- `components/island/IslandAlbum.tsx` (خط ۱۱ همین فایل)
- `components/island/IslandUnlockCelebration.tsx:39` — بدون هیچ import
- `components/island/IslandMiniCard.tsx:15` — بدون هیچ import
- `components/garden/MiniGardenCard.tsx:15` — بدون هیچ import
**چرا مهم است:** کد مرده‌ای که ظاهر فعال دارد (`lib/island.ts` زنده است و وضعیت جزیره را ذخیره/همگام می‌کند) → نگه‌داری دو نسخه از ذهنیت «جزیره»، حجم بستهٔ نامشخص و سردرگمی برای تغییرات آینده.
**اصلاح کمینه:** اگر صفحهٔ جزیره حذف شده، هر پنج فایل + دارایی‌های مربوطه را پاک کنید؛ اگر قرار است برگردد، یک مسیر واقعی در `App.tsx` اضافه کنید.

### ۲۱) کامپوننت‌های UI بی‌استفاده (P3)
**شاهد:** بررسی خودکار importها در `components/ui` نشان داد این فایل‌ها هیچ مصرف‌کننده‌ای در `src` ندارند:
`alert.tsx`، `aspect-ratio.tsx`، `breadcrumb.tsx`، `calendar.tsx`، `carousel.tsx`، `chart.tsx`، `context-menu.tsx`، `form.tsx`، `hover-card.tsx`، `input-otp.tsx`، `menubar.tsx`، `navigation-menu.tsx`، `pagination.tsx`، `resizable.tsx`، `table.tsx`، `toggle-group.tsx`
**اصلاح کمینه:** حذف فایل‌ها (و در صورت تمایل، نگه‌داشتن آن‌ها در یک پوشهٔ `_unused` خارج از build) — همراه با مورد ۲۲.

### ۲۲) وابستگی‌های بی‌استفاده در `frontend/package.json` (P3)
**شاهد:** جست‌وجوی import در کل `frontend` (بدون هیچ نتیجه):
- `@floating-ui/dom` (خط ۲۹)
- `@hookform/resolvers` (خط ۳۰) و `react-hook-form` (خط ۹۶) — تنها مصرف‌کننده `components/ui/form.tsx` بود که خودش بی‌استفاده است
- `embla-carousel-react` (خط ۸۲) — فقط در `components/ui/carousel.tsx` بی‌استفاده
- `input-otp` (خط ۸۸) — فقط در `components/ui/input-otp.tsx` بی‌استفاده
- `react-day-picker` (خط ۹۴) — فقط در `components/ui/calendar.tsx` بی‌استفاده
- `react-resizable-panels` (خط ۹۹) — فقط در `components/ui/resizable.tsx` بی‌استفاده
- `zod` (خط ۱۱۵) — هیچ importی ندارد
**توجه:** `@radix-ui/*` مربوط به همان کامپوننت‌های بی‌استفاده (`react-aspect-ratio`, `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-toggle-group`) هم قابل حذف‌اند؛ پیش از حذف `workbox-build` (خط ۱۱۳) و `vite-plugin-pwa` (خط ۱۱۲) جوانب `vite.config.ts` را بررسی کنید (این دو **مصرف‌کنندهٔ غیرمستقیم** دارند).
**اصلاح کمینه:** حذف موارد بالا از `dependencies` و اجرای مجدد `npm run build`.

### ۲۳) شیم تکراری `use-toast` (P3)
**شاهد:** `frontend/src/components/ui/use-toast.ts:1`
```ts
import { useToast, toast } from "@/hooks/use-toast";
```
**چرا:** این فایل فقط re-export است و هیچ‌جا import نمی‌شود (`components/ui/toaster.tsx:1` مستقیم از `@/hooks/use-toast` می‌گیرد) → نسخهٔ دوم همان hook که فقط سردرگمی می‌سازد.
**اصلاح کمینه:** حذف `components/ui/use-toast.ts`.

### ۲۴) فیلد تنظیمات بی‌استفاده و نوع مردهٔ یادآور (P3)
**شاهد:** `frontend/src/lib/reminders.ts:230`
```ts
micro_prompt_enabled: boolean;
```
و `frontend/src/lib/reminders.ts:327-337`
```ts
const tryFire = (kind: "sleep" | "checkin", enabled: boolean, time: string, ...) => {...}
tryFire("checkin", s.checkin_reminder_enabled, s.checkin_reminder_time, ...);
```
**چرا:** `micro_prompt_enabled` در سراسر `src` فقط در همین تعریف و مقدار پیش‌فرض (خط ۳۹۳) دیده می‌شود — نه نوشته می‌شود و نه خوانده؛ و شاخهٔ `"sleep"` هیچ‌وقت صدا زده نمی‌شود، پس فیلد `stored.sleep` هم هرگز مقدار نمی‌گیرد (کد و شرط مرده).
**اصلاح کمینه:** حذف `micro_prompt_enabled` از نوع/پیش‌فرض‌ها (یا اتصال آن به UI) و محدود کردن `kind` به `"checkin"`.

### ۲۵) شرط سه‌گانهٔ بی‌معنا در محاسبهٔ روز هفته (P3)
**شاهد:** `frontend/src/lib/nlDate.ts:42-48`
```ts
let delta = (target - d.getDay() + 7) % 7;
if (delta === 0) delta = forceNext ? 7 : 7; // always the upcoming one, not today
```
**چرا:** هر دو شاخهٔ شرط `7` هستند، پس پارامتر `forceNext` هیچ اثری ندارد و خواننده را فریب می‌دهد. ضمناً چون `forceNext` همیشه `true` پاس داده می‌شود (خط ۱۲۱)، نوشتن «شنبه» در روز شنبه به شنبهٔ **هفتهٔ بعد** تبدیل می‌شود — رفتاری که باید صریح و مستند باشد.
**اصلاح کمینه:** `if (delta === 0) delta = 7;` و حذف پارامتر `forceNext` یا استفادهٔ واقعی از آن.

### ۲۶) تشخیص اشتباه بعدازظهر با واژه‌های حاوی «شب» (P3)
**شاهد:** `frontend/src/lib/nlDate.ts:132-133`
```ts
const isPm = /(عصر|بعدازظهر|بعد از ظهر|شب)/.test(working);
```
**چرا:** الگو مرز واژه ندارد؛ «شبکه»، «شبانه»، «جشن شب…» همه `isPm` را true می‌کنند. با ورودی «تماشای شبکه ساعت ۸» ساعت ۸ به ۲۰:۰۰ تبدیل می‌شود.
**اصلاح کمینه:** استفاده از مرز واژه با حروف فارسی: `/(?<![\p{L}\u200c])(عصر|بعدازظهر|بعد از ظهر|شب)(?![\p{L}\u200c])/u`.

### ۲۷) تزریق ویژگی به `<img ... />` مارک‌آپ را نامعتبر می‌کند (P3)
**شاهد:** `frontend/src/components/knowledge/PharmacyImageViewer.tsx:11-16`
```ts
return html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
  let next = attrs;
  if (!/\sloading=/i.test(next)) next += ' loading="lazy" decoding="async"';
  ...
  return `<img${next}>`;
});
```
**چرا:** برای تگ‌های خودبسته `<img src="x" />`، مقدار `attrs` با `/` تمام می‌شود و نتیجه `<img src="x" / loading="lazy" decoding="async">` است — اسلش در میانهٔ تگ. مرورگرها آن را تحمل می‌کنند ولی مارک‌آپ خروجی نامعتبر است و هر ابزار پردازش HTML بعدی می‌تواند آن را متفاوت تفسیر کند.
**اصلاح کمینه:** حذف `/` انتهایی پیش از افزودن ویژگی‌ها: `next = next.replace(/\/\s*$/, "")`.

### ۲۸) استفاده از ماه گرگوری برای فصل شمسی (P3)
**شاهد:** `frontend/src/lib/timeBuckets.ts:170-176`
```ts
if (kind === "quarter") {
  if (calendar === "jalali") {
    const q = Math.floor(d.getMonth() / 3);      // ← getMonth گرگوری است
```
**چرا اشکال دارد:** `d` یک `Date` گرگوری است؛ در شاخهٔ شمسی باید `getMonth` از `date-fns-jalali` استفاده شود (همان‌طور که در `lib/timeHorizon.ts:249` درست انجام شده: `Math.floor(j.getMonth(a) / 3)`). این کد فعلاً «تصادفاً» درست کار می‌کند چون شروع فصل‌های شمسی (~۲۱ مارس/ژوئن/سپتامبر/دسامبر) در همان ماه‌های گرگوری ۲/۵/۸/۱۱ می‌افتد؛ اما هر تغییر در مبدأ باکت یا تقویم، برچسب فصل را بی‌سروصدا غلط می‌کند.
**اصلاح کمینه:** `const q = Math.floor(jGetMonth(d) / 3);` با import از `date-fns-jalali`.

### ۲۹) قالب‌بندی سخت‌کد `fa-IR` در رابط انگلیسی (P3)
**شاهد:** `frontend/src/components/FirebaseSyncCard.tsx:46` و `:241`
```ts
setLastVerified(new Date().toLocaleTimeString("fa-IR"));
...
{new Date(stats.lastSyncedAt).toLocaleString("fa-IR")}
```
و `frontend/src/components/FolderAIChat.tsx:231` (`toLocaleDateString("fa-IR")`).
**چرا:** بقیهٔ برنامه با `isEn ? "en-US" : "fa-IR"` کار می‌کند؛ این موارد در حالت انگلیسی هم تاریخ/ساعت فارسی نشان می‌دهند (و `FirebaseSyncCard` حتی در متن انگلیسی). برای کاربر انگلیسی‌زبان ناهماهنگ و گیج‌کننده است.
**اصلاح کمینه:** استفاده از همان الگوی `isEn ? "en-GB" : "fa-IR"` یا helper مشترک `lib/localeFormat.ts`.

### ۳۰) `console.log` در مسیر تولید (P3)
**شاهد:** `frontend/src/components/ProcrastinationBusterModal.tsx:104` (`console.log("[Buster] Using smart local heuristic engine.")`) و `frontend/src/lib/versionCheck.ts:48` (`console.log("[AppUpdate] New version detected:", data)`).
**چرا:** نویز کنسول کاربر و افشای جزئیات داخلی در ابزار توسعه؛ در بقیهٔ کد از `console.warn/info` با برچسب استفاده شده است.
**اصلاح کمینه:** حذف یا محدود کردن به `import.meta.env.DEV`.

### ۳۱) مقدار Context در هر رندر بازساخته می‌شود (P3)
**شاهد:** `frontend/src/hooks/useAuth.tsx:142-155`
```tsx
<AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut, setUser, signInWithEmail: handleSignInEmail, ... }}>
```
**چرا:** شیء literal در هر رندر `AuthProvider` هویت جدید می‌گیرد؛ همهٔ مصرف‌کنندگان `useAuth` (از جمله کل `ProtectedRoute` و هر صفحه) دوباره رندر می‌شوند، حتی اگر مقادیر تغییر نکرده باشند. عملاً هر `setUser/setSession/setLoading` یک رندر سراسری اضافه می‌سازد.
**اصلاح کمینه:** `const value = useMemo(() => ({...}), [user, session, loading, handleSignOut, ...])` یا شکستن به دو context (user / actions).

### ۳۲) خروج از حساب، دادهٔ کاربر قبلی را روی دستگاه باقی می‌گذارد (P3)
**شاهد:** `frontend/src/hooks/useAuth.tsx:100-104`
```ts
const handleSignOut = async () => { await logoutUser(); setUser(null); setSession(null); };
```
در حالی که تابع پاک‌سازی موجود (`lib/offlineQueue.ts:213 clearUserLocalData`) فقط از `pages/SettingsView.tsx:693` (دکمهٔ دستی «پاک‌کردن دادهٔ دستگاه») صدا زده می‌شود.
**چرا مهم است:** روی دستگاه مشترک/گم‌شده، تسک‌ها، یادداشت‌ها، صف آفلاین و کش‌های `tasks:all:{uid}` در IndexedDB و localStorage باقی می‌مانند. مسیر برنامه (کش بر اساس uid) آن‌ها را به کاربر بعدی نشان نمی‌دهد، پس این یک نشتی حریم خصوصی است نه نمایش اشتباه.
**اصلاح کمینه:** در `handleSignOut` پیش از `setUser(null)` یک `await clearUserLocalData(previousUid)` (با تأیید کاربر) اجرا کنید، یا در ورود کاربر جدید اگر uid تغییر کرده، دادهٔ حساب‌های دیگر را پاک کنید.

---

## موارد بررسی‌شده و سالم (برای مرجع)

- `lib/taskDate.ts:27-34` — پارس تاریخ day-only به‌صورت محلی انجام می‌شود (بدون خطای UTC) ✓
- `lib/jalali.ts:61-66` — `(getDay()+1)%7` برای شروع هفته از شنبه درست است ✓
- `lib/recurrence.ts:28-46` — تبدیل floating-time برای rrule درست پیاده شده (حفظ ساعت محلی در DST) ✓
- `lib/timeHorizon.ts:64-66, 84-92` — جمع روز تقویمی محلی و فصل شمسی درست ✓
- `lib/knowledgeHtmlSanitizer.ts:99-111` — DOMPurify با پروفایل html، `ALLOW_DATA_ATTR:false`، مسدودسازی `style/iframe/form` ✓ (تمام مسیرهای `dangerouslySetInnerHTML` دانش از `sanitizeKnowledgeHtml` عبور می‌کنند؛ به‌جز `components/knowledge/LessonCardLayout.tsx:97,126` و `DrugTiers.tsx` که ورودی‌شان از والد sanitize‌شده می‌آید — **نیازمند تأیید** برای مسیرهای import آینده)
- `lib/offlineQueue.ts:437-456` — حذف اتمی تغییر صف‌شده با تأیید پس از حذف ✓
- `pages/NotesView.tsx:405,407` — flush نوشتن‌های debounce‌شده در cleanup ✓ (هرچند `flushAll` بدون await رها می‌شود)

## نیازمند تأیید (آزمایش‌های دقیق)

۱. **بند ۹:** با کش خالی Firestore، ذخیرهٔ سند موجود → بررسی نتیجهٔ `saveEntityToFirestoreWithOutcome`.
۲. **بند ۱۶:** حذف زیرتسک از دستگاه دوم و تیک‌زدن والد → بررسی شکست تراکنش.
۳. **بند ۱۸:** اختلاف ساعت کلاینت‌ها و بررسی رد شدن ویرایش معتبر.
۴. **بند ۴ (بخش سندهای قدیمی):** آیا در دادهٔ واقعی سندی بدون `updated_at`/`updatedAt` وجود دارد؟ (پرس‌وجو: `WHERE updated_at IS NULL` در کنسول Firestore)
