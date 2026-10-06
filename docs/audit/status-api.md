# وضعیت یافته‌های ممیزی سمت سرور ARSHNAZ — درخت کاری فعلی

**مخزن:** `C:\Users\hamed\Documents\deepseek-harness\default-workspace\Arshiam` — HEAD `b1e9d0b`، شاخه `main`، درخت کاری ناپاک: ۷۷ ورودی در `git status --porcelain -uall` (۴۰ staged، ۳۶ unstaged، ۱ فایل جدید ردیابی‌نشده: `frontend/vitest.api.config.ts`).
**گزارش مرجع:** `arshnaz-audit/api-security.md` (۳۳ یافته).
**روش:** `git status --porcelain -uall`، `git diff --stat`، `git diff -- <file>`، بازخوانی فایل‌های فعلی، `git grep`/جست‌وجوی بازگشتی؛ اجرای واقعی `cd frontend && npm run test:api` (۸ فایل / ۸۵ تست پاس، خروجی: `Test Files 8 passed (8)`, `Tests 85 passed (85)`). پس از اجرای تست، `git status` بدون تغییر ماند ⇒ هیچ فایل مخزن اصلاح/تولید نشد. هیچ فایل مخزن تغییر داده نشد؛ فقط همین فایل وضعیت نوشته شد.
**قاعدهٔ وضعیت‌ها:** `رفع‌شده` = کد فعلی مشکل را برطرف کرده • `جزئی` = بخشی از مشکل رفع شده • `باز` = مشکل فعلاً پابرجاست • `نیازمند تصمیم مالک` = آسیب‌پذیری باز است و هر راه‌حل، قرارداد محصول/استقرار را تغییر می‌دهد • `ردشده` = گزارش نادرست.

## تغییرات از پیش اعمال‌شده که در درخت کاری تأیید شد

| تغییر | شاهد فعلی | تأیید |
|---|---|---|
| `module_access` از قاعدهٔ چتری مالک خارج شد | `firestore.rules:71-83` (`'cycle_profile_tombstones',` + `'module_access'`) | ✅ یافتهٔ ۲ |
| `*.apk`/`*.aab` به ignore و حذف APK از ایندکس | `.gitignore:84-87`، `git status` → `D  ARSHNAZ-debug.apk` | ✅ یافتهٔ ۱۰ (جزئی) |
| `vercel.json` از yarn به `npm ci` | `vercel.json:4-5` | ✅ یافتهٔ ۱۹ |
| اجرای تست‌های `api/**` | `frontend/vitest.api.config.ts` (فایل جدید)، `frontend/package.json:14`، `frontend/vitest.config.ts:16-18` | ✅ یافتهٔ ۶ |
| (کشف جانبی) `test:rules` به مسیر ناموجود اشاره می‌کند | `frontend/package.json:15` → `--config rules-tests/vitest.config.ts`؛ پوشهٔ `rules-tests` در هیچ نقطهٔ مخزن وجود ندارد و `firebase-tools` هم نصب نیست | ⚠️ مربوط به ۲ و ۵ |

---

## (الف) جدول وضعیت ۳۳ یافته

