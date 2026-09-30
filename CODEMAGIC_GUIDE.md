# راهنمای ساخت Android APK با Codemagic

Codemagic یک سرویس آنلاین است که بدون نیاز به نصب Android Studio، APK می‌سازد.

---

## ✅ مزایا

- نیاز به نصب هیچ برنامه‌ای روی کامپیوتر ندارد
- فقط با مرورگر کار می‌کند
- هر بار که push می‌کنی، خودکار APK می‌سازد
- رایگان برای استفاده شخصی (۵۰۰ دقیقه build در ماه)

---

## مرحله ۱: ثبت‌نام در Codemagic

۱. به سایت Codemagic برو:
   ```
   https://codemagic.io
   ```

۲. روی **Sign up** کلیک کن

۳. **Sign up with GitHub** را انتخاب کن

۴. اجازه دسترسی به repository را بده

---

## مرحله ۲: اضافه کردن پروژه

۱. دکمه **Add application** را بزن

۲. GitHub را انتخاب کن

۳. Repository زیر را پیدا کن:
   ```
   haramipours-glitch/smart-task-notes-3acf007d
   ```

۴. **Connect** را بزن

---

## مرحله ۳: انتخاب Workflow

Codemagic به‌طور خودکار فایل `codemagic.yaml` را می‌خواند.

دو workflow داری:

### ۱) Android Debug APK
- بدون امضا
- برای تست
- نیاز به تنظیمات اضافی ندارد

### ۲) Android Release APK (Signed)
- امضا شده
- برای انتشار
- نیاز به Environment Variables دارد

---

## مرحله ۴: ساخت Debug APK

۱. در Codemagic، پروژه را باز کن

۲. به تب **Build** برو

۳. Workflow را انتخاب کن:
   ```
   android-debug-apk
   ```

۴. روی **Start new build** کلیک کن

۵. چند دقیقه صبر کن (۵-۱۰ دقیقه)

۶. وقتی سبز شد، روی build کلیک کن

۷. در پایین صفحه، `app-debug.apk` را دانلود کن

---

## مرحله ۵: نصب APK روی گوشی

۱. APK را با کابل USB به گوشی منتقل کن
   - یا با Bluetooth
   - یا با Telegram/File sharing

۲. روی گوشی، APK را باز کن

۳. اگر پیام "نصب از منابع ناشناخته" داد، اجازه بده

۴. **Install** را بزن

---

## مرحله ۶: ساخت Release APK امضا شده (اختیاری)

اگر می‌خواهی APK امضا شده برای انتشار داشته باشی:

### ۱) ساخت Keystore

در کامپیوتر خودت، CMD یا PowerShell را باز کن و بزن:

```bash
keytool -genkey -v -keystore release.keystore -alias arshnaz -keyalg RSA -keysize 2048 -validity 10000
```

### ۲) تبدیل Keystore به Base64

**در Windows (PowerShell):**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

**در Mac/Linux:**

```bash
base64 -i release.keystore | pbcopy
```

### ۳) تنظیم Environment Variables در Codemagic

۱. در Codemagic، پروژه را باز کن

۲. به **Environment variables** برو

۳. یک گروه بساز به نام:
   ```
   arshnaz-signing
   ```

۴. این متغیرها را اضافه کن:

| Variable name | Value |
|---------------|-------|
| `CM_KEYSTORE` | محتوای Base64 keystore |
| `CM_KEYSTORE_PASSWORD` | رمز keystore |
| `CM_KEY_ALIAS` | `arshnaz` یا هر alias که ساختی |
| `CM_KEY_PASSWORD` | رمز key |

۵. **Secure** بودن متغیرها را تیک بزن

### ۴) اجرای Build Release

۱. Workflow زیر را انتخاب کن:
   ```
   android-release-apk
   ```

۲. **Start new build** را بزن

۳. وقتی تمام شد، `app-release.apk` را دانلود کن

---

## ⚡ ساخت خودکار با هر push

اگر می‌خواهی با هر push به GitHub، خودکار build شود:

۱. در Codemagic، به **Build triggers** برو

۲. تیک **Trigger on push** را بزن

۳. Branch را `main` انتخاب کن

۴. ذخیره کن

---

## ❌ عیب‌یابی

### خطای `npm ci failed`
- مطمئن شو `package.json` و `package-lock.json` در repository هستند
- به Codemagic بگو از node 22 استفاده کند (در `codemagic.yaml` تنظیم شده)

### خطای Gradle
- در Codemagic، log را بخوان
- معمولاً به خاطر sync نشدن Capacitor است

### APK ساخته نمی‌شود
- بررسی کن فایل `codemagic.yaml` در ریشه repository باشد
- مطمئن شو push کرده‌ای

---

## 📚 منابع

- [Codemonic Docs](https://docs.codemagic.io/)
- [Capacitor Codemagic](https://capacitorjs.com/docs/android/deploying-to-google-play)
