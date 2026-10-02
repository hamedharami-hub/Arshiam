# راهنمای اندروید: آدرس سرویس ارشناز و تست پیوست روی گوشی

نسخهٔ اندروید (Capacitor) فایل‌های وب را داخل خود APK دارد. پس برخلاف پیش‌نمایش وب، خودش نمی‌داند سرویس FastAPI کجاست.
این سرویس این کارها را انجام می‌دهد: پیوست‌ها، هواشناسی، تعطیلات، گوگل درایو و فوتوز، و بخش‌های پیشرفته.
آدرس سرویس باید **هنگام ساختن APK** در متغیر `VITE_ARSH_API_URL` قرار بگیرد.

## ۱. آدرس سرویس را پیدا کن
- پیش‌نمایش فعلی: `https://arshiam-preview.preview.emergentagent.com`
- بعد از Deploy در Emergent: آدرس دامنهٔ Deploy‌شده (مثلاً `https://arshnaz.emergent.host`)
- فقط origin را بنویس، بدون `/api/arsh` و بدون `/` آخر.

> آدرس پیش‌نمایش ممکن است بعد از مدتی عوض شود یا بخوابد. برای APK نهایی، آدرس Deploy‌شده را بگذار.

## ۲. ساختن APK

### الف) GitHub Actions (پیشنهادی)
1. در گیت‌هاب: **Settings › Secrets and variables › Actions › Variables › New repository variable**
2. Name: `VITE_ARSH_API_URL` و Value: آدرس مرحلهٔ ۱
3. **Actions › Android Build › Run workflow**. فایل `android-build.yml` این متغیر را خودش به `npm run build` می‌دهد.

### ب) روی کامپیوتر خودت (Android Studio)
در پوشهٔ پروژه یک فایل `.env.production.local` بساز (در گیت ثبت نمی‌شود):
```
VITE_ARSH_API_URL=https://arshiam-preview.preview.emergentagent.com
```
بعد:
```
npm ci
npm run build
npx cap sync android
```
و در Android Studio: **Build › Build APK(s)**.

### ج) Codemagic
در **Environment variables** همان `VITE_ARSH_API_URL` را اضافه کن.

## ۳. بررسی سریع روی گوشی
1. APK را نصب کن و با حساب خودت وارد شو.
2. یک تسک باز کن، به بخش پیوست برو و **افزودن فایل** را بزن. یک عکس کوچک انتخاب کن.
   - نوار پیشرفت باید تا ۱۰۰٪ برود و عکس کوچک نمایش داده شود.
   - با لمس عکس، پیش‌نمایش بزرگ باز می‌شود.
3. یک PDF اضافه کن و **پیش‌نمایش PDF** را بزن.
4. حالت هواپیما را روشن کن و یک فایل دیگر اضافه کن. باید پیام «در صف آفلاین» بیاید. حالت هواپیما را خاموش کن. فایل باید خودش آپلود شود.
5. پیوست را حذف کن. نباید بعد از بستن و باز کردن تسک برگردد.
6. فایل بزرگ‌تر از ۲۵ مگابایت باید با پیام خطا رد شود.

اگر در مرحلهٔ ۲ پیام «فهرست پیوست‌ها از سرور دریافت نشد» دیدی، یعنی `VITE_ARSH_API_URL` خالی یا اشتباه بوده است. APK را دوباره بساز.

## ۴. گوگل درایو و فوتوز روی اندروید
- دکمهٔ «اتصال حساب گوگل» صفحهٔ ورود گوگل را در **مرورگر سیستم** باز می‌کند. گوگل ورود داخل WebView را مسدود می‌کند.
- بعد از تأیید، گوگل به سرور برمی‌گردد و سرور با لینک `arshnaz://google-connected` اپ را دوباره باز می‌کند.
- انتخاب از گوگل فوتوز هم در مرورگر یا اپ Google Photos باز می‌شود. بعد از زدن **Done** به اپ برگرد. عکس‌ها چند ثانیه بعد خودشان اضافه می‌شوند.
- Google Picker درایو برای وب ساخته شده است. اگر روی گوشی باز نشد، از نسخهٔ وب استفاده کن. آپلود به پوشهٔ Arshnaz در درایو روی هر دو کار می‌کند.

## ۵. تنظیم گوگل کلاد (یک بار)
1. console.cloud.google.com را باز کن و پروژه‌ات را بالای صفحه انتخاب کن.
2. **APIs & Services › Library**: سه API زیر را جست‌وجو کن و **Enable** را بزن:
   - Google Drive API
   - Google Picker API
   - Photos Picker API
3. **APIs & Services › OAuth consent screen**:
   - در **Data access / Scopes** این دو scope را اضافه کن:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`
   - در **Audience / Test users** ایمیل خودت را اضافه کن.
4. **APIs & Services › Credentials › Create credentials › OAuth client ID** از نوع **Web application**:
   - Authorized JavaScript origins: `https://arshiam-preview.preview.emergentagent.com`
   - Authorized redirect URIs: `https://arshiam-preview.preview.emergentagent.com/api/arsh/google/callback`
   - بعد از Deploy، همین دو مقدار را با دامنهٔ Deploy‌شده هم اضافه کن.
5. **Create credentials › API key**. روی کلید بزن و در **API restrictions** فقط **Google Picker API** را انتخاب کن.
6. **Project number** را از **Dashboard** یا **IAM & Admin › Settings** بردار.
7. این چهار مقدار را بفرست: Client ID، Client Secret، API key و Project number. در `backend/.env` به شکل `GOOGLE_CLIENT_ID`، `GOOGLE_CLIENT_SECRET`، `GOOGLE_API_KEY` و `GOOGLE_PROJECT_NUMBER` قرار می‌گیرند.