| # | عنوان کوتاه | شدت | وضعیت | شاهد (file:line + snippet) |
|---|---|---|---|---|
| ۱ | تبدیل هر access_token گوگل به نشست Firebase | P0 | نیازمند تصمیم مالک | `api/_lib/auth.ts:97-106` `accounts:signInWithIdp` با `postBody: access_token=...&providerId=google.com`؛ `:123-142` مسیر سوم با کامنت `// 3. Fallback: Direct Google OAuth2 UserInfo validation (e.g. Gemini Spark access token)` و `userId: data.sub` (`:134`) — بدون allow-list و بدون `aud`. آسیب‌پذیری باز است |
| ۲ | نوشتن کلاینت روی `module_access` (باز کردن رایگان ماژول) | P0 | رفع‌شده | `firestore.rules:81` `'module_access'` در فهرست استثناهای قاعدهٔ `match /{subcollection}/{docId=**}` (`:71-83`) ⇒ `allow write` برای کلاینت ندارد؛ `git grep module_access` فقط `api/arsh/modules.ts:71,83,173` (Admin SDK) و `firestore.rules` و `scripts/purge-retired-modules.mjs` را نشان می‌دهد ⇒ هیچ کد کلاینتی روی آن نمی‌نویسد. **اما** تا اجرای یافتهٔ ۵ در تولید اعمال نمی‌شود و هیچ تست قواعدی وجود ندارد (بخش ج) |
| ۳ | حذف حساب؛ ۵۰۳ پیش از هر پاک‌سازی | P1 | باز | `api/user/delete-account.ts:39-46` پیش از هر حذف: `return sendError(res, 503, "SERVICE_NOT_CONFIGURED", "Configure ARSH_API_BASE_URL ...")`؛ `:55-59` مرحلهٔ نخست `legacy-attachments` است و `api/_lib/accountDeletion.ts:13` آن را اول صدا می‌زند؛ `.vercelignore:10` `backend/`؛ `vercel.json` هیچ ران‌تایم پایتونی ندارد؛ هیچ فایل `.env` ردیابی‌شده‌ای `VITE_ARSH_API_URL` را مقداردهی نمی‌کند. (مقدار واقعی متغیر در Vercel: UNVERIFIABLE-FROM-REPO) |
| ۴ | باقی‌ماندن `uid` در `module_codes/*/redeemers/*` | P1 | باز | `api/arsh/modules.ts:109` `tx.set(codeRef.collection("redeemers").doc(uid), { redeemed_at: ... })`؛ `api/_lib/accountDeletion.ts:13-21` فقط `deleteLegacyAttachments`، دو پیشوند Storage، `deleteUserTree`، `deleteAssistantTokenIndexes`، `deleteAuthUser` — هیچ مرحله‌ای برای `redeemers` نیست |
| ۵ | قواعد Firestore/Storage هرگز deploy نمی‌شوند | P1 | باز | جست‌وجوی بازگشتی `firebase.json` در کل مخزن (بدون `node_modules`) → هیچ نتیجه؛ `.github` وجود ندارد؛ `firebase.emulator.json:8-10` تنها ارجاع به `firestore.rules`؛ `git grep storage.rules` → هیچ ارجاعی در کانفیگ/اسکریپت |
| ۶ | تست‌های API هرگز اجرا نمی‌شدند | P1 | رفع‌شده | `frontend/vitest.api.config.ts` (جدید): `environment: "node"`, `include: ["../api/**/*.{test,spec}.{ts,tsx}"]`؛ `frontend/package.json:14` `"test:api": "vitest run --config vitest.api.config.ts"`؛ `frontend/vitest.config.ts:16-18` glob اشتباه `api/**` حذف شد. اجرای واقعی: ۸ فایل / ۸۵ تست پاس. (نبود CI ⇒ یافتهٔ ۲۰) |
| ۷ | ماژول‌ها روی اندروید/کراس‌اوریجین (بدون CORS و OPTIONS) | P1 | باز | `api/arsh/modules.ts:45-51` بلافاصله `extractBearerToken` و `401` — هیچ `handleCors` و هیچ شاخهٔ `OPTIONS` در کل فایل (۱۹۱ خط)؛ `frontend/src/lib/arshApi.ts:33-39` همیشه هدر `Authorization` می‌فرستد |
| ۸ | نبود timeout در فراخوانی‌های حیاتی | P1 | باز | `api/_lib/auth.ts:19-23`، `:72-76`، `:97-106`، `:126-128` چهار `fetch` بدون `signal`؛ `api/_lib/firestore.ts:155`، `:231`، `:281`، `:359`، `:391` بدون timeout. الگوی درست در همان مخزن: `api/user/delete-account.ts:58` `signal: AbortSignal.timeout(20_000)` |
| ۹ | خواندن نامحدود کل مجموعه پیش از صفحه‌بندی | P1 | باز | `api/_lib/firestore.ts:151-169` حلقهٔ `do { ... } while (pageToken)` تمام اسناد را در حافظه جمع می‌کند و `:216-217` تازه بعد `slice` می‌زند؛ `:422` `listUserTasks(user, { limit: Number.MAX_SAFE_INTEGER })`؛ `api/_lib/agentApi.ts:136` `collection(...).get()` بدون limit؛ `api/_lib/assistantTasks.ts:26` `collection(grant).get()` بدون limit |
| ۱۰ | انتشار APK دیباگ ۳۵ مگابایتی در مخزن | P1 | جزئی | رفع‌شده: `git status` → `D  ARSHNAZ-debug.apk` (حذف staged از ایندکس) و `.gitignore:85-87` `*.apk`/`*.aab`/`*.apks`؛ باقی‌مانده: فایل هنوز روی دیسک (۳۵٬۰۹۶٬۰۵۸ بایت) و ردیابی‌نشده است، `build-android-apk.bat:31,41-42` همچنان `gradlew.bat assembleDebug` و کپی به ریشهٔ مخزن (`ARSHNAZ-debug.apk`, `Arshiam-latest.apk`)، و blob در تاریخ باقی است (`git log -- ARSHNAZ-debug.apk` → `b1e9d0b`) |
| ۱۱ | محدودیت نرخ درون‌حافظه‌ای با کلید هدر تأییدنشده | P2 | باز | `api/_lib/rateLimiter.ts:13` `const buckets = new Map<string, RateBucket>()` (سطح ماژول، بدون eviction)؛ `api/_lib/agentApi.ts:977-978` `const clientKey = req.headers?.authorization \|\| req.socket?.remoteAddress \|\| "global_client"` **پیش از** احراز هویت؛ `git grep -l checkRateLimit api` → فقط `agentApi.ts`, `rateLimiter.ts`, `agentApi.test.ts` ⇒ مسیرهای `api/tasks/*` و `api/assistant/*` بدون محدودیت |
| ۱۲ | `audit-log` با اسکوپ ضعیف `tasks:read` | P2 | باز | `api/_lib/agentApi.ts:1024` `authenticateAssistant(req, res, "tasks:read")` برای `audit-log`؛ `:627` ثبت عنوان: `auditLog(grant, isDiary ? "memories:create_diary" : ..., title \|\| "Diary Entry")`؛ `:943-948` بازگرداندن رکوردها؛ `api/_lib/assistantTasks.ts:21,94` `...(before ? { before } : {})` و `auditData(grant, "update", id, snapshot.data())` (کل سند قبلی) |
| ۱۳ | `Access-Control-Allow-Origin: *` + نبود هدرهای امنیتی | P2 | باز | `api/_lib/response.ts:12` و `:27` `res.setHeader("Access-Control-Allow-Origin", "*")` (روی هر پاسخ، از جمله ۴۰۱/۵۰۰)؛ `vercel.json` (کل ۱۹ خط) هیچ کلید `headers` ندارد؛ `frontend/index.html` هیچ متا CSP ندارد |
| ۱۴ | بازتاب پیام خطای داخلی به کلاینت | P2 | باز | `api/tasks/index.ts:103-108` `sendError(res, 500, "INTERNAL_ERROR", error?.message \|\| ...)`؛ `api/tasks/[id].ts:116-121`؛ `api/tasks/today.ts:37-42`؛ `api/_lib/agentApi.ts:1172`؛ `api/user/me.ts:26-31` |
| ۱۵ | idempotency درون‌حافظه‌ای و بدون سقف کلید در memories | P2 | باز | `api/_lib/agentApi.ts:15` `const idempotencyCache = new Map<...>()`؛ `:26-35` انقضا فقط هنگام خواندن؛ `:291` سقف ۲۰۴۸ فقط در مسیر تسک؛ `:595-600` و `:634-636` در `handleCreateMemory` هیچ بررسی طولی نیست |
| ۱۶ | نبود اعتبارسنجی در PATCH تقویم | P2 | باز | `api/_lib/agentApi.ts:900` `patch.title = String(body.title).trim()` (بدون بررسی خالی)، `:904` `patch.status = body.status` (بدون allow-list)، `:905` `patch.completed = Boolean(body.completed)` ⇒ `Boolean("false") === true` |
| ۱۷ | `/weather` و `/geocode` بدون احراز هویت + کش بی‌سقف | P2 | نیازمند تصمیم مالک | `backend/weather.py:27` و `:65` بدون `Depends(current_user_id)` (مقایسه: `backend/attachments.py:118` دارد)؛ `:60` `db.weather_cache.update_one(..., upsert=True)` با کلید دو-رقم اعشار (`:22-23`)؛ **اما** کلاینت عامدانه بدون احراز هویت صدا می‌زند: `frontend/src/lib/weather.ts:39,52` `arshFetch(..., {}, false)` |
| ۱۸ | خواندن کل بدنهٔ آپلود پیش از بررسی حجم | P2 | باز | `backend/attachments.py:151-154` `data = await request.body()` سپس `validate_upload(att.mime_type, len(data))` (سقف ۲۵MB در `:29` بعد از بارگذاری کامل اعمال می‌شود) |
| ۱۹ | `installCommand` مبتنی بر yarn بدون `yarn.lock` | P2 | رفع‌شده | `vercel.json:4-5` `"installCommand": "npm ci && cd frontend && npm ci"` و `"buildCommand": "cd frontend && npm run typecheck && npx vite build"`؛ `package-lock.json` ریشه و `frontend/package-lock.json` موجود؛ `yarn.lock` در هیچ‌کدام موجود نیست؛ `frontend/.npmrc` = `legacy-peer-deps=true` |
| ۲۰ | نبود CI و نبود اسکریپت تست در ریشه | P2 | باز | `.github` وجود ندارد (بررسی مستقیم)؛ تنها YAML پروژه `.emergent/emergent.yml` است؛ `package.json:6-9` (ریشه) فقط `build` و `android:build` — هیچ `test`/typecheck/اعتبارسنجی قواعد |
| ۲۱ | دو پیاده‌سازی موازی ماژول‌ها با مدل ادمین متفاوت | P2 | باز | `backend/modules.py:45-47` `is_admin`: `claims.get("admin") is True or claims.get("role") == "admin" or email in _admin_emails()` در برابر `api/arsh/modules.ts:62-63` که فقط `claims.email_verified === true` + ایمیل ثابت/`ARSH_ADMIN_EMAILS` را می‌پذیرد؛ ذخیره‌سازی: MongoDB در برابر Firestore |
| ۲۲ | وابستگی از URL شخص‌ثالث + پین‌های قدیمی | P2 | باز | `backend/requirements.txt:57` `litellm @ https://customer-assets.emergentagent.com/...whl#sha256=...`؛ `:24` `fastapi==0.110.1`؛ `:110` `starlette==0.37.2`؛ هیچ lock Python در مخزن نیست |
| ۲۳ | `allowBackup=true` + `minifyEnabled false` + وابستگی alpha | P2 | باز | `frontend/android/app/src/main/AndroidManifest.xml:5-7` `android:allowBackup="true"`؛ `frontend/android/app/build.gradle:37` `minifyEnabled false` (build type release)؛ `:59` `androidx.security:security-crypto:1.1.0-alpha06`؛ **ابهام گزارش رفع شد:** `res/xml/backup_rules.xml` و `data_extraction_rules.xml` فقط سه فایل `sharedpref` (`arshnaz_*`) را مستثنا می‌کنند و `app_webview`/`databases` (localStorage و IndexedDB وب‌ویو شامل نشست Firebase) از بکاپ مستثنا **نشده‌اند** |
| ۲۴ | کلید امضا می‌تواند کامیت شود | P2 | باز | `frontend/android/.gitignore:55-58` هر دو خط `#*.jks` و `#*.keystore` کامنت‌شده؛ `.gitignore` ریشه هیچ `*.jks`/`*.keystore` ندارد (فقط `*.apk`/`*.aab` در `:85-86`)؛ `build.gradle:22,27` مسیر پیش‌فرض `file('release.keystore')`. **مورد مثبت تأییدشده:** `git ls-files` هیچ `.jks`/`.keystore`/`google-services.json` ندارد |
| ۲۵ | `exported=true` و deep link بدون اعتبارسنجی مبدأ | P2 | باز | `AndroidManifest.xml:23` `MainActivity` با `:30-35` فیلتر `arshnaz://` + `BROWSABLE`؛ `:43` `WidgetConfigureActivity android:exported="true"`؛ `:88-90` `ArshnazWidgetProvider android:exported="true"`؛ `MainActivity.java:68-77` `extractRawUrl` نشانی خام را بدون اعتبارسنجی مبدأ به وب‌ویو پاس می‌دهد (`forwardIntentToWeb`، `:113-127`)؛ مبدأ deep link: `backend/google_integration.py:124` `RedirectResponse(f"arshnaz://google-connected?result={result}")` |
| ۲۶ | `extraAdmins` آرایهٔ شامل رشتهٔ خالی | P2/P3 | باز | `api/arsh/modules.ts:61` `(process.env.ARSH_ADMIN_EMAILS \|\| "").split(",").map((s) => s.trim().toLowerCase())` ⇒ `[""]`؛ `:63` `extraAdmins.includes(email)` (فیلتر `Boolean` نشده — مقایسه با نسخهٔ پایتون `backend/modules.py:42` که `if e.strip()` دارد) |
| ۲۷ | تست IDOR صوری در `api.test.ts` | P3 | باز | `api/api.test.ts:620-654` — عنوان «... or other user task» ولی mock در `:631-633` فقط `/users/uid_test/tasks/non_existent` را ۴۰۴ می‌کند و هیچ assertion روی URL فراخوانی‌شده یا سند کاربر دیگر وجود ندارد |
| ۲۸ | تناقض/کهنگی `test_reports` | P3 | باز | `test_reports/iteration_4.json:20` «All 36 API tests passed (api/api.test.ts: 14 ...)» در حالی که اکنون `api/api.test.ts` ۲۶ تست است و اجرای واقعی ۸۵ تست در ۸ فایل است؛ `iteration_6.json:32` `"backend": "N/A (Firebase-based app, no traditional backend API)"`؛ هیچ‌کدام از ۶ گزارش فیلد `date`/`commit` ندارند (grep بی‌نتیجه)؛ `iteration_5.json:13` `"fix_priority": "HIGH"` |
| ۲۹ | الزام `ARSH_SIGNING_SECRET` برای `GET /me` | P3 | باز | `api/arsh/modules.ts:46-49` اگر `FIREBASE_SERVICE_ACCOUNT_JSON`/`GOOGLE_APPLICATION_CREDENTIALS` **یا** `ARSH_SIGNING_SECRET` (≥۳۲ کاراکتر) نباشد، همهٔ درخواست‌ها ۵۰۳ می‌شوند؛ `:35-37` راز فقط در `codeHash` استفاده می‌شود؛ مسیر خواندن `/me` در `:74-76` به آن نیازی ندارد |
| ۳۰ | `jwt.decode(..., verify_signature: False)` | P3 | باز | `backend/google_integration.py:150` `email = jwt.decode(tok["id_token"], options={"verify_signature": False}).get("email")` و ذخیره در `google_tokens` در `:151-159` |
| ۳۱ | بررسی HTTPS بر پایهٔ هدر قابل‌جعل | P3 | باز | `api/_lib/agentApi.ts:971-974` `const proto = req.headers?.["x-forwarded-proto"]; if (proto && proto !== "https" && ...)` — در نبود هدر هیچ بررسی‌ای انجام نمی‌شود |
| ۳۲ | مسیر شیء از نام فایل کاربر | P3 | باز | `backend/attachments.py:121` `ext = (body.file_name.rsplit(".", 1)[-1] ...).lower()[:10]` و `:129` `storage_path=f"{APP_NAME}/attachments/{uid}/{uuid.uuid4()}.{ext}"`؛ همان الگو در `backend/google_integration.py:215` |
| ۳۳ | `robots.txt` اجازهٔ ایندکس کامل + `.gitconfig` | P3 | باز | `frontend/public/robots.txt:13-14` `User-agent: *` / `Allow: /` (بدون `Disallow`)؛ `.gitconfig` در ریشهٔ مخزن **ردیابی‌شده** است و محتوای آن `github@emergent.sh` / `emergent-agent-e1` است (`git ls-files` شامل `.gitconfig`) |

