# ممیزی امنیتی و درستی سمت سرور — ARSHNAZ

**دامنه:** `api/**` (توابع Vercel)، `backend/**` (FastAPI)، قواعد Firestore/Storage، پیکربندی استقرار، Android/Capacitor، تست‌ها و CI.
**مخزن:** `C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam` (کامیت `b1e9d0b`، شاخه `main`، درخت کاری تمیز — هیچ فایلی در مخزن تغییر داده نشد).
**روش:** بازخوانی خط‌به‌خط کد + grep/git read-only. هیچ بیلد/تست/نصب اجرا نشد. هر یافته دارای شاهد `path:line` است؛ موارد تأییدنشده با «نیازمند تأیید» و بررسی دقیق مشخص شده‌اند.

> **تصحیح مهم دامنه (خارج از یافته‌ها):** برخلاف فرض اولیه، هیچ استنتاج مدل زبانی در سمت سرور وجود ندارد. همهٔ فراخوانی‌های LLM از مرورگر و مستقیم به OpenAI/Gemini انجام می‌شود (`frontend/src/lib/geminiDirect.ts:112`، `frontend/src/lib/openAICompatDirect.ts:50`) و `api/_lib/agentApi.ts` صرفاً یک API توکن‌محور برای «دستیار» است، نه پروکسی مدل. بنابراین ریسک‌های «تایم‌اوت استنتاج» و «prompt injection سمت سرور» در این نسخه مصداق ندارند؛ ریسک واقعی همان خواندن‌های نامحدود Firestore است (یافتهٔ ۹).

---

## ۵ ریسک بحرانی

1. **P0 — بک‌دور احراز هویت با هر توکن دسترسی Google:** هر `access_token` گوگل (از هر اپ/پروژه‌ای) با فراخوانی `accounts:signInWithIdp` روی API Key عمومی Firebase به یک نشست کامل Firebase برای صاحب آن حساب تبدیل می‌شود — `api/_lib/auth.ts:96-118`. هر کسی که توکن دسترسی گوگل قربانی را در دست داشته باشد، می‌تواند به‌جای او وارد API شود.
2. **P0 — باز کردن رایگان ماژول‌های پولی توسط خود کلاینت:** قواعد Firestore نوشتن `users/{uid}/module_access/**` را برای مالک مجاز می‌کند، در حالی که سرور همان سند را منبع حقیقت می‌داند — `firestore.rules:67-78` + `api/arsh/modules.ts:71,76,100-105`.
3. **P1 — حذف حساب در تولید عملاً خراب است:** حذف حساب پیش از هر پاک‌سازی به سرویس FastAPI نیاز دارد، ولی آن سرویس در Vercel استقرار نمی‌یابد — `api/user/delete-account.ts:39-46` + `.vercelignore:10`.
4. **P1 — قواعد Firestore/Storage هرگز deploy نمی‌شوند:** نه `firebase.json` وجود دارد و نه CI؛ تنها ارجاع به قواعد، کانفیگ امولاتور است — `firebase.emulator.json:9`.
5. **P1 — تست‌های امنیتی API هرگز اجرا نمی‌شوند:** glob مربوط به `api/**` در `frontend/vitest.config.ts:13` به مسیری اشاره می‌کند که وجود ندارد (`frontend/api`) و شاهد ثبت‌شدهٔ شکست هم در مخزن هست — `docs/planning-handoffs/evidence/phase-zero-api-tests.txt:15`.

---

## جدول خلاصه

| شدت | یافته | فایل:خط | اثر |
|---|---|---|---|
| P0 | بک‌دور احراز هویت با توکن دسترسی Google (`signInWithIdp` و userinfo) | `api/_lib/auth.ts:96-118`، `:123-138` | تصاحب حساب هر کاربری که توکن گوگلش افشا شود |
| P0 | نوشتن کلاینت روی `module_access` = باز کردن رایگان ماژول + ریست قفل رمز | `firestore.rules:67-78`، `api/arsh/modules.ts:71,76,83` | دور زدن کامل فروش ماژول |
| P1 | حذف حساب بدون سرویس FastAPI کاملاً fail-closed (۵۰۳) | `api/user/delete-account.ts:39-46`، `.vercelignore:10` | کاربر هرگز نمی‌تواند حسابش را حذف کند |
| P1 | باقی‌ماندن `uid` در `module_codes/*/redeemers/*` پس از حذف حساب | `api/arsh/modules.ts:109`، `api/_lib/accountDeletion.ts:13-21` | داده باقی‌مانده / نقض حق حذف |
| P1 | قواعد امنیتی deploy نمی‌شوند (بدون `firebase.json`/CI) | `firebase.emulator.json:9` | قواعد واقعی پروژه نامعلوم و غیرقابل‌بازتولید |
| P1 | تست‌های API در هیچ‌جا اجرا نمی‌شوند | `frontend/vitest.config.ts:13`، `evidence/phase-zero-api-tests.txt:15` | نبود دروازهٔ امنیتی روی تغییرات |
| P1 | ماژول‌ها روی اندروید/کراس‌اوریجین خراب است (بدون CORS/OPTIONS) | `api/arsh/modules.ts:45-51`، `frontend/src/lib/arshApi.ts:33-39` | ۴۰۱ روی preflight؛ فیچر مرده |
| P1 | نبود timeout در فراخوانی‌های حیاتی (auth/firestore) | `api/_lib/auth.ts:19,72,97,126`، `api/_lib/firestore.ts:155,231,281` | تابع تا kill شدن پلتفرم معلق می‌ماند |
| P1 | خواندن نامحدود کل مجموعه پیش از صفحه‌بندی | `api/_lib/firestore.ts:151-169,422` | هزینه/DoS با داده زیاد |
| P1 | انتشار APK دیباگ ۳۵ مگابایتی در مخزن | `ARSHNAZ-debug.apk`، `build-android-apk.bat:31,41` | استخراج توکن/دیباگ‌پذیری + تورم مخزن |
| P2 | محدودیت نرخ درون‌حافظه‌ای و کلید آن هدر تأییدنشده | `api/_lib/rateLimiter.ts:10-13`، `api/_lib/agentApi.ts:977` | دور زدن آسان؛ بی‌اثر روی چند نمونه |
| P2 | `audit-log` با اسکوپ ضعیف `tasks:read` | `api/_lib/agentApi.ts:1024,113,627` | نشت عنوان خاطرات/دفتر خاطرات |
| P2 | `CORS: *` روی همهٔ پاسخ‌ها + نبود هدرهای امنیتی | `api/_lib/response.ts:12,27`، `vercel.json` (کامل) | سطح حمله مرورگری |
| P2 | بازتاب پیام خطای داخلی به کلاینت | `api/tasks/index.ts:107`، `api/tasks/[id].ts:120` | نشت جزئیات زیرساخت |
| P2 | idempotency درون‌حافظه‌ای و بدون سقف طول کلید در memories | `api/_lib/agentApi.ts:15,291` در برابر `:595-600` | نوشتن تکراری + مصرف حافظه |
| P2 | نبود اعتبارسنجی در PATCH تقویم (`Boolean("false") === true`) | `api/_lib/agentApi.ts:899-905` | خرابی داده (تسک ناتمام → done) |
| P2 | `/api/arsh/weather` و `/api/arsh/geocode` بدون احراز هویت | `backend/weather.py:26-27,64-65` | سوءاستفادهٔ منبعی + رشد بی‌سقف کش |
| P2 | خواندن کل بدنهٔ آپلود پیش از بررسی حجم | `backend/attachments.py:151-154` | پرشدن حافظه / OOM |
| P2 | `installCommand` مبتنی بر yarn بدون `yarn.lock` | `vercel.json:4`، نبود `yarn.lock` | بیلد غیرقابل‌بازتولید |
| P2 | نبود CI و نبود اسکریپت تست در ریشه | نبود `.github`، `package.json:6-9` | هیچ دروازه‌ای پیش از merge نیست |
| P2 | دو پیاده‌سازی موازی ماژول‌ها با مدل ادمین متفاوت | `backend/modules.py:41-53` در برابر `api/arsh/modules.ts:61-63` | واگرایی مجوزدهی |
| P2 | وابستگی از URL شخص‌ثالث + پین‌های قدیمی | `backend/requirements.txt:57,24,110` | زنجیرهٔ تأمین |
| P2 | `allowBackup=true` + `minifyEnabled false` + وابستگی alpha | `AndroidManifest.xml:5`، `app/build.gradle:37,59` | استخراج داده از بکاپ |
| P2 | کلید امضا می‌تواند کامیت شود (`*.jks/*.keystore` غیرفعال) | `frontend/android/.gitignore` (بخش keystore) | افشای کلید انتشار |
| P2 | `exported=true` و deep link بدون اعتبارسنجی مبدأ | `AndroidManifest.xml:23,34,43,90` | تزریق intent از اپ دیگر |
| P2 | `extraAdmins` آرایهٔ شامل رشتهٔ خالی | `api/arsh/modules.ts:61` | منطق مجوز شکننده |
| P3 | تست IDOR صوری در `api.test.ts` | `api/api.test.ts:620-654` | پوشش واقعی جداسازی کاربران صفر |
| P3 | تناقض/کهنگی `test_reports` | `test_reports/iteration_4.json:20` | شواهد تست نامعتبر |
| P3 | الزام `ARSH_SIGNING_SECRET` برای `GET /me` (۵۰۳) | `api/arsh/modules.ts:46-49` | قطع کل سرویس ماژول |
| P3 | `jwt.decode(..., verify_signature: False)` | `backend/google_integration.py:150` | ایمیل نمایشی غیرقابل‌اعتماد |
| P3 | بررسی HTTPS بر پایهٔ هدر قابل‌جعل | `api/_lib/agentApi.ts:971-974` | کنترل امنیتی بی‌اثر |
| P3 | مسیر شیء از نام فایل کاربر ساخته می‌شود | `backend/attachments.py:121` | جابه‌جایی محدود کلید شیء |
| P3 | `robots.txt` اجازهٔ ایندکس کامل + `.gitconfig` عامل | `frontend/public/robots.txt:12`، `.gitconfig:1-3` | حریم خصوصی/بهداشت مخزن |

