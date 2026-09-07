# راهنمای گام‌به‌گام ساخت Android APK با Android Studio

این راهنما به زبان ساده، مرحله به مرحله توضیح می‌دهد چگونه برنامه ARSHNAZ را با Android Studio روی کامپیوتر خودت بسازی.

---

## 🎯 چه چیزهایی نیاز داری

- کامپیوتر با Windows 10/11
- حداقل ۸ GB RAM (۱۶ GB بهتر است)
- حداقل ۱۰ GB فضای خالی (Android Studio حدود ۳ GB + SDK حدود ۵ GB)
- اینترنت برای دانلود

---

## مرحله ۱: دانلود Android Studio

۱. مرورگر را باز کن و به این آدرس برو:
   ```
   https://developer.android.com/studio
   ```

۲. روی دکمه **Download Android Studio** کلیک کن.

۳. شرایط را بپذیر و دانلود شروع می‌شود.
   - فایل حدود ۱ GB است.

---

## مرحله ۲: نصب Android Studio

۱. فایل دانلود شده را اجرا کن (مثلاً `android-studio-xxx-windows.exe`).

۲. روی **Next** بزن تا برسی به صفحه **Install Type**.

۳. گزینه **Standard** را انتخاب کن و Next بزن.

۴. گزینه‌ها را تأیید کن و **Install** را بزن.

۵. صبر کن تا نصب تمام شود (حدود ۵-۱۵ دقیقه).

۶. **Finish** را بزن و Android Studio را باز کن.

---

## مرحله ۳: اولین اجرای Android Studio

۱. وقتی Android Studio باز شد، روی **More Actions** یا **Settings** برو.

۲. از منوی سمت چپ، **SDK Manager** را انتخاب کن.

۳. در تب **SDK Platforms**، این موارد را تیک بزن:
   - `Android 14.0 (API 34)` یا بالاتر
   - `Android 13.0 (API 33)`

۴. در تب **SDK Tools**، این موارد را تأیید کن:
   - `Android SDK Build-Tools`
   - `Android SDK Command-line Tools`
   - `Android Emulator`
   - `Android SDK Platform-Tools`

۵. روی **Apply** و سپس **OK** بزن.
   - این‌ها حدود ۲-۵ GB دانلود می‌شوند.
   - صبر کن تا تمام شود.

---

## مرحله ۴: آماده‌سازی پروژه ARSHNAZ

۱. Terminal را باز کن (PowerShell یا CMD).

۲. به پوشه پروژه برو:
   ```bash
   cd C:\Users\hamed\arshnaz
   ```

۳. مطمئن شو node_modules وجود دارد. اگر ندارد، بزن:
   ```bash
   npm install
   ```

۴. وب اپلیکیشن را build کن:
   ```bash
   npm run build
   ```
   - این مرحله حدود ۱ دقیقه طول می‌کشد.
   - باید پیام `dist` ساخته شد را ببینی.

۵. Capacitor را با Android sync کن:
   ```bash
   npx cap sync android
   ```
   - این مرحله فایل‌های Android را به‌روز می‌کند.

---

## مرحله ۵: باز کردن پروژه در Android Studio

۱. یکی از این دو راه را برو:

   **راه A: از ترمینال**
   ```bash
   npx cap open android
   ```
   - Android Studio به‌طور خودکار باز می‌شود.

   **راه B: دستی**
   - Android Studio را باز کن.
   - روی **Open** کلیک کن.
   - به این مسیر برو:
     ```
     C:\Users\hamed\arshnaz\android
     ```
   - روی **OK** بزن.

۲. Android Studio شروع به sync کردن Gradle می‌کند.
   - این کار اولین بار حدود ۵-۱۰ دقیقه طول می‌کشد.
   - صبر کن تا sync کامل شود.
   - در پایین صفحه باید ببینی: `Gradle sync finished`.

---

## مرحله ۶: ساخت Debug APK

۱. مطمئن شو sync کامل شده است.

۲. روی منوی **Build** در بالا کلیک کن.

۳. روی **Build Bundle(s) / APK(s)** کلیک کن.

۴. روی **Build APK(s)** کلیک کن.

۵. صبر کن. در پایین صفحه پیشرفت build را می‌بینی.
   - حدود ۱-۵ دقیقه طول می‌کشد.

۶. وقتی build تمام شد، یک پنجره کوچک در گوشه پایین سمت راست ظاهر می‌شود.
   - روی **Locate** کلیک کن.
   - یا به این مسیر برو:
     ```
     C:\Users\hamed\arshnaz\android\app\build\outputs\apk\debug\app-debug.apk
     ```

۷. فایل `app-debug.apk` آماده است.

---

## مرحله ۷: انتقال و نصب APK روی گوشی

### روش A: با کابل USB

۱. APK را روی گوشی کپی کن (مثلاً در Downloads).

۲. روی گوشی، فایل APK را پیدا کن و باز کن.

۳. اگر پیام "نصب از منابع ناشناخته" داد، در تنظیمات اجازه بده.

۴. روی **Install** بزن.

### روش B: با Android Debug Bridge (ADB)

۱. روی گوشی، **Developer Options** و **USB Debugging** را فعال کن.

۲. گوشی را با کابل USB به کامپیوتر وصل کن.

۳. در Android Studio، پایین صفحه، دستگاه را ببین.

۴. یا از ترمینال بزن:
   ```bash
   cd C:\Users\hamed\arshnaz\android
   .\gradlew.bat installDebug
   ```

---

## مرحله ۸: اضافه کردن ویجت به صفحه اصلی

۱. بعد از نصب برنامه، یک بار آن را باز کن.

۲. روی صفحه اصلی گوشی (Home Screen) جای خالی را فشار بده و نگه دار.

۳. گزینه **Widgets** را انتخاب کن.

۴. به پایین اسکرول کن تا **ARSHNAZ** را پیدا کنی.

۵. ویجت را انتخاب و به صفحه اصلی اضافه کن.

---

## 🔧 عیب‌یابی

### مشکل: Gradle sync failed

۱. مطمئن شو اینترنت وصل است.

۲. روی **File** → **Invalidate Caches** → **Invalidate and Restart** بزن.

۳. یا ترمینال Android Studio را باز کن و بزن:
   ```bash
   ./gradlew clean
   ```

### مشکل: `npm run build` خطا می‌دهد

۱. مطمئن شو که `npm install` بدون خطا تمام شده.

۲. اگر خطا داری، متن خطا را بخوان و رفع کن.

### مشکل: APK نصب نمی‌شود

۱. مطمئن شو گوشی اندروید ۸ یا بالاتر دارد.

۲. اجازه نصب از منابع ناشناخته را بده.

۳. APK debug برای بعضی گوشی‌ها نیاز به تنظیمات خاص دارد.

### مشکل: نمی‌توانم Android Studio را دانلود کن

۱. از VPN استفاده کن.

۲. یا از Codemagic (آنلاین) استفاده کن.

---

## 📚 منابع

- [Android Studio Docs](https://developer.android.com/studio)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