---

## (ب) شمارش دقیق وضعیت‌ها

| وضعیت | تعداد | شمارهٔ یافته‌ها |
|---|---|---|
| رفع‌شده (FIXED) | **۳** | ۲، ۶، ۱۹ |
| جزئی (PARTIAL) | **۱** | ۱۰ |
| باز (OPEN) | **۲۷** | ۳، ۴، ۵، ۷، ۸، ۹، ۱۱، ۱۲، ۱۳، ۱۴، ۱۵، ۱۶، ۱۸، ۲۰، ۲۱، ۲۲، ۲۳، ۲۴، ۲۵، ۲۶، ۲۷، ۲۸، ۲۹، ۳۰، ۳۱، ۳۲، ۳۳ |
| نیازمند تصمیم مالک | **۲** | ۱، ۱۷ |
| ردشده (REFUTED) | **۰** | — |
| **جمع** | **۳۳** | — |

**نکتهٔ حیاتی:** یافتهٔ ۲ در مخزن رفع شده، اما چون هیچ مسیر استقراری برای قواعد وجود ندارد (یافتهٔ ۵) و `npm run test:rules` هم به `rules-tests/vitest.config.ts` ناموجود اشاره می‌کند (`frontend/package.json:15`)، **قواعد واقعی پروژهٔ تولید از مخزن قابل بازتولید و قابل اثبات نیست**. مقدار مؤثر یافتهٔ ۲ در محیط تولید: UNVERIFIABLE-FROM-REPO تا زمانی که یافتهٔ ۵ بسته شود.