---

## جزئیات یافته‌ها

### ۱. بک‌دور احراز هویت: هر توکن دسترسی Google به نشست Firebase تبدیل می‌شود
**شدت: P0 (احراز هویت)**

**شاهد:**
- `api/_lib/auth.ts:96-106` — `postBody: \`access_token=${encodeURIComponent(token)}&providerId=google.com\`` با `key=${FIREBASE_API_KEY}` (کلید عمومی وب، `api/_lib/auth.ts:11-12`).
- `api/_lib/auth.ts:110-116` — در پاسخ، `localId` و `idToken` بازگردانده و به‌عنوان هویت کاربر استفاده می‌شود.
- `api/_lib/auth.ts:123-138` — مسیر سوم: هر توکن دسترسی گوگل با `oauth2/v3/userinfo` بررسی و `userId = data.sub` (شناسهٔ گوگل، نه Firebase UID) برگردانده می‌شود.
- مصرف‌کننده: `api/_lib/auth.ts:151-177` (`authenticateRequest`) که همهٔ مسیرهای `/api/tasks/**` و `/api/user/me` از آن استفاده می‌کنند.

**سناریوی بهره‌برداری:** توکن‌های دسترسی Google به پروژهٔ Firebase مقید نیستند (audience آن‌ها اپ صادرکننده است). مهاجم یک اپ OAuth ساده با اسکوپ `openid email profile` می‌سازد یا از هر اپ واسط استفاده می‌کند، قربانی را وادار به ورود می‌کند و توکن دسترسی او را به‌دست می‌آورد؛ سپس با یک درخواست به `identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=<API Key عمومی>` یک `idToken` معتبر Firebase برای همان حساب می‌گیرد و با آن کل تسک‌ها/پروفایل قربانی را می‌خواند و تغییر می‌دهد. مسیر سوم (`sub`) بدتر است: هیچ تطبیقی با Firebase UID انجام نمی‌شود، `email_verified` بررسی نمی‌شود و سپس همان توکن به Firestore REST پاس داده می‌شود (`api/_lib/firestore.ts:123-131`) — نتیجه: یا فضای داده‌ای متفاوت (خطای ۵۰۰ روی Firestore) یا دسترسی نامعتبر.

**اصلاح کمینه:** در `verifyToken` فقط `verifyFirebaseIdToken` را نگه دارید و آن را با `firebase-admin/auth.verifyIdToken(token, true)` (بررسی امضا + `checkRevoked`) جایگزین کنید؛ اگر پشتیبانی از توکن دستیار لازم است، مسیرهای گوگل را به یک allow-list از `GOOGLE_CLIENT_ID`های مورد اعتماد + بررسی `aud` محدود کنید و در حالت پیش‌فرض غیرفعالشان کنید.

---

### ۲. کلاینت می‌تواند وضعیت ماژول‌های پولی را خودش بنویسد (دور زدن فروش + ریست قفل رمز)
**شدت: P0 (مجوزدهی/دور زدن کنترل کسب‌وکار)**

**شاهد:**
- `firestore.rules:67-78` — قاعدهٔ چتری `match /{subcollection}/{docId=**}` با `allow read, write: if isOwner(userId) && !(subcollection in [...])`؛ فهرست استثناها فقط `user_roles, assistant_grants, assistant_audit, assistant_trash, cycle_profiles, cycle_logs, cycle_profile_tombstones` است و **`module_access` در آن نیست**.
- `api/arsh/modules.ts:71` — `const userRef = db.doc(\`users/${uid}/module_access/state\`)`.
- `api/arsh/modules.ts:76` — `moduleState(user.data(), ...)` ← همین سند تعیین می‌کند چه ماژولی «unlocked» است.
- `api/arsh/modules.ts:83` — قفل تلاش‌های ناموفق روی `users/${uid}/module_access/attempts`؛ `:89-91` شمارش تلاش‌ها و `:111` حذف سند تلاش‌ها پس از موفقیت.

**سناریوی بهره‌برداری:** هر کاربر وارد‌شده با توکن Firebase خودش (بدون عبور از API، مستقیماً با Firestore SDK/REST) سند `users/{uid}/module_access/state` را با `{modules:{study:{installed:true,unlocked_at:"..."}}}` می‌نویسد؛ سپس `GET /api/arsh/modules/me` مقدار `unlocked` و `installed` را برمی‌گرداند و ماژول بدون هیچ کد فعال‌سازی باز می‌شود. همچنین با حذف سند `module_access/attempts` می‌تواند قفل ۵ تلاش/۱۵ دقیقه (`api/arsh/modules.ts:89-91`) را بی‌نهایت بار ریست کند و کدها را brute-force کند.

**اصلاح کمینه:** `'module_access'` (و `'assistant_idempotency'`) را به فهرست استثناهای `firestore.rules:69-77` اضافه کنید و برای آن‌ها `allow write: if false` بگذارید؛ خواندن را در صورت نیاز به UI با `allow read: if isOwner(userId)` نگه دارید. سپس یک تست قواعد امولاتوری برای این مسیر اضافه کنید.

---

### ۳. حذف حساب در تولید عملاً غیرممکن است (۵۰۳ پیش از هر پاک‌سازی)
**شدت: P1 (endpoint خراب / انطباق داده)**

**شاهد:**
- `api/user/delete-account.ts:39-46` — اگر `ARSH_API_BASE_URL`/`VITE_ARSH_API_URL` تنظیم و معتبر نباشد، پاسخ `503 SERVICE_NOT_CONFIGURED` است و هیچ منبعی حذف نمی‌شود.
- `api/user/delete-account.ts:55-63` — نخستین مرحلهٔ حذف (`legacy-attachments`) فراخوانی `DELETE ${configuredApi}/api/arsh/account/data` روی سرویس FastAPI است.
- `.vercelignore:10` — `backend/` از استقرار Vercel حذف شده است؛ `vercel.json` نیز هیچ ران‌تایم پایتونی تعریف نمی‌کند (کل فایل `vercel.json`، ۱۹ خط).
- `frontend/src/lib/arshApi.ts:8` — هیچ فایل `.env`/پیکربندی‌ای در مخزن `VITE_ARSH_API_URL` را مقداردهی نمی‌کند (grep سراسری: تنها ارجاع‌ها در مستندات و تست‌ها).

**سناریوی شکست:** کاربر «حذف حساب» را می‌زند → `503` → چون ساختار `deleteAccountResources` fail-closed است (`api/_lib/accountDeletion.ts:13` اول از همه `deleteLegacyAttachments` را صدا می‌زند)، هیچ داده‌ای حذف نمی‌شود و درخواست حق حذف کاربر هرگز انجام نمی‌شود. مستندات خود پروژه هم این وابستگی را تأیید می‌کند: `docs/SIX_AGENT_RECOMMENDATIONS_FA.md:32`.

**اصلاح کمینه:** حذف آثار سرویس قدیمی را اختیاری کنید (اگر `ARSH_API_BASE_URL` تنظیم نشده، مرحلهٔ `legacy-attachments` را با لاگ skip کنید) و بقیهٔ مراحل (Storage + `recursiveDelete` + ایندکس توکن + Auth) را اجرا کنید؛ اگر واقعاً سرویس قدیمی لازم است، آن را به‌صورت یک پروژهٔ جدا deploy و آدرسش را در Vercel تنظیم کنید.

---

### ۴. حذف حساب، شناسهٔ کاربر را در `module_codes/*/redeemers/*` باقی می‌گذارد
**شدت: P1 (حذف ناقص داده / حریم خصوصی)**

