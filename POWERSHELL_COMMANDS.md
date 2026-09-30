# دستورات PowerShell برای ساخت Android APK

## ⚠️ قبل از شروع

- Android Studio باید نصب شده باشد
- به اینترنت وصل باش
- حدود ۱۰ GB فضای خالی داشته باش

---

## مرحله ۱: باز کردن PowerShell

۱. کلیدهای `Win + X` را فشار بده
۲. گزینه **Terminal (Admin)** یا **Windows PowerShell (Admin)** را انتخاب کن

---

## مرحله ۲: رفتن به پوشه پروژه

این دستور را کپی کن و Enter بزن:

```powershell
cd C:\Users\hamed\arshnaz
```

برای مطمئن شدن از مسیر، بزن:

```powershell
pwd
```

باید بنویسه:
```
C:\Users\hamed\arshnaz
```

---

## مرحله ۳: نصب وابستگی‌ها (اگر قبلاً نصب نشده)

```powershell
npm install
```

صبر کن تا تمام شود. این کار یکی دو دقیقه طول می‌کشد.

---

## مرحله ۴: ساخت وب اپلیکیشن

```powershell
npm run build
```

صبر کن. باید در آخر پیام موفقیت ببینی.

---

## مرحله ۵: همگام‌سازی با Android

```powershell
npx cap sync android
```

این کار فایل‌های اندروید را به‌روز می‌کند.

---

## مرحله ۶: باز کردن پروژه در Android Studio

```powershell
npx cap open android
```

Android Studio به‌طور خودکار باز می‌شود.

---

## مرحله ۷: ساخت APK از طریق دستور (اختیاری)

اگر نمی‌خواهی از منوی Android Studio استفاده کنی، می‌توانی مستقیم APK بسازی:

```powershell
cd C:\Users\hamed\arshnaz\android
.\gradlew.bat assembleDebug
```

صبر کن. APK در این مسیر ساخته می‌شود:
```
C:\Users\hamed\arshnaz\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## مرحله ۸: نصب APK روی گوشی با ADB

اگر گوشی با کابل USB وصل است و USB Debugging فعال است:

```powershell
cd C:\Users\hamed\arshnaz\android
.\gradlew.bat installDebug
```

---

## خلاصه دستورات

```powershell
cd C:\Users\hamed\arshnaz
npm install
npm run build
npx cap sync android
npx cap open android
```

بعد Android Studio باز می‌شود و از منوی Build → Build APK می‌سازی.

---

## ❌ اگر خطا دیدی

خطا را کپی کن و برای من بفرست.