---

## (ج) کارهای باقی‌ماندهٔ قابل انجام بدون تصمیم مالک (به ترتیب اولویت)

| اولویت | یافته | اصلاح کمینه (فایل + تغییر دقیق) | ریسک |
|---|---|---|---|
| ۱ | ۵ + تست قواعد | افزودن `firebase.json` با `{"firestore":{"rules":"firestore.rules"},"storage":{"rules":"storage.rules"}}` و ساخت `frontend/rules-tests/vitest.config.ts` (یا اصلاح مسیر در `frontend/package.json:15`) + افزودن `firebase-tools` به devDependencies | صفر برای کد اجرایی؛ فقط فایل‌های جدید. اجرای واقعی `firebase deploy` نیازمند اعتبارنامهٔ مالک است (بخش د) |
| ۲ | ۴ | افزودن مرحلهٔ `deleteModuleCodeRedeemers(uid)` در `api/user/delete-account.ts` (پیمایش `codeRef.collection("redeemers").doc(uid).delete()` روی کدهای بازخریدشده) و ثبت آن در `api/_lib/accountDeletion.ts:17` پیش از `deleteAuthUser` | متوسط: نیازمند یک پرس‌وجوی collection-group یا فهرست کدهای کاربر؛ خطای آن نباید حذف Auth را متوقف کند |
| ۳ | ۳ | در `api/user/delete-account.ts:39-46` به‌جای بازگشت ۵۰۳، وقتی `ARSH_API_BASE_URL` تنظیم نشده `deleteLegacyAttachments` را no-op با `console.warn` کنید و بقیهٔ مراحل اجرا شوند | متوسط: فایل‌های پیوست سرویس قدیمی حذف نمی‌شوند (بدهی انطباقی مستند) — مسیر جایگزین در بخش د |
| ۴ | ۷ | در ابتدای `api/arsh/modules.ts:45` افزودن `if (handleCors(req, res)) return;` با import از `../_lib/response.js` | کم: تنها رفتار تغییر یافته پاسخ به `OPTIONS` است؛ ترتیب بررسی پیکربندی باید بعد از CORS بیاید |
| ۵ | ۸ | افزودن `api/_lib/fetchWithTimeout.ts` و جایگزینی ۴ `fetch` در `api/_lib/auth.ts:19,72,97,126` و ۵ `fetch` در `api/_lib/firestore.ts:155,231,281,359,391` | کم: در timeout باید ۵۰۳ برگردد نه ۴۰۱ (تا قطعی سرویس با «توکن نامعتبر» اشتباه نشود) |
| ۶ | ۹ | محدودکردن `listUserTasks` (`api/_lib/firestore.ts:151-169`) با `pageSize` ورودی/سقف صفحه، و در `:422` جای `Number.MAX_SAFE_INTEGER` یک پرس‌وجوی بازه‌ای (مثلاً `work_date >= today-90d`) یا `limit` منطقی؛ افزودن `.limit()` در `api/_lib/agentApi.ts:136` و `api/_lib/assistantTasks.ts:26` | متوسط: تغییر قرارداد پاسخ `/api/tasks` و `/api/tasks/today` برای کاربران با دادهٔ زیاد — نیازمند هماهنگی با فرانت |
| ۷ | ۲۰ | افزودن `.github/workflows/api.yml` با سه گام: `npm ci`، `cd frontend && npm run typecheck`، `cd frontend && npm run test:api` | صفر برای کد؛ اولین اجرا ممکن است خطاهای موجود typecheck را آشکار کند |
| ۸ | ۱۳ | افزودن کلید `headers` به `vercel.json` برای `/(.*)`: `X-Content-Type-Options: nosniff`، `Referrer-Policy: strict-origin-when-cross-origin`، `X-Frame-Options: DENY`، `Strict-Transport-Security: max-age=63072000; includeSubDomains` | کم: CSP را عمداً اضافه نکنید (اسکریپت inline تم در `frontend/index.html:5`) مگر با nonce؛ بخش CORS در بخش د |
| ۹ | ۱۴ | جایگزینی `error?.message` با پیام ثابت عمومی در `api/tasks/index.ts:107`، `api/tasks/[id].ts:120`، `api/tasks/today.ts:41`، `api/_lib/agentApi.ts:1172`، `api/user/me.ts:30` و افزودن `errorId` تصادفی به لاگ/پاسخ | کم: دیباگ سخت‌تر می‌شود (با errorId جبران می‌شود)؛ تست‌های فعلی پیام خطا را assert نمی‌کنند |
| ۱۰ | ۱۶ | در `api/_lib/agentApi.ts:899-905` استفاده از `validateTaskInput(body)`/`taskCompletionWrite(body)` و رد ۴۰۰ برای عنوان خالی/status نامعتبر (هم‌الگو با `:363-368`) | کم: ممکن است کلاینت‌هایی که `completed: "false"` می‌فرستند ۴۰۰ بگیرند (رفتار کنونی bug است) |
| ۱۱ | ۱۱ | تغییر کلید محدودیت در `api/_lib/agentApi.ts:977` به UID تأییدشده (پس از `authenticateAssistant`) و افزودن `checkRateLimit` به `api/tasks/index.ts`، `api/tasks/[id].ts`، `api/tasks/today.ts`، `api/assistant/tasks/*` | متوسط: سبدها هنوز درون‌حافظه‌ای‌اند (چند نمونه = چند سبد)؛ برای رفع کامل باید Firestore/Upstash (نیازمند سرویس بیرونی) |
| ۱۲ | ۱۲ | تغییر اسکوپ مسیر `audit-log` در `api/_lib/agentApi.ts:1024` به `memories:read` یا فیلتر رکوردها به `tasks:*`/`folders:*` وقتی اسکوپ فقط `tasks:read` است | متوسط: توکن‌های دستیار موجود با اسکوپ `tasks:read` ممکن است به audit-log نیاز داشته باشند (شکست ۴۰۳) |
| ۱۳ | ۱۵ | افزودن سقف طول کلید در `api/_lib/agentApi.ts:596` (همان `> 2048` خط `:291`) و سقف/eviction برای `idempotencyCache` (`:15`) | کم؛ انتقال به Firestore (مثل `:68-84`) ریسک هزینه/نوشتن دارد |
| ۱۴ | ۱۸ | در `backend/attachments.py:151` پیش از `await request.body()` بررسی `Content-Length` (۴۱۳ در صورت عبور از `MAX_BYTES`) و خواندن استریمی با شمارندهٔ بایت | کم اگر سرویس FastAPI واقعاً مستقر باشد (بخش د) |
| ۱۵ | ۲۴ | افزودن `*.jks` و `*.keystore` به `.gitignore` ریشه و حذف مسیر پیش‌فرض `'release.keystore'` در `frontend/android/app/build.gradle:22,27` (فقط `KEYSTORE_PATH`) | کم: بیلد release بدون `KEYSTORE_PATH` دیگر امضا نمی‌شود (امضای محیطی الزامی می‌شود) |
| ۱۶ | ۲۶ | `.filter(Boolean)` روی `extraAdmins` در `api/arsh/modules.ts:61` و `isAdmin = false` صریح در صورت خالی‌بودن ایمیل (`:63`) | صفر: رفتار برای همهٔ ایمیل‌های واقعی یکسان است |
| ۱۷ | ۱۰ | تغییر `build-android-apk.bat:31,41-42` به `assembleRelease` و انتقال خروجی به پوشهٔ خارج از ریشه (یا مسیر `dist/`) | کم: تا زمانی که امضا تنظیم نشود، بیلد release شکست می‌خورد؛ امضای محیطی لازم است. پاک‌سازی تاریخ = بخش د |
| ۱۸ | ۲۵ | اعتبارسنجی پارامتر `result` در `MainActivity.java:68-77` (نادیده‌گرفتن منبع بیرونی) یا راستی‌آزمایی سمت سرور؛ تغییر `WidgetConfigureActivity` (`AndroidManifest.xml:43`) به `exported="false"` در صورت امکان | کم تا متوسط: `WidgetConfigureActivity` برای AppWidget configure واقعاً نیاز به exported دارد (ممکن است تغییر نپذیرد) |
| ۱۹ | ۲۳ | `android:allowBackup="false"` در `AndroidManifest.xml:5` (یا افزودن `app_webview`/`databases`/`shared_prefs` به هر دو فایل `res/xml/backup_rules.xml` و `data_extraction_rules.xml`)؛ `minifyEnabled true` + `shrinkResources true` در `build.gradle:37`؛ ارتقای `security-crypto` از `1.1.0-alpha06` (`:59`) | متوسط: `allowBackup=false` رفتار محصول را تغییر می‌دهد (بخش د)؛ `minifyEnabled true` نیازمند قواعد ProGuard برای پلاگین‌های Capacitor است و می‌تواند بیلد را بشکند |
| ۲۰ | ۲۹ | جدا کردن نیاز راز: در `api/arsh/modules.ts:46-49` فقط Firebase Admin برای `GET /me` الزام شود و `ARSH_SIGNING_SECRET` در مسیرهای redeem/admin بررسی شود؛ کد خطا تفکیک شود | کم |
| ۲۱ | ۳۰ | حذف `options={"verify_signature": False}` در `backend/google_integration.py:150` و استفاده از `google.oauth2.id_token.verify_oauth2_token(..., GOOGLE_CLIENT_ID)` | کم: نیازمند `GOOGLE_CLIENT_ID` قابل‌اعتماد |
| ۲۲ | ۳۱ | حذف بررسی `x-forwarded-proto` در `api/_lib/agentApi.ts:971-974` (Vercel خودش HTTPS را اجباری می‌کند) و اتکا به HSTS بند ۸ | صفر |
| ۲۳ | ۳۲ | محدودکردن `ext` به allow-list در `backend/attachments.py:121` (و `backend/google_integration.py:215`)، مثلاً `re.fullmatch(r"[a-z0-9]{1,10}", ext)` و در غیر این صورت استخراج از `mimetypes` | کم |
| ۲۴ | ۳۳ | افزودن `Disallow: /app/` و `Disallow: /api/` به `frontend/public/robots.txt` و `git rm --cached .gitconfig` + افزودن `.gitconfig` به `.gitignore` | کم (فقط `.gitconfig` محلی ابزارها را تغییر می‌دهد) |
| ۲۵ | ۲۲ | پین `litellm` از PyPI با هش رسمی، ارتقای `fastapi`/`starlette` در `backend/requirements.txt:24,57,110`، افزودن `requirements.lock` | متوسط: ارتقای Starlette می‌تواند کد FastAPI را بشکند — نیازمند اجرای تست‌های `backend/` (اگر آن سرویس زنده باشد) |
| ۲۶ | ۲۷ | افزودن تست واقعی جداسازی: mock سند `users/uid_B/tasks/...` + assertion روی URL فراخوانی‌شده در `api/api.test.ts` | صفر |
| ۲۷ | ۲۸ | مهر `commit`/`date`/دستور اجرا روی گزارش‌های `test_reports/*.json` و بایگانی گزارش‌های منقضی | صفر |
| ۲۸ | ۲۱ | یکسان‌سازی مدل `is_admin` در `backend/modules.py:45-47` با `api/arsh/modules.ts:62-63` (حذف پذیرش `role == "admin"`) | کم؛ حذف کل `backend/modules.py` = بخش د |