**شاهد:**
- `api/arsh/modules.ts:109` — `tx.set(codeRef.collection("redeemers").doc(uid), { redeemed_at: ... })` ← این سند **بیرون** از `users/{uid}` است.
- `api/_lib/accountDeletion.ts:13-21` — تنها مراحل حذف: `deleteLegacyAttachments`، دو پیشوند Storage (`users/${uid}/`، `note-media/${uid}/`)، `deleteUserTree` (recursiveDelete روی `users/{uid}`)، `deleteAssistantTokenIndexes` (فقط `assistant_token_index`)، `deleteAuthUser`.
- `api/user/delete-account.ts:72-88` — پیاده‌سازی همان مراحل.

**سناریوی شکست:** کاربر حسابش را حذف می‌کند؛ در Firestore همچنان زیرمجموعهٔ `redeemers` هر کد بازخریدشده شامل UID او (و زمان بازخرید) باقی می‌ماند و با UID تازه‌ساخته‌شدهٔ Auth قابل تطبیق است. این داده خارج از هر مسیر مدیریتی باقی می‌ماند و هیچ ابزار پاک‌سازی هم ندارد.

**اصلاح کمینه:** در `delete-account.ts` یک مرحلهٔ `deleteModuleCodeRedeemers(uid)` اضافه کنید که روی `db.collectionGroup("redeemers").where(FieldPath.documentId(), "==", uid)` (یا پیمایش کدهای بازخریدشدهٔ کاربر) اجرا شود و سپس در `deleteAccountResources` (`api/_lib/accountDeletion.ts:17`) پیش از `deleteAuthUser` صدا زده شود؛ یک تست در `api/user/delete-account.test.ts` برای آن اضافه کنید.

---

### ۵. قواعد Firestore/Storage در مخزن هستند اما هیچ سازوکاری برای deploy آن‌ها وجود ندارد
**شدت: P1 (پیکربندی/زیرساخت)**

**شاهد:**
- جست‌وجوی سراسری برای `firebase.json` → **هیچ نتیجه‌ای**؛ تنها فایل موجود `firebase.emulator.json:9` است: `"rules": "firestore.rules"` و آن هم کانفیگ امولاتور است.
- `frontend/package.json:14` — `test:rules` آگاهانه از `--config firebase.emulator.json` استفاده می‌کند (امولاتور)، نه استقرار.
- `storage.rules` هیچ ارجاعی در هیچ فایل پیکربندی یا اسکریپتی ندارد (grep سراسری).
- نبود CI (هیچ `.github/workflows` خارج از `node_modules`؛ تنها فایل YAML پروژه `.emergent/emergent.yml:1` است).

**سناریوی شکست:** هر تغییری در `firestore.rules`/`storage.rules` هیچ مسیر استقراری ندارد؛ قواعد واقعی پروژهٔ `gen-lang-client-0845891098` از مخزن قابل بازتولید نیست. یافتهٔ ۲ نمونهٔ مستقیم این واگرایی است: قاعده‌ای که باید سرور-محور باشد، در عمل کلاینت-محور است و هیچ تستی جلوی آن را نمی‌گیرد.

**اصلاح کمینه:** یک `firebase.json` با بخش‌های `firestore.rules` و `storage.rules` اضافه کنید و یک workflow (یا اسکریپت `npm run deploy:rules`) که پیش از merge قواعد را lint/validate و پس از تأیید deploy کند.

---

### ۶. کل تست‌های API هرگز اجرا نمی‌شوند (glob به مسیر ناموجود اشاره می‌کند)
**شدت: P1 (نبود دروازهٔ امنیتی/تأیید)**

**شاهد:**
- `frontend/vitest.config.ts:13` — `include: ["src/**/*.{test,spec}.{ts,tsx}", "api/**/*.{test,spec}.{ts,tsx}"]`؛ این glob نسبت به ریشهٔ پروژهٔ vitest (پوشهٔ `frontend/`) حل می‌شود، یعنی `frontend/api/**` که **وجود ندارد** (بررسی: `Test-Path frontend/api` → False)، در حالی که فایل‌های تست در `<repo>/api/*.test.ts` هستند.
- `package.json:6-9` (ریشه) — هیچ اسکریپت `test` و هیچ وابستگی `vitest` ندارد.
- شاهد ثبت‌شدهٔ شکست در خود مخزن: `docs/planning-handoffs/evidence/phase-zero-api-tests.txt:14-24` — «`FAIL api/agentApi.test.ts` … `Cannot find module '/@fs/workspace/Arshiam-implementation-review/api/agentApi.test.ts'` … `Test Files 3 failed (3)`».
- تناقض با گزارش تست: `test_reports/iteration_4.json:20` ادعا می‌کند «All 36 API tests passed (api/api.test.ts: 14 …)».

**سناریوی شکست:** با `cd frontend && npm test` هیچ‌کدام از ۸ فایل تست سمت سرور (`api/api.test.ts`، `api/agentApi.test.ts`، …) جمع‌آوری نمی‌شوند؛ نه خطایی داده می‌شود و نه پوششی. بنابراین تمام تست‌های احراز هویت/اسکوپ (تنها دروازهٔ امنیتی موجود) عملاً مرده‌اند و تغییرات آیندهٔ API بدون هیچ کنترلی merge می‌شوند.

**اصلاح کمینه:** یک `vitest.config.ts` در ریشهٔ مخزن با `include: ["api/**/*.test.ts"]` و `environment: "node"` بسازید، `vitest` را به devDependencies ریشه اضافه کنید و اسکریپت `"test:api": "vitest run --dir ."` را در `package.json` ریشه ثبت کنید؛ سپس همان دستور را در CI اجرا کنید.

---

### ۷. ماژول‌ها روی اپ اندروید/کراس‌اوریجین کار نمی‌کنند (نبود CORS و OPTIONS)
**شدت: P1 (endpoint خراب)**

**شاهد:**
- `api/arsh/modules.ts:45-51` — هندلر بلافاصله پس از بررسی متغیرهای محیطی، `extractBearerToken` را صدا می‌زند؛ **هیچ فراخوانی `handleCors` و هیچ مدیریت `OPTIONS`** در این فایل وجود ندارد (کل فایل ۱۹۱ خط بازخوانی شد).
- مقایسه: همهٔ مسیرهای دیگر آن را دارند — `api/tasks/index.ts:24`، `api/user/me.ts:5`، `api/_lib/agentApi.ts:966`.
- `frontend/src/lib/arshApi.ts:33-39` — کلاینت همیشه هدر `Authorization` می‌فرستد ⇒ درخواست «غیرساده» است و مرورگر پیش‌پرواز (OPTIONS) می‌فرستد.
- `frontend/src/lib/arshApi.ts:6-8` — برای بیلد Android باید `VITE_ARSH_API_URL` روی مبدأ مطلق Vercel تنظیم شود؛ هیچ فایل پیکربندی در مخزن آن را مقداردهی نمی‌کند.

**سناریوی شکست:** (الف) اپ Capacitor با `origin = capacitor://localhost` (یا `https://localhost`) درخواست `/api/arsh/modules/me` می‌فرستد → پیش‌پرواز OPTIONS به `api/arsh/modules.ts` می‌رسد → چون نه CORS برگردانده می‌شود و نه OPTIONS مدیریت می‌شود، پاسخ ۴۰۱ («Sign in to your Firebase account first») می‌آید و مرورگر درخواست اصلی را بلاک می‌کند ⇒ منوی ماژول/کد فعال‌سازی در اندروید مرده است. (ب) اگر `VITE_ARSH_API_URL` تنظیم نشود، `ARSH_API_BASE` خالی می‌ماند و درخواست به مبدأ محلی WebView می‌رود (۴۰۴).

**اصلاح کمینه:** در ابتدای `api/arsh/modules.ts` همان `handleCors(req, res)` و `sendJson/sendError` مشترک را به کار ببرید (تا OPTIONS با ۲۰۴ و هدرهای CORS پاسخ بگیرد) و برای بیلد Android مقدار `VITE_ARSH_API_URL` را در پیکربندی بیلد الزامی کنید.

---

### ۸. نبود timeout روی فراخوانی‌های حیاتی (نشست، Firestore، Identity Toolkit)
**شدت: P1 (قابلیت اطمینان)**

**شاهد:**
- `api/_lib/auth.ts:19-23`، `:72-76`، `:97-106`، `:126-128` — چهار `fetch` بدون `signal`/`AbortSignal`.
- `api/_lib/firestore.ts:155`، `:231`، `:281`، `:359`، `:391` — همهٔ فراخوانی‌های Firestore REST بدون timeout.
- مقایسهٔ درست در همان مخزن: `api/user/delete-account.ts:58` — `signal: AbortSignal.timeout(20_000)`.

**سناریوی شکست:** کندی یا قطعی موقت `identitytoolkit.googleapis.com` یا `firestore.googleapis.com` باعث می‌شود هندلر تا پایان مهلت پلتفرم معلق بماند؛ کاربران خطای مبهم می‌گیرند و مصرف تابع به سقف می‌خورد. همچنین `verifyToken` در هر درخواست یک فراخوانی شبکه‌ای تازه انجام می‌دهد (`auth.ts:19`) بدون هیچ کشی، بنابراین قطعی این سرویس = ۴۰۱ برای همهٔ کاربران.

