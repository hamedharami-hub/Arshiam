# راهنمای ساخت اپلیکیشن اندروید ARSHNAZ

این راهنما توضیح می‌دهد چگونه اپلیکیشن ARSHNAZ را برای اندروید بسازید و ویجت را فعال کنید.

## پیش‌نیازها

- **Android Studio** (نسخه اخیر)
- **Java JDK** (نسخه 11 یا بالاتر)
- **Android SDK** (API 33 یا بالاتر)

## ساخت اپلیکیشن

### ۱. ساخت وب اپلیکیشن

```bash
npm run build
```

### ۲. همگام‌سازی با Capacitor

```bash
npx cap sync android
```

### ۳. باز کردن در Android Studio

```bash
npx cap open android
```

### ۴. ساخت APK در Android Studio

- در Android Studio، روی **Build** کلیک کنید
- **Build Bundle(s) / APK(s)** را انتخاب کنید
- **Build APK(s)** را بزنید
- APK در `android/app/build/outputs/apk/debug/app-debug.apk` ساخته می‌شود

### ۵. ساخت Signed APK برای انتشار

- در Android Studio، **Build** > **Generate Signed Bundle / APK** را انتخاب کنید
- **APK** را انتخاب کنید
- یک keystore جدید بسازید یا از موجود استفاده کنید
- **release** را انتخاب کنید
- APK در `android/app/build/outputs/apk/release/app-release.apk` ساخته می‌شود

## ویجت ARSHNAZ

ویجت ARSHNAZ به صورت خودکار با اپلیکیشن نصب می‌شود. ویژگی‌ها:

- نمایش تعداد تسک‌های امروز (placeholder)
- نمایش تاریخ به شمسی
- دکمه "+ تسک جدید" برای افزودن سریع
- کلیک روی ویجت برای باز کردن برنامه
- تم تاریک هماهنگ با برنامه

### نحوه استفاده از ویجت

۱. اپلیکیشن را نصب کنید
۲. روی صفحه اصلی (Home Screen) طولانی بزنید
۳. **Widgets** را انتخاب کنید
۴. ویجت **ARSHNAZ** را پیدا کنید
۵. آن را به صفحه اصلی اضافه کنید

## فایل‌های ویجت

- `ArshnazWidgetProvider.java` - Provider اصلی ویجت
- `ArshnazWidgetUpdateService.java` - Service برای به‌روزرسانی ویجت
- `widget_arshnaz.xml` - Layout ویجت
- `widget_arshnaz_info.xml` - Configuration ویجت
- `widget_background.xml` - پس‌زمینه ویجت
- `widget_card_background.xml` - پس‌زمینه کارت
- `widget_button_background.xml` - پس‌زمینه دکمه

## توسعه آینده ویجت

برای اتصال ویجت به Supabase و نمایش داده واقعی:

۱. در `ArshnazWidgetProvider.java`، یک Retrofit client اضافه کنید
۲. از Supabase REST API برای دریافت تعداد تسک‌ها استفاده کنید
۳. داده را در SharedPreferences ذخیره کنید
۴. ویجت را هر ۱۵ دقیقه به‌روز کنید

## عیب‌یابی

### ویجت در لیست ویجت‌ها نیست

- مطمئن شو اپلیکیشن را نصب کرده‌اید
- اپلیکیشن را یک بار باز کنید
- گوشی را ریستارت کنید

### ویجت به‌روز نمی‌شود

- بررسی کنید که Service در AndroidManifest تعریف شده باشد
- به‌روزرسانی را از تنظیمات ویجت فراخوانی کنید

### رنگ‌ها درست نیستند

- فایل‌های drawable را بررسی کنید
- مطمئن شو رنگ‌ها hex صحیح هستند

## لایسنس

این کد بخشی از پروژه ARSHNAZ است و تحت لایسنس پروژه منتشر می‌شود.