---

## (د) نیازمند تصمیم مالک

| # | تصمیم | گزینه‌ها | پیامد هر گزینه |
|---|---|---|---|
| ۱ | مسیرهای احراز هویت با توکن دسترسی گوگل (`api/_lib/auth.ts:95-142`) | (الف) فقط `verifyFirebaseIdToken`/`firebase-admin verifyIdToken` پذیرفته شود و مسیرهای ۲ و ۳ حذف شوند | (الف) بک‌دور P0 بسته می‌شود؛ جریان عمدی «Gemini Spark» که در کامنت `:123` مستند شده می‌شکند |
| | | (ب) مسیرهای گوگل با allow-list از `GOOGLE_CLIENT_ID`های مورد اعتماد + بررسی `aud` + `email_verified` محدود شوند و پیش‌فرض غیرفعال باشد | (ب) جریان حفظ می‌شود ولی نیازمند فهرست دقیق client-idها و تست رگرسیون است؛ اگر client-id اشتباه پیکربندی شود، همان بک‌دور باقی می‌ماند |
| | | (ج) بدون تغییر | (ج) هر توکن دسترسی گوگل (از هر اپ/پروژه) با `accounts:signInWithIdp` روی API Key عمومی به نشست کامل Firebase تبدیل می‌شود ⇒ تصاحب حساب |
| ۲ | آیا سرویس FastAPI (`backend/**`) در تولید مستقر است؟ | (الف) بله، مستقر است و آدرسش در Vercel تنظیم شده | (الف) یافته‌های ۳، ۱۷، ۱۸، ۲۱، ۲۲، ۳۰، ۳۲ همه زنده‌اند و باید طبق بخش ج رفع شوند؛ برای ۳ باید `ARSH_API_BASE_URL` معتبر بماند |
| | | (ب) خیر، سرویس بازنشسته شده | (ب) یافته‌های ۳ و ۱۷ صرفاً کد مرده‌اند؛ کوتاه‌ترین مسیر: حذف پوشهٔ `backend/`، حذف مرحلهٔ `legacy-attachments` و حذف `frontend/src/lib/weather.ts` — تصمیم مالک برای حذف فیچر هواشناسی/گالری لازم است |
| ۳ | حذف حساب و سرویس قدیمی (`api/user/delete-account.ts:39-46`) | (الف) سرویس همراه به‌صورت پروژهٔ جدا deploy و `ARSH_API_BASE_URL` تنظیم شود | (الف) حذف کامل و انطباقی؛ هزینهٔ نگه‌داری یک سرویس دیگر + MongoDB |
| | | (ب) مرحلهٔ `legacy-attachments` اختیاری شود (بخش ج، بند ۳) | (ب) حذف حساب فوراً کار می‌کند؛ پیوست‌های قدیمی روی سرویس FastAPI باقی می‌مانند (ریسک انطباقی مستند) |
| | | (ج) وضع فعلی (۵۰۳) بماند | (ج) هیچ کاربری نمی‌تواند حسابش را حذف کند — نقض حق حذف |
| ۴ | احراز هویت `/api/arsh/weather` و `/api/arsh/geocode` (`backend/weather.py:27,65`) | (الف) افزودن `Depends(current_user_id)` + تغییر `frontend/src/lib/weather.ts:39,52` به حالت authed | (الف) سوءاستفادهٔ منبعی بسته می‌شود؛ هر مصرف‌کنندهٔ بدون ورود (ویجت هواشناسی قبل از login، اسکرین‌شات‌ها، یکپارچه‌سازی بیرونی) می‌شکند |
| | | (ب) عمومی بماند + محدودیت نرخ + TTL/سقف روی `weather_cache` | (ب) فیچر دست‌نخورده می‌ماند؛ سوءاستفاده محدود می‌شود ولی حذف نمی‌شود |
| ۵ | کانال استقرار قواعد Firestore/Storage (`firestore.rules:81`، `storage.rules`) | (الف) CI با Firebase CLI و سرویس‌اکانت | (الف) قواعد قابل بازتولید و محافظت‌شده؛ نیازمند راز جدید در CI |
| | | (ب) اسکریپت مستند `npm run deploy:rules` و اجرای دستی | (ب) کم‌هزینه؛ وابسته به انضباط انسانی |
| | | (ج) بدون تغییر | (ج) یافتهٔ ۲ در تولید بی‌اثر می‌ماند؛ قواعد واقعی پروژهٔ `gen-lang-client-0845891098` از مخزن قابل اثبات نیست |
| ۶ | مبدأهای مجاز CORS (`api/_lib/response.ts:12,27`) | (الف) `*` بماند (وضع فعلی) | (الف) هر سایتی می‌تواند با توکن به‌دست‌آمده درخواست کامل بزند و پاسخ را بخواند |
| | | (ب) allow-list: دامنهٔ خودتان + `capacitor://localhost` + `https://localhost` | (ب) سطح حملهٔ مرورگری کم می‌شود؛ هر مبدأ دیگری (پیش‌نمایش Vercel، دامنهٔ سفارشی، ابزار بیرونی) ۴۰۳ می‌گیرد و باید فهرست شود |
| ۷ | تاریخ مخزن و APK دیباگ (یافتهٔ ۱۰) | (الف) blob ۳۵MB در تاریخ بماند | (الف) هر clone کامل آن را می‌گیرد؛ توکن‌های باقی‌مانده در APK دیباگ قدیمی قابل استخراج‌اند |
| | | (ب) بازنویسی تاریخ (`git filter-repo` یا `commit --amend` روی `b1e9d0b`) + force-push | (ب) مخزن سبک و پاک می‌شود؛ clone/PR/بازمانده‌های محلی دیگران می‌شکند |
| ۸ | `allowBackup` و سخت‌سازی Android (`AndroidManifest.xml:5`) | (الف) `allowBackup="false"` | (الف) نشست Firebase و دادهٔ محلی از بکاپ/انتقال خارج می‌شوند؛ کاربر با تعویض دستگاه دادهٔ محلی (نه دادهٔ ابری) را از دست می‌دهد |
| | | (ب) `allowBackup="true"` + مستثنا کردن `app_webview`/`databases`/`shared_prefs` در هر دو فایل قواعد بکاپ | (ب) پیکربندی پیچیده‌تر؛ احتمال باقی‌ماندن مسیر نشت در نسخه‌های آیندهٔ Capacitor |
| ۹ | سرنوشت پیاده‌سازی موازی ماژول‌ها (یافتهٔ ۲۱) | (الف) حذف `backend/modules.py` و تک‌منبعی شدن روی Firestore | (الف) واگرایی مجوزدهی تمام می‌شود؛ اگر نسخه‌ای از اپ/کلاینت قدیمی که به FastAPI وصل است وجود داشته باشد می‌شکند |
| | | (ب) نگه‌داشتن هر دو با یکسان‌سازی `is_admin` (بخش ج، بند ۲۸) | (ب) کم‌ریسک؛ ریشهٔ واگرایی باقی می‌ماند |
| ۱۰ | محتوای `robots.txt` (یافتهٔ ۳۳) | (الف) `Disallow: /app/` و `/api/` + هدر `X-Robots-Tag: noindex` | (الف) حریم خصوصی بهتر؛ امکان ایندکس‌شدن صفحهٔ معرفی/نصب توسط موتورهای جست‌وجو از بین می‌رود |
| | | (ب) وضع فعلی (`Allow: /`) | (ب) پوستهٔ عمومی اپ شخصی سلامت روان/دفتر خاطرات ایندکس می‌شود |

