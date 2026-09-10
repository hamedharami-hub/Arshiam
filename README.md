# ARSHNAZ — ارشناز

اپلیکیشن مدیریت تسک، نوت، عادت و سلامت روان با Firebase Auth، Cloud Firestore و Firebase Storage.

## شروع سریع

```bash
npm ci
npm run dev
npm run build
```

پیکربندی Firebase در `firebase-applet-config.json` قرار دارد. دادهٔ هر کاربر در مسیر خصوصی `users/{userId}/...` در Firestore نگهداری می‌شود؛ قوانین `firestore.rules` فقط به صاحب داده اجازهٔ دسترسی می‌دهند.

## انتشار

راهنمای اصلاحات ورود گوگل، ویجت و تست اندروید: [ANDROID_FIXES_FA.md](./ANDROID_FIXES_FA.md).

پس از push روی شاخهٔ `main`، workflow انتشار نسخهٔ جدید را اجرا می‌کند. برای فعال‌شدن قوانین جدید یا تنظیمات Storage، همان پروژهٔ Firebase را از Firebase Console deploy کنید.

## هوش مصنوعی و فایل‌ها

قابلیت‌های AI با کلید شخصی Gemini که کاربر در تنظیمات برنامه وارد می‌کند کار می‌کنند. فایل‌ها در Firebase Storage ذخیره می‌شوند.

## زیرپروژه PTE Sentence Map

ابزار مطالعهٔ جمله‌های نوشتاری PTE در مسیر [`pte-sentence-map/`](./pte-sentence-map/) به‌صورت مستقل وارد شده است. برای اجرای آن به همان مسیر بروید و دستورهای README آن را اجرا کنید.

## زیرپروژه Pharmacy

اپلیکیشن مستقل مطالعه و آموزش داروسازی از مخزن [`hamedharami-hub/pharmacy`](https://github.com/hamedharami-hub/pharmacy) در مسیر [`pharmacy/`](./pharmacy/) وارد شده است. این زیرپروژه با Next.js اجرا می‌شود و وابستگی‌ها و پیکربندی مستقل خود را دارد:

```bash
cd pharmacy
npm install
npm run dev
```

برای ساخت production:

```bash
cd pharmacy
npm run build
```
