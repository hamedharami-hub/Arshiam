# ARSHNAZ — ارشناز

اپلیکیشن مدیریت تسک، نوت، عادت و سلامت روان با Firebase Auth، Cloud Firestore و Firebase Storage.

## شروع سریع

```bash
npm install --legacy-peer-deps
npm run dev
npm run build
```

پیکربندی Firebase در `firebase-applet-config.json` قرار دارد. دادهٔ هر کاربر در مسیر خصوصی `users/{userId}/...` در Firestore نگهداری می‌شود؛ قوانین `firestore.rules` فقط به صاحب داده اجازهٔ دسترسی می‌دهند.

## انتشار

پس از push روی شاخهٔ `main`، اتصال GitHub پروژهٔ Lovable نسخهٔ جدید را deploy می‌کند. برای فعال‌شدن قوانین جدید یا تنظیمات Storage، همان پروژهٔ Firebase را از Firebase Console deploy کنید.

## هوش مصنوعی و فایل‌ها

قابلیت‌های AI با کلید شخصی Gemini که کاربر در تنظیمات برنامه وارد می‌کند کار می‌کنند. فایل‌ها در Firebase Storage ذخیره می‌شوند.

## زیرپروژه PTE Sentence Map

ابزار مطالعهٔ جمله‌های نوشتاری PTE در مسیر [`pte-sentence-map/`](./pte-sentence-map/) به‌صورت مستقل وارد شده است. برای اجرای آن به همان مسیر بروید و دستورهای README آن را اجرا کنید.
