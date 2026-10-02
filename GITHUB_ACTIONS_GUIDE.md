# راهنمای GitHub Actions برای ساخت Android APK

این راهنما توضیح می‌دهد چگونه از GitHub Actions برای ساخت خودکار Android APK استفاده کنید.

---

## 📦 دو Workflow

### ۱) `android-build.yml` (Debug APK)
- هر بار که روی `main` push می‌کنی، اجرا می‌شود
- APK debug می‌سازد (بدون امضا)
- APK را در GitHub Artifacts ذخیره می‌کند
- **نیاز به تنظیمات ندارد**

### ۲) `android-build-signed.yml` (Signed Release APK)
- هر بار که روی `main` push می‌کنی، اجرا می‌شود
- APK release امضا شده می‌سازد
- APK را در GitHub Artifacts ذخیره می‌کند
- **نیاز به تنظیم Secrets دارد**

---

## 🔧 تنظیم Secrets برای Signed APK

برای ساخت APK امضا شده، باید این Secrets را در GitHub تنظیم کنی:

### ۱) ساخت Keystore

در کامپیوتر خودت، یک keystore بساز:

```bash
keytool -genkey -v -keystore release.keystore -alias arshnaz -keyalg RSA -keysize 2048 -validity 10000
```

### ۲) تبدیل به Base64

```bash
# در Linux/Mac
base64 -i release.keystore | pbcopy

# در Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

### ۳) تنظیم Secrets در GitHub

به GitHub برو:
1. Repository → Settings → Secrets and variables → Actions
2. این Secrets را اضافه کن:

| Secret Name | توضیح |
|-------------|-------|
| `KEYSTORE_BASE64` | محتوای Base64 شده فایل `release.keystore` |
| `KEYSTORE_PASSWORD` | رمز عبور keystore |
| `KEY_ALIAS` | نام alias (مثلاً `arshnaz`) |
| `KEY_PASSWORD` | رمز عبور key |

---

## 🚀 نحوه استفاده

### ساخت Debug APK (بدون تنظیمات)

فقط push کن روی `main`:

```bash
git add .
git commit -m "Update app"
git push origin main
```

سپس:
1. به GitHub برو: Actions
2. Workflow `Build Android APK` را انتخاب کن
3. روی آخرین run کلیک کن
4. در پایین صفحه، `arshnaz-debug-apk` را دانلود کن

### ساخت Signed Release APK (با تنظیمات)

۱. Secrets را طبق بالا تنظیم کن
۲. push کن روی `main`
۳. به GitHub برو: Actions
۴. Workflow `Build Signed Android APK` را انتخاب کن
۵. روی آخرین run کلیک کن
۶. در پایین صفحه، `arshnaz-release-apk-signed` را دانلود کن

---

## 🎯 اجرای دستی

برای اجرای workflow بدون push:

1. به GitHub برو: Actions
2. Workflow مورد نظر را انتخاب کن
3. روی `Run workflow` کلیک کن
4. Branch را انتخاب کن و `Run` را بزن

---

## 📱 نصب APK

### Debug APK
```bash
adb install app-debug.apk
```

### Signed Release APK
```bash
adb install app-release.apk
```

یا APK را روی گوشی کپی کن و نصب کن.

---

## ⚠️ نکات مهم

### ۱) Keystore را نگه دار
- Keystore را در جای امن نگه دار
- اگر گم شود، نمی‌توانی نسخه جدید را با همان key امضا کنی
- Google Play نیاز به key ثابت دارد

### ۲) Secrets امن هستند
- Secrets در GitHub محافظت می‌شوند
- در logها نمایش داده نمی‌شوند
- فقط در workflow قابل استفاده هستند

### ۳) GitHub Actions رایگان است
- برای public repos: نامحدود
- برای private repos: ۲۰۰۰ دقیقه در ماه رایگان

---

## 🔍 عیب‌یابی

### Workflow fails با خطای "Gradle build failed"
- بررسی کن که `android/gradlew` permission دارد
- مطمئن شو که Android SDK درست نصب شده

### Workflow fails با خطای "Keystore not found"
- مطمئن شو که `KEYSTORE_BASE64` درست تنظیم شده
- Base64 باید کامل باشد (بدون خطوط اضافی)

### APK نصب نمی‌شود
- Debug APK روی دستگاه‌های غیر-root ممکن است نیاز به تنظیمات خاصی داشته باشد
- Signed Release APK بدون مشکل نصب می‌شود

---

## 📚 منابع

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Android Signing Documentation](https://developer.android.com/studio/publish/app-signing)