**اصلاح کمینه:** یک wrapper مشترک `fetchWithTimeout(url, init, ms = 8000)` بسازید و در `auth.ts` و `firestore.ts` همهٔ فراخوانی‌ها را با آن انجام دهید؛ نتیجهٔ `verifyFirebaseIdToken` را حداکثر ۶۰ ثانیه کش کنید (Map با TTL) و در خطا ۵۰۳ (به‌جای ۴۰۱) برگردانید.

---

### ۹. خواندن نامحدود کل مجموعه پیش از صفحه‌بندی (هزینه/DoS)
**شدت: P1 (قابلیت اطمینان/هزینه)**

**شاهد:**
- `api/_lib/firestore.ts:151-169` — حلقهٔ `do/while (pageToken)` که **همهٔ** اسناد `users/{uid}/tasks` را در حافظه جمع می‌کند و تازه پس از آن فیلتر/مرتب/برش می‌دهد (`:170-217`).
- `api/_lib/firestore.ts:422` — `getTodayTasks` با `limit: Number.MAX_SAFE_INTEGER` صدا زده می‌شود (کل مجموعه).
- `api/_lib/agentApi.ts:225` و `api/_lib/assistantTasks.ts:26` — `getCollectionDocs`/`collection(grant).get()` بدون هیچ `limit` روی کل مجموعهٔ کاربر.
- `api/agentApi.ts:199-218` — صفحه‌بندی فقط پس از بارگذاری کامل در حافظه انجام می‌شود.

**سناریوی شکست:** کاربری با چند ده‌هزار تسک (یا مهاجمی که با یک توکن دستیار معتبر داده تولید می‌کند) هر `GET /api/tasks/today` را به صدها درخواست Firestore و صدها مگابایت حافظه تبدیل می‌کند ⇒ کندی، خطای ۵۰۴/۵۰۳ و مصرف سهمیه.

**اصلاح کمینه:** `listUserTasks` را به `pageSize` محدود + `pageToken` ورودی تبدیل کنید (پیش‌فرض ۱۰۰، حداکثر مثلاً ۵) و برای «امروز» یک پرس‌وجوی محدود بازهٔ تاریخ (مثلاً `work_date >= today-90d`) یا `orderBy(work_date).limit(N)` اضافه کنید.

---

### ۱۰. انتشار APK دیباگ ۳۵ مگابایتی در مخزن + بیلد debug
**شدت: P1 (افشای اطلاعات/بهداشت مخزن)**

**شاهد:**
- `git ls-files` → `ARSHNAZ-debug.apk` **ردیابی‌شده** است؛ حجم واقعی روی دیسک ۳۵٬۰۹۶٬۰۵۸ بایت.
- `build-android-apk.bat:31` — `call gradlew.bat assembleDebug` و `:41` — `copy /y "...\apk\debug\app-debug.apk" "ARSHNAZ-debug.apk"`؛ `:42` هم `Arshiam-latest.apk` را می‌سازد که هیچ قاعدهٔ ignore ندارد.
- `.gitignore` ریشه هیچ الگوی `*.apk` ندارد؛ `git check-ignore ARSHNAZ-debug.apk` با کد ۱ (یعنی نادیده‌گرفته‌نشده) برمی‌گردد. الگوی `*.apk` فقط در `frontend/android/.gitignore` است که دامنهٔ آن محدود به همان پوشه است.

**سناریوی شکست:** بیلدهای debug به‌طور پیش‌فرض `android:debuggable="true"` دارند؛ هر کسی با ADB می‌تواند `run-as` بزند، دادهٔ اپ و توکن‌های Firebase ذخیره‌شده در WebView/localStorage را بخواند و دیباگ WebView را متصل کند. علاوه بر آن، هر بیلد مجدد یک blob ۳۵ مگابایتی به تاریخ مخزن اضافه می‌کند.

**اصلاح کمینه:** فایل APK را از ردیابی خارج و در `.gitignore` ریشه `*.apk`/`Arshiam-latest.apk` را اضافه کنید، خروجی بیلد را به پوشهٔ `dist/` منتقل کنید و برای انتشار واقعی `assembleRelease` با امضای محیطی را جایگزین کنید.

---

### ۱۱. محدودیت نرخ: درون‌حافظه، با کلید هدر تأییدنشده، و غایب در بیشتر مسیرها
**شدت: P2 (سخت‌سازی)**

**شاهد:**
- `api/_lib/rateLimiter.ts:10-13` — `windowMs`/`buckets` به‌صورت `Map` در سطح ماژول ⇒ به ازای هر نمونهٔ serverless جداگانه و با هر cold start صفر می‌شود.
- `api/_lib/agentApi.ts:977-985` — `const clientKey = req.headers?.authorization || req.socket?.remoteAddress || "global_client"` **پیش از** احراز هویت: مهاجم با ارسال هدر `Authorization` دلخواه و متفاوت در هر درخواست، برای خودش سبد تازه می‌سازد؛ در نبود آن، همهٔ درخواست‌های بی‌توکن یک سبد مشترک `"global_client"` دارند (امکان DoS متقابل).
- مسیرهای بدون هیچ محدودیت نرخ: `api/tasks/index.ts`، `api/tasks/[id].ts`، `api/tasks/today.ts`، `api/assistant/tasks/*` (هیچ‌کدام `checkRateLimit` را import نمی‌کنند).
- تست `api/agentApi.test.ts:611-619` فقط تابع خالص را می‌سنجد، نه رفتار هندلر.

**اصلاح کمینه:** کلید محدودیت را به UID تأییدشده (بعد از `authenticateRequest`/`authenticateAssistant`) و/یا IP تغییر دهید، سبدها را در Firestore/Upstash نگه دارید و `checkRateLimit` را به مسیرهای `/api/tasks/*` و `/api/assistant/*` هم اضافه کنید.

---

### ۱۲. `/api/v1/agent/audit-log` با اسکوپ `tasks:read` اطلاعات خاطرات و دفتر خاطرات را می‌دهد
**شدت: P2 (افشای داده)**

**شاهد:**
- `api/_lib/agentApi.ts:1024` — `authenticateAssistant(req, res, "tasks:read")` برای مسیر `audit-log`.
- `api/_lib/agentApi.ts:113` — `adminDb().collection(\`users/${grant.userId}/assistant_audit\`).add(record)`.
- `api/_lib/agentApi.ts:627` — هنگام ساخت یادداشت/دفتر خاطرات، **عنوان** ثبت می‌شود: `auditLog(grant, isDiary ? "memories:create_diary" : "memories:create_note", id, title || "Diary Entry")`.
- `api/_lib/assistantTasks.ts:21,94` — در به‌روزرسانی تسک، `before: snapshot.data()` (کل سند قبلی) در audit ذخیره می‌شود.
- `api/_lib/agentApi.ts:943-948` — خواندن و بازگرداندن این رکوردها به دارندهٔ توکن.

**سناریوی شکست:** توکنی که صرفاً برای خواندن تسک‌ها ساخته شده (`tasks:read`) می‌تواند با `GET /api/v1/agent/audit-log` عنوان خاطرات و دفتر خاطرات خصوصی کاربر و عکس‌های قبلی تسک‌ها را استخراج کند — یعنی مجوز «خواندن تسک» به دادهٔ ذهن/خاطرات گسترش می‌یابد.

**اصلاح کمینه:** اسکوپ این مسیر را به `memories:read` تغییر دهید (یا فیلتر نوع رویداد بگذارید: فقط رویدادهای `tasks:*` و `folders:*` برای `tasks:read`)، و برای `assistant_audit` یک سیاست نگهداری/پاک‌سازی اضافه کنید.

---

### ۱۳. `Access-Control-Allow-Origin: *` روی همهٔ پاسخ‌ها + نبود هدرهای امنیتی در Vercel
**شدت: P2 (سخت‌سازی)**

**شاهد:**
- `api/_lib/response.ts:12-14` و `:27-29` — روی هر پاسخ (حتی ۴۰۱/۵۰۰) هدرهای `Access-Control-Allow-Origin: *`، `Allow-Methods` و `Allow-Headers` شامل `Authorization` ست می‌شود.
- `vercel.json` (کل فایل، ۱۹ خط) — هیچ کلید `headers` وجود ندارد: نه `Strict-Transport-Security`، نه `Content-Security-Policy`، نه `X-Content-Type-Options`، نه `Referrer-Policy`، نه `X-Frame-Options`.
- تأیید تکمیلی: `frontend/index.html:1-25` هیچ متا تگ CSP یا `X-Frame-Options` ندارد (برنامه با `dir="rtl"` و اسکریپت inline تم شروع می‌شود که CSP را سخت‌تر می‌کند).

**سناریوی شکست:** چون احراز هویت هدری است (نه کوکی)، `*` به‌تنهایی کوکی نمی‌دزدد؛ اما هر سایتی می‌تواند با توکن به‌دست‌آمده درخواست‌های کامل به API بزند و پاسخ را بخواند، و نبود CSP/HSTS سطح حملهٔ XSS و downgrade را در اپ PWA افزایش می‌دهد.