---

## پیوست: اقلامی که از داخل مخزن قابل اثبات نبودند (UNVERIFIABLE-FROM-REPO)

1. **قواعد واقعی فعال در پروژهٔ Firebase** و اینکه آیا `firestore.rules:81` در تولید اعمال شده است (وابسته به یافتهٔ ۵).
2. **مقدار `ARSH_API_BASE_URL`/`VITE_ARSH_API_URL`** در محیط Vercel و بیلد Android — تعیین‌کنندهٔ شدت واقعی یافته‌های ۳ و ۷(ب).
3. **`ARSH_SIGNING_SECRET`، `ARSH_ADMIN_EMAILS`، `FIREBASE_SERVICE_ACCOUNT_JSON`** — نبودشان در محیط باعث ۵۰۳ کل سرویس ماژول می‌شود (یافتهٔ ۲۹) ولی از مخزن قابل بررسی نیست.
4. **استقرار واقعی `backend/**`** (FastAPI + MongoDB) و آدرس آن.
5. **وضعیت کلید امضای Android** (`KEYSTORE_PATH` و وجود/عدم وجود keystore در محیط بیلد) — مخزن فقط نشان می‌دهد هیچ keystore‌ای کامیت نشده است.
6. **سقف/سهمیه‌های Firestore و اجرای چند-نمونه‌ای Vercel** — تعیین‌کنندهٔ شدت واقعی یافته‌های ۹ و ۱۱.