**اصلاح کمینه:** یک بخش `headers` در `vercel.json` اضافه کنید (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`) و `Access-Control-Allow-Origin` را از روی allow-list مبدأها (دامنهٔ خودتان + `capacitor://localhost`) تنظیم کنید.

---

### ۱۴. بازتاب پیام خطای داخلی به کلاینت
**شدت: P2 (افشای اطلاعات)**

**شاهد:**
- `api/tasks/index.ts:103-108` — `sendError(res, 500, "INTERNAL_ERROR", error?.message || ...)`.
- `api/tasks/[id].ts:116-121` — همان الگو.
- `api/tasks/today.ts:37-42` — همان الگو.
- `api/_lib/agentApi.ts:1172` — `return sendError(res, 500, "INTERNAL_ERROR", error?.message || "An unexpected error occurred.")`.
- همچنین لاگ‌های Firestore بدنهٔ خطا را ثبت می‌کنند: `api/_lib/firestore.ts:158-159` (`errText`).

**سناریوی شکست:** پیام‌های کتابخانه‌ای firebase-admin/Firestore شامل مسیر اسناد (`users/<uid>/tasks/<id>`)، نام دیتابیس و گاهی جزئیات پروژه هستند و مستقیم به کلاینت می‌روند؛ برای مهاجم این‌ها نقشهٔ ساختار داده و شناسه‌هاست.

**اصلاح کمینه:** در همهٔ مسیرها پیام ثابت عمومی برگردانید (`"خطای داخلی رخ داد"`) و جزئیات را فقط `console.error` کنید؛ یک `errorId` تصادفی برای همبستگی لاگ به کلاینت بدهید.

---

### ۱۵. idempotency درون‌حافظه‌ای، بدون eviction، و بدون سقف طول کلید در memories
**شدت: P2 (قابلیت اطمینان)**

**شاهد:**
- `api/_lib/agentApi.ts:15` — `const idempotencyCache = new Map<...>()` در سطح ماژول.
- `api/_lib/agentApi.ts:26-39` — ورودی‌ها فقط هنگام **خواندن** منقضی حذف می‌شوند؛ اگر کلیدی دوباره خوانده نشود، تا پایان عمر نمونه در حافظه می‌ماند.
- `api/_lib/agentApi.ts:290-293` — در ساخت تسک طول کلید بررسی می‌شود (`> 2048` → ۴۰۰).
- `api/_lib/agentApi.ts:595-600` — در ساخت خاطره **هیچ بررسی طولی نیست** و کلید مستقیماً در `cacheKey` می‌رود؛ سپس `:634-636` با کلید بلند در Map ذخیره می‌شود.

**سناریوی شکست:** (الف) دو نمونهٔ serverless هم‌زمان ⇒ idempotency بی‌اثر و تسک/یادداشت تکراری. (ب) مهاجم با توکن معتبر و `idempotency_key` چند مگابایتی (در `body`) حافظهٔ نمونه را پر می‌کند. (ج) برخلاف مسیر تسک، در `handleCreateMemory` دو درخواست هم‌زمان با یک کلید هر دو نوشته می‌شوند (فقط کش خوانده می‌شود، قفلی وجود ندارد) در حالی که `createTaskIdempotently` از تراکنش Firestore استفاده می‌کند.

**اصلاح کمینه:** سقف طول کلید را به `handleCreateMemory` هم اضافه کنید، ذخیره‌سازی را به Firestore (مثل `createTaskIdempotently`، `api/_lib/agentApi.ts:68-84`) منتقل کنید و در حالت حافظه‌ای سقف تعداد ورودی + eviction بگذارید.

---

### ۱۶. نبود اعتبارسنجی در PATCH رویداد تقویم (خرابی داده)
**شدت: P2 (درستی داده)**

**شاهد:**
- `api/_lib/agentApi.ts:899-905` — `if (body.title !== undefined) patch.title = String(body.title).trim();` (بدون بررسی خالی‌بودن)، `if (body.status !== undefined) patch.status = body.status;` (بدون بررسی مقادیر مجاز)، `if (body.completed !== undefined) patch.completed = Boolean(body.completed);`.
- مقایسه با قرارداد سخت‌گیرانهٔ بقیهٔ کد: `api/_lib/taskInput.ts:18-31` (کلیدهای boolean و مجموعهٔ status) و `api/_lib/agentApi.ts:363-368` (در همان فایل، برای تسک‌ها).
- مسیر: `api/_lib/agentApi.ts:1156-1161` (PATCH `/api/v1/agent/calendar/events/:id`) با اسکوپ `calendar:write`.

**سناریوی شکست:** ارسال `{"completed": "false"}` رویداد را **کامل‌شده** می‌کند (`Boolean("false") === true`)، `{"title": "   "}` عنوان خالی می‌نویسد، و `{"status": "whatever"}` یک وضعیت نامعتبر وارد سند می‌کند که فیلترهای `status` در `handleGetTasks` (`:233-235`) را بی‌اعتبار می‌کند.

**اصلاح کمینه:** در `handlePatchCalendarEvent` هم `validateTaskInput(body)` و `taskCompletionWrite(body)` را به کار ببرید و برای عنوان خالی خطای ۴۰۰ بدهید (همان الگوی `:363-368`).

---

### ۱۷. سرویس FastAPI: `/weather` و `/geocode` بدون احراز هویت + کش بدون سقف
**شدت: P2 (سوءاستفادهٔ منبعی)**

**شاهد:**
- `backend/weather.py:26-27` — `async def get_weather(lat: float = Query(...), lon: float = Query(...))` — هیچ `Depends(current_user_id)` ندارد (مقایسه: `backend/attachments.py:118` که دارد).
- `backend/weather.py:64-65` — `async def geocode(q: str = Query(...), lang: str = "en")` — همچنین بدون احراز هویت.
- `backend/weather.py:60` — `db.weather_cache.update_one({"key": key}, {"$set": ...}, upsert=True)` با کلید `_key(lat, lon)` روی دو رقم اعشار (`:22-23`).
- توسعهٔ مبدأ: `backend/server.py:33` (`prefix="/api/arsh"`) و `:49-55` (CORS باز).

**سناریوی شکست:** هر کسی می‌تواند از سرویس به‌عنوان واسط رایگان Open-Meteo استفاده کند و با پیمایش عرض/طول جغرافیایی (تقریباً میلیاردها کلید ممکن) مجموعهٔ `weather_cache` را بی‌نهایت رشد دهد ⇒ مصرف دیسک/سهمیه بدون هیچ احراز هویتی.

**اصلاح کمینه:** `Depends(current_user_id)` را به هر دو مسیر اضافه کنید و روی `weather_cache` یک TTL ایندکس یا سقف اندازه بگذارید؛ نرخ درخواست را هم در همان لایه محدود کنید.

---

### ۱۸. آپلود: کل بدنه پیش از بررسی حجم در حافظه خوانده می‌شود
**شدت: P2 (DoS)**

**شاهد:**
- `backend/attachments.py:151-154` — `data = await request.body()` و سپس `validate_upload(att.mime_type, len(data))`؛ یعنی سقف ۲۵ مگابایتی (`:29`) **پس از** بارگذاری کامل اعمال می‌شود.
- مجوز دسترسی: `PUT /attachments/{id}/content` فقط با URL امضاشدهٔ کوتاه‌عمر (`:144-147`، امضا در `backend/signing.py:15-18`) — یعنی مهاجم باید اول یک لینک امضا بگیرد، ولی می‌تواند آن را با بدنهٔ چند گیگابایتی بازپخش کند.

**سناریوی شکست:** ارسال بدنهٔ بسیار بزرگ به یک URL امضاشدهٔ معتبر ⇒ مصرف حافظهٔ سرویس تا OOM/۵۰۲ و از کار افتادن سایر درخواست‌ها.

**اصلاح کمینه:** پیش از خواندن بدنه، `Content-Length` را بررسی و در صورت نبود/عبور از سقف با ۴۱۳ رد کنید و بدنه را به‌صورت استریم با سقف بخوانید (`request.stream()` با شمارندهٔ بایت).

---

### ۱۹. `installCommand` مبتنی بر yarn است اما `yarn.lock` وجود ندارد
**شدت: P2 (قابل‌بازتولید بودن بیلد)**

**شاهد:**
- `vercel.json:4` — `"installCommand": "yarn install && cd frontend && yarn install"`.
- بررسی: `Test-Path yarn.lock` (ریشه) → False و `Test-Path frontend/yarn.lock` → False؛ در عوض `package-lock.json` (ریشه، ۸۹KB) و `frontend/package-lock.json` (۶۵۶KB) وجود دارند.
- `package.json:10-12` (ریشه) — تنها وابستگی ران‌تایم `firebase-admin` است؛ اسکریپت بیلد هم `npm run build` را در `frontend` صدا می‌زند.

**سناریوی شکست:** هر استقرار، درخت وابستگی را از نو resolve می‌کند؛ `package-lock.json` نادیده گرفته می‌شود ⇒ بیلدهای غیرقطعی، و خطر نصب نسخهٔ دیگری از `firebase-admin`/`firebase` روی Vercel نسبت به آنچه تست شده است.

**اصلاح کمینه:** یا `yarn.lock` را کامیت کنید و yarn را نگه دارید، یا `installCommand` را به `npm ci && cd frontend && npm ci` تغییر دهید (همراه با `frontend/.npmrc` فعلی که `legacy-peer-deps=true` دارد).

---

### ۲۰. نبود CI و نبود اسکریپت تست در ریشهٔ مخزن
**شدت: P2 (فرآیند)**

**شاهد:**
- جست‌وجوی سراسری `.github` با فیلتر `node_modules` → هیچ نتیجه‌ای.
- تنها فایل YAML پروژه: `.emergent/emergent.yml:1-5` (فرادادهٔ محیط ساخت، نه CI). همچنین `docs/planning-handoffs/evidence/*.txt` شواهد دستی هستند.
- `package.json:6-9` — اسکریپت‌ها فقط `build` و `android:build` هستند؛ `frontend/package.json:13` تنها `"test": "vitest run"` است.

**سناریوی شکست:** هیچ دروازهٔ خودکاری پیش از merge وجود ندارد: نه typecheck اجباری، نه تست API (یافتهٔ ۶)، نه اعتبارسنجی قواعد (یافتهٔ ۵)، نه lint. مخزن در عمل روی «اعتماد به اجرای دستی» کار می‌کند.

**اصلاح کمینه:** یک workflow حداقلی با سه گام: `npm ci` در ریشه، `npx tsc --noEmit` روی `api/**`، و اجرای تست‌های API با کانفیگ ریشه (یافتهٔ ۶) — به‌همراه `cd frontend && npm run typecheck`.

---

### ۲۱. دو پیاده‌سازی موازی برای «ماژول‌ها» با مدل مجوز متفاوت
**شدت: P2 (واگرایی/نگهداشت)**

**شاهد:**
- نسخهٔ زندهٔ Vercel: `api/arsh/modules.ts:62-63` — `isOwner` فقط با ایمیل‌های ثابت `ownerEmails` (`:14`) و `isAdmin` با `ARSH_ADMIN_EMAILS`، هر دو مشروط به `claims.email_verified === true`؛ ذخیره‌سازی در Firestore (`:71`).
- نسخهٔ FastAPI: `backend/modules.py:45-47` — `is_admin` علاوه بر ایمیل، `claims.get("admin") is True or claims.get("role") == "admin"` را می‌پذیرد (منبع حقیقت متفاوت برای نقش‌ها)، ذخیره‌سازی در MongoDB (`backend/db.py:8-9`)، و `backend/server.py:45` آن را ثبت می‌کند.
- مسیر مصرف واقعی کلاینت: `frontend/src/lib/appModules.ts:97,105,112,119,121,123` همه به `/api/arsh/modules/*` (نسخهٔ Vercel) می‌روند.

**سناریوی شکست:** دو منطق مجوز/حالت برای یک فیچر وجود دارد؛ هر تغییر در یکی، رفتار کاربران وب و اندروید/نسخهٔ قدیمی را از هم جدا می‌کند و ممیزی را غیرقابل‌اعتماد می‌سازد (مثلاً `role: admin` در FastAPI معتبر است ولی در Vercel نه).

**اصلاح کمینه:** `backend/modules.py` را حذف (یا به‌عنوان پروکسی به نسخهٔ Firestore تبدیل) کنید و تنها یک منبع حقیقت برای وضعیت ماژول نگه دارید؛ در صورت نگه‌داشتن هر دو، مدل `is_admin` را یکسان کنید.

---

### ۲۲. زنجیرهٔ تأمین: وابستگی از URL شخص‌ثالث و پین‌های قدیمی
**شدت: P2 (زنجیرهٔ تأمین)**

**شاهد:**
- `backend/requirements.txt:57` — `litellm @ https://customer-assets.emergentagent.com/internal-asset/library/litellm-1.80.0-py3-none-any.whl#sha256=...` (نصب از میزبان غیر PyPI).
- `backend/requirements.txt:24` — `fastapi==0.110.1` و `:110` — `starlette==0.37.2` (نسخه‌های قدیمی؛ Starlette قبل از ۰٫۴۰ آسیب‌پذیری DoS در پردازش multipart دارد — **نیازمند تأیید**: اجرای `pip-audit -r backend/requirements.txt` یا `safety check` روی همین فایل).
- فایل قفل (lock) برای پایتون وجود ندارد: تنها `requirements.txt` (۱۲۶ خط) در مخزن است.

**سناریوی شکست:** اگر میزبان شخص‌ثالث دارایی/نسخه را تغییر دهد (هش در فایل هست، اما خود فایل از منبع غیررسمی می‌آید)، بیلد سرویس وابسته به زیرساخت یک فروشندهٔ سوم است؛ نبود lock باعث می‌شود بازسازی محیط ممکن نباشد. نبود احراز هویت روی مسیرهای عمومی این سرویس (یافتهٔ ۱۷) پیامدهای CVEهای DoS را تشدید می‌کند.

**اصلاح کمینه:** `litellm` را از PyPI با هش رسمی پین کنید، نسخه‌های FastAPI/Starlette را به شاخهٔ پشتیبانی‌شده ارتقا دهید و یک `requirements.lock` (مثلاً با `pip-compile`) اضافه کنید؛ `pip-audit` را در CI اجرا کنید.

---

### ۲۳. Android: بکاپ‌گیری فعال، کوچک‌سازی خاموش و وابستگی alpha
**شدت: P2 (افشای داده محلی)**

**شاهد:**
- `frontend/android/app/src/main/AndroidManifest.xml:5-7` — `android:allowBackup="true"` با `fullBackupContent="@xml/backup_rules"` و `dataExtractionRules="@xml/data_extraction_rules"`.
- `frontend/android/app/build.gradle:37` — `minifyEnabled false` در build type `release`.
- `frontend/android/app/build.gradle:59` — `androidx.security:security-crypto:1.1.0-alpha06` (نسخهٔ alpha).
- `frontend/android/app/src/main/java/life/arshnaz/app/ArshnazSecureStore.java` — ذخیره‌سازی امن با کلید در Keystore (کلید بکاپ نمی‌شود، اما داده می‌تواند بکاپ شود).

**سناریوی شکست:** بکاپ ابری/`adb backup` دادهٔ اپ را شامل می‌شود: وضعیت ورود Firebase (که توسط SDK در localStorage/IndexedDB وب‌ویو ذخیره می‌شود) و پایگاه‌دادهٔ محلی می‌تواند به دستگاه/حساب دیگری منتقل شود؛ با APK دیباگ (یافتهٔ ۱۰) این مسیر عملاً بدون مانع است. **نیازمند تأیید:** محتوای `frontend/android/app/src/main/res/xml/backup_rules.xml` و `data_extraction_rules.xml` را بخوانید و ببینید آیا `app_webview`/`databases`/`shared_prefs` از بکاپ مستثنا شده‌اند یا نه.

**اصلاح کمینه:** اگر بکاپ لازم نیست `allowBackup="false"` بگذارید، در غیر این صورت پیشوندهای وب‌ویو و حافظهٔ نشست را در `data_extraction_rules.xml`/`backup_rules.xml` مستثنا کنید؛ `minifyEnabled true` + `shrinkResources true` را برای release فعال کنید و `security-crypto` را به نسخهٔ پایدار ارتقا دهید.

---

### ۲۴. کلید امضا می‌تواند در مخزن کامیت شود
**شدت: P2 (افشای کلید)**

**شاهد:**
- `frontend/android/app/build.gradle:20-32` — `def keystorePath = System.getenv("KEYSTORE_PATH")`، `storeFile file(keystorePath ?: 'release.keystore')` — یعنی مسیر پیش‌فرض `frontend/android/app/release.keystore` است.
- `frontend/android/.gitignore` بخش «Keystore files» — هر دو خط `*.jks` و `*.keystore` **کامنت‌شده**اند («Uncomment the following lines if you do not want to check your keystore files in»).
- `.gitignore` ریشه فقط `*.pem` و `*.key` را پوشش می‌دهد (`:47`، `:90`).
- بخش مثبت: هیچ `.jks`/`.keystore`/`google-services.json` در `git ls-files` و در تاریخ مخزن وجود ندارد (بررسی `git log --all --diff-filter=A --name-only`).

**سناریوی شکست:** به‌محض اینکه کسی برای بیلد release فایل `release.keystore` را در همان مسیر پیش‌فرض بگذارد، `git add -A` آن را کامیت می‌کند و کلید امضای انتشار برای همیشه در تاریخ افشا می‌شود (خطر جعل به‌روزرسانی اپ).

**اصلاح کمینه:** الگوهای `*.jks` و `*.keystore` را در `.gitignore` ریشه فعال کنید (نه فقط پوشهٔ android) و مسیر پیش‌فرض را از `build.gradle` حذف کنید تا فقط از `KEYSTORE_PATH` محیطی خوانده شود.

---

### ۲۵. سطح تماس Android: کامپوننت‌های exported و deep link بدون اعتبارسنجی مبدأ
**شدت: P2 (سخت‌سازی)**

**شاهد:**
- `AndroidManifest.xml:23` — `android:exported="true"` برای `MainActivity` (لازم برای LAUNCHER) همراه `:30-35` فیلتر `arshnaz://` با دستهٔ `BROWSABLE`.
- `AndroidManifest.xml:43` — `WidgetConfigureActivity` با `android:exported="true"`.
- `AndroidManifest.xml:88-97` — `ArshnazWidgetProvider` با `android:exported="true"` و فیلتر `APPWIDGET_UPDATE`.
- مسیر بازگشت OAuth: `backend/google_integration.py:122-125` — `RedirectResponse(f"arshnaz://google-connected?result={result}")`.
- بخش مثبت: `:56-74` سرویس‌های QS/AppFunction با پرمیشن‌های سیستمی محافظت شده‌اند و `FileProvider` با `exported="false"` است؛ هیچ `android:usesCleartextTraffic` و هیچ `network_security_config.xml` وجود ندارد (پیمایش `res/xml` → ۱۴ فایل، بدون کانفیگ شبکه).

**سناریوی شکست:** هر اپ/سایت نصب‌شده می‌تواند `arshnaz://google-connected?result=connected` را باز کند و UI اپ را فریب دهد (نتیجهٔ اتصال گوگل جعلی)؛ `exported` بودن ویجت‌پراوایدر اجازهٔ ارسال broadcast از اپ‌های دیگر را می‌دهد (اثر عملی محدود به به‌روزرسانی ویجت). `state` امضاشده در `backend/google_integration.py:77-91` جلوی جعل واقعی اتصال را می‌گیرد.

**اصلاح کمینه:** در `MainActivity` بدنهٔ deep link را اعتبارسنجی کنید (نادیده‌گرفتن پارامتر `result` از منبع بیرونی یا راستی‌آزمایی سرور)، `WidgetConfigureActivity` را در صورت امکان `exported="false"` کنید و برای گیرندهٔ ویجت در صورت عدم نیاز، `android:exported="false"` بگذارید (خود سیستم می‌تواند broadcast را بفرستد).

---

### ۲۶. `extraAdmins` وقتی متغیر محیطی تنظیم نشده باشد، آرایهٔ شامل رشتهٔ خالی است
**شدت: P2/P3 (منطق مجوز شکننده)**

**شاهد:**
- `api/arsh/modules.ts:61` — `const extraAdmins = (process.env.ARSH_ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase());` ⇒ در نبود متغیر، مقدار `[""]` می‌شود.
- `api/arsh/modules.ts:63` — `claims.email_verified === true && extraAdmins.includes(email)`؛ اگر `email` رشتهٔ خالی باشد، `includes("")` مقدار `true` است (`:60`).
- مقایسهٔ درست در همان پروژه: `backend/modules.py:42` — `{e.strip().lower() for e in os.environ.get("ARSH_ADMIN_EMAILS", "").split(",") if e.strip()}` (رشته‌های خالی فیلتر می‌شوند).

**وضعیت فعلی:** در عمل بهره‌برداری‌پذیر نیست، چون هم‌زمان به `email_verified === true` و ایمیل خالی نیاز است که در توکن‌های Identity Toolkit با هم رخ نمی‌دهد — **نیازمند تأیید:** ساختار پاسخ `accounts:lookup` برای حساب بدون ایمیل را با یک کاربر تستی بررسی کنید.

**اصلاح کمینه:** `.filter(Boolean)` را به محاسبهٔ `extraAdmins` اضافه کنید (هم‌سبک با نسخهٔ پایتون) و در صورت خالی‌بودن ایمیل، صریحاً `isAdmin = false` بگذارید.

---

### ۲۷. تست IDOR در `api.test.ts` ادعای بیش از واقعیت دارد
**شدت: P3 (کیفیت تست)**

**شاهد:**
- `api/api.test.ts:620-654` — عنوان تست «returns 404 for non-existent or other user task» است، اما ماک `fetch` در `:631-633` فقط مسیر `/users/uid_test/tasks/non_existent` را ۴۰۴ می‌کند و هیچ‌جا بررسی نمی‌شود که درخواست به مسیر کاربر **دیگری** نرفته یا سند کاربر دیگر وجود داشته باشد؛ هیچ assertion روی URL فراخوانی‌شده نیست.
- در مقابل، تست واقعی جداسازی در لایهٔ دستیار وجود دارد: `api/agentApi.test.ts:158-191` (کاربر A نمی‌تواند تسک کاربر B را ببیند).
- کل تست‌ها `global.fetch` را mock می‌کنند (مثلاً `api/api.test.ts:212-228`، `:303-309`)، بنابراین هیچ‌کدام مسیر واقعی تأیید امضای توکن Firebase را اجرا نمی‌کنند.

**سناریوی شکست:** جداسازی کاربران در `/api/tasks/**` (که کاملاً به مسیر `users/{uid}` و token پاس‌داده‌شده وابسته است، `api/_lib/firestore.ts:147,228-230`) هیچ تست خودکاری ندارد؛ یک بازنویسی کوچک می‌تواند IDOR وارد کند بدون اینکه چیزی شکست بخورد.

**اصلاح کمینه:** یک تست اضافه کنید که سند کاربر دیگر را در mock موجود نگه دارد و مطمئن شود URL درخواستی `users/<uid-A>/tasks/...` است و پاسخ ۴۰۴ است؛ و یک تست قواعد امولاتوری برای `users/{uid}/tasks` بنویسید.

---

### ۲۸. تناقض و کهنگی شواهد تست در `test_reports/`
**شدت: P3 (شواهد نادرست)**

**شاهد:**
- `test_reports/iteration_4.json:20` — «All 36 API tests passed (api/api.test.ts: 14, assistant-access/assistantAccess.test.ts: 3, ...)» در حالی که `docs/planning-handoffs/evidence/phase-zero-api-tests.txt:14-24` شکست همان سه فایل را ثبت کرده و شماره‌گذاری فعلی `api/api.test.ts` (۲۵ تست در ۵ بلوک) با «۱۴» نمی‌خواند.
- `test_reports/iteration_6.json:32` — `"backend": "N/A (Firebase-based app, no traditional backend API)"` در حالی که مخزن هم `api/**` (Vercel) و هم `backend/**` (FastAPI) دارد.
- هیچ‌کدام از شش گزارش تاریخ/کامیت مرجع ندارند؛ `iteration_5.json:11-13` یک ایراد با `fix_priority: HIGH` را ثبت کرده و `iteration_6.json:7-11` بدون اشاره به آن، وضعیت را «بدون ایراد» اعلام می‌کند.

**سناریوی شکست:** تنها شواهد «تست» پروژه، گزارش‌های دستیِ بدون تاریخ و متناقض هستند؛ تصمیم‌گیری بر مبنای آن‌ها به نتیجهٔ نادرست می‌رسد (مثلاً «تست‌های API پاس می‌شوند» در حالی که اجرا نمی‌شوند).

**اصلاح کمینه:** گزارش‌ها را با `commit`/`date`/دستور دقیق اجرا و خروجی خام مهر کنید و در CI معیار عبور/شکست بسازید؛ گزارش‌های منقضی را در `test_reports/archive/` بایگانی کنید.

---

### ۲۹. `ARSH_SIGNING_SECRET` برای `GET /api/arsh/modules/me` هم الزامی است (قطع کل سرویس)
**شدت: P3 (پیکربندی)**

**شاهد:**
- `api/arsh/modules.ts:46-49` — اگر `FIREBASE_SERVICE_ACCOUNT_JSON`/`GOOGLE_APPLICATION_CREDENTIALS` یا `ARSH_SIGNING_SECRET` (با حداقل ۳۲ کاراکتر) نباشد، **همهٔ** درخواست‌ها با ۵۰۳ رد می‌شوند.
- `api/arsh/modules.ts:36-37` — `ARSH_SIGNING_SECRET` فقط برای هش کدهای فعال‌سازی لازم است و در مسیر خواندن `/me` استفاده‌ای ندارد.
- الگوی مقایسه: `api/arsh/health.ts:1-3` بدون احراز هویت و بدون وابستگی به راز (بازگشت `{ok:true}`).

**سناریوی شکست:** نبود/کوتاه‌بودن راز امضا، نمایش وضعیت ماژول‌ها را نیز از کار می‌اندازد؛ تشخیص علت هم دشوار است (پاسخ ۵۰۳ با متن فارسی یکسان).

**اصلاح کمینه:** الزام راز را به مسیرهای نیازمند (redeem/admin) منتقل کنید و برای `/me` فقط به Firebase Admin نیاز داشته باشید؛ کد خطا را تفکیک کنید (`SERVICE_NOT_CONFIGURED` در برابر `SIGNING_NOT_CONFIGURED`).

---

### ۳۰. `jwt.decode` بدون تأیید امضا در اتصال گوگل
**شدت: P3 (اعتبار داده)**

**شاهد:**
- `backend/google_integration.py:149-150` — `email = jwt.decode(tok["id_token"], options={"verify_signature": False}).get("email")` و سپس در `:151-159` در `google_tokens` ذخیره می‌شود.
- اسکوپ‌های اجباری در `:41,146` بررسی می‌شوند، بنابراین توکن واقعاً از گوگل آمده است؛ اما ایمیل بدون تأیید امضا استخراج می‌شود.

**سناریوی شکست:** اگر روزی این ایمیل مبنای تصمیم مجوزدهی شود (مثلاً `is_admin` بر اساس ایمیل گوگل)، جعل آن ممکن است. امروز فقط نمایشی است: `backend/modules.py:41-47` ایمیل **Firebase** را می‌خواند، نه این مقدار.

**اصلاح کمینه:** `options={"verify_signature": False}` را حذف کنید و توکن را با کلیدهای عمومی گوگل (`google.oauth2.id_token.verify_oauth2_token` با `GOOGLE_CLIENT_ID`) بررسی کنید، یا ایمیل را از claims خود Firebase بگیرید.

---

### ۳۱. بررسی HTTPS بر پایهٔ هدر قابل‌جعل و بی‌اثر در نبود هدر
**شدت: P3 (کنترل بی‌اثر)**

**شاهد:**
- `api/_lib/agentApi.ts:970-974` — `const proto = req.headers?.["x-forwarded-proto"]; if (proto && proto !== "https" && process.env.NODE_ENV === "production") … 403`. اگر هدر ارسال نشود (شرط `proto &&`) هیچ بررسی‌ای انجام نمی‌شود و مقدار هدر هم توسط کلاینت قابل ارسال است.

**سناریوی شکست:** این کنترل هیچ تضمین امنیتی واقعی نمی‌دهد و ممکن است تصور غلط «محافظت‌شده» ایجاد کند؛ ارسال `X-Forwarded-Proto: https` از هر کلاینتی آن را دور می‌زند.

**اصلاح کمینه:** به پیکربندی پلتفرم تکیه کنید (Vercel به‌صورت پیش‌فرض HTTPS را اجباری و redirect می‌کند) و این بررسی را حذف یا به `if (proto !== "https")` با مقدار قابل‌اعتماد تغییر دهید؛ در عوض هدر `Strict-Transport-Security` را در `vercel.json` بگذارید (یافتهٔ ۱۳).

---

### ۳۲. مسیر شیء ذخیره‌سازی از نام فایل کاربر ساخته می‌شود
**شدت: P3 (سخت‌سازی)**

**شاهد:**
- `backend/attachments.py:121` — `ext = (body.file_name.rsplit(".", 1)[-1] if "." in body.file_name else (mimetypes.guess_extension(mime) or ".bin").lstrip(".")).lower()[:10]` و سپس `:129` — `storage_path=f"{APP_NAME}/attachments/{uid}/{uuid.uuid4()}.{ext}"`.
- همان الگو در `backend/google_integration.py:215,218`.
- مسیر با امضای HMAC روی **شناسهٔ پیوست** محافظت می‌شود، نه روی مسیر (`backend/signing.py:21-22`).

**سناریوی شکست:** با نام فایلی مانند `a./../x` مقدار `ext` به `"/../x"` تبدیل می‌شود و کلید شیء به `.../{uid}/{uuid}/../x` تغییر می‌کند؛ چون `uid` و `uuid` پیش از آن هستند، فرار از پوشهٔ کاربر به‌دلیل سقف ۱۰ کاراکتری عملاً ناممکن است و اثر آن محدود به جابه‌جایی کلید در همان پیشوند است — **نیازمند تأیید:** رفتار نرمال‌سازی مسیر در سرویس Emergent Object Storage با یک کلید آزمایشی حاوی `..` تست شود.

**اصلاح کمینه:** `ext` را با یک allow-list (مثلاً `[A-Za-z0-9]{1,10}`) سخت‌گیرانه پاک‌سازی کنید یا آن را از جدول MIME استخراج کنید، نه از نام فایل کاربر.

---

### ۳۳. `robots.txt` اجازهٔ ایندکس کامل و `.gitconfig` عامل در مخزن
**شدت: P3 (بهداشت/حریم خصوصی)**

**شاهد:**
- `frontend/public/robots.txt:12-13` — `User-agent: *` / `Allow: /` برای اپ شخصی سلامت روان/دفتر خاطرات؛ هیچ `Disallow` یا `noindex` وجود ندارد.
- `.gitconfig:1-3` — یک فایل شناسهٔ گیت با `email = github@emergent.sh` و `name = emergent-agent-e1` در ریشهٔ مخزن کامیت شده است (خبری از راز نیست، اما آرتیفکت عامل ساخت است).
- مورد مثبت: `.gitignore:33-37,86-91` پوشش خوبی برای `.env`/`.env.*`/`*.env`/`credentials.json`/`*token.json*`/`*.key`/`*.pem` دارد و هیچ فایل رازی در تاریخ مخزن یافت نشد (grep `AIza|private_key|BEGIN PRIVATE KEY|client_secret|sk-` و `git log --all --diff-filter=A --name-only`).

**سناریوی شکست:** خزشگرها می‌توانند پوستهٔ عمومی اپ و مسیرهای ورود را ایندکس کنند؛ برای اپی که محتوایش ماهیت خصوصی/سلامت روان دارد این مطلوب نیست. فایل `.gitconfig` هم باعث سردرگمی ابزارها می‌شود.

**اصلاح کمینه:** در `robots.txt` مسیرهای اپ را `Disallow` کنید (`/app/`، `/api/`) یا هدر `X-Robots-Tag: noindex` را در `vercel.json` بگذارید؛ `.gitconfig` را حذف و به `.gitignore` اضافه کنید.

---

## موارد بررسی‌شده که یافته نیستند (برای پرهیز از گزارش نادرست)

- **کلید Firebase در `frontend/firebase-applet-config.json:4`** (`AIzaSy…`): کلید **عمومی** وب Firebase است و طبق طراحی در کلاینت قرار می‌گیرد؛ افشای راز نیست. خطر واقعی آن، استفادهٔ همین کلید در مسیر احراز هویت سمت سرور است (یافتهٔ ۱).
- **هیچ راز واقعی کامیت نشده است:** جست‌وجوی `private_key`، `BEGIN PRIVATE KEY`، `service_account`، `sk-`، `client_secret` و `git log --all --diff-filter=A --name-only` هیچ سرویس‌اکانت/`.env`/keystore را نشان نداد. تنها تطبیق‌های `sk-`/`AIza` در `frontend/src/lib/aiProviders.test.ts:9-16` رشته‌های تستی‌اند.
- **CORS سرویس FastAPI:** `allow_origins=["*"]` در `backend/server.py:52` همراه با `allow_credentials=False` (`:51`) است؛ بنابراین کوکی/اعتبارنامهٔ مرورگری به‌طور خودکار ارسال نمی‌شود و این ترکیب به‌تنهایی آسیب‌پذیری نیست (مسئلهٔ واقعی همان نبود احراز هویت در یافتهٔ ۱۷ است).
- **ترافیک cleartext در اندروید:** هیچ `android:usesCleartextTraffic` و هیچ `network_security_config.xml` وجود ندارد؛ پیش‌فرض اندروید ۹+ مسدودسازی است. یافته‌ای ثبت نشد.
- **استنتاج مدل در سرور / prompt injection سمت سرور:** در این نسخه وجود ندارد (همهٔ فراخوانی‌های LLM از کلاینت، `frontend/src/lib/geminiDirect.ts:112`، `frontend/src/lib/openAICompatDirect.ts:50`).
- **`firebase-blueprint.json`:** صرفاً توصیف داده است و هیچ قاعدهٔ اجرایی تولید نمی‌کند (کل فایل، ۴۷ خط).
- **ذخیرهٔ کلیدهای LLM کاربر در `localStorage`** (`frontend/src/lib/aiSettings.ts`): مسئله‌ای سمت کلاینت و خارج از دامنهٔ این ممیزی است؛ در صورت نیاز به ممیزی جداگانه ارجاع داده می‌شود.

---

## پیشنهاد ترتیب رفع

1. **فوری:** یافته‌های ۱ و ۲ (تصاحب حساب و دور زدن فروش ماژول).
2. **همین هفته:** یافته‌های ۳، ۴، ۹ (حذف حساب، باقی‌ماندهٔ داده، خواندن نامحدود) و ۵/۶ (استقرار قواعد و اجرای تست‌ها به‌عنوان دروازه).
3. **پس از آن:** ۷، ۸، ۱۰ و سخت‌سازی‌های P2 (۱۱–۲۶).
4. **بهداشت:** موارد P3 و به‌روزرسانی مستندات/گزارش‌های تست.
