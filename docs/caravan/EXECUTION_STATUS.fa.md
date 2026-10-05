# وضعیت اجرای کاروان — ۵ اکتبر ۲۰۲۶

محیط عوض شده است. فایل‌ها و commitهای محلی محیط قبلی، از جمله c9612cb، در محیط جدید و remote موجود نبودند. از شاخه arshnaz مخزن Arshiam، مبنای 3d0f8e61ab3c13986d925c0f8ea2fde399208e51 دریافت و اصلاحات قابل‌اجرا دوباره ساخته شدند. شاخه اجرا: fix/caravan-reliability-and-eight-directions. تغییر قبلی در checkout جدید وجود نداشت.

| مرحله | نتیجهٔ واقعی |
| --- | --- |
| ۰ | دریافت arshnaz، بررسی قواعد، نصب وابستگی‌ها، اجرای Vite و بررسی HTTP انجام شد. |
| ۱ | URL ثابت iframe؛ handshake نسخه‌دار با source/origin/owner؛ وضعیت آماده‌بودن؛ full-screen event؛ cloud restore handler. |
| ۲ | ذخیره کامل v2 با کلید مالک؛ حفظ موجودات، سازه‌ها، ظاهر موجود، قدرت صفر و زمان‌ها؛ backup برای restore/خرابی؛ واردکردن legacy با انتخاب روشن. |
| ۳ | سرویس منابع میزبان، قیمت معتبر، journal ماندگار و نشانگر دوطرفه؛ انتقال نیمه‌تمام قابل replay؛ درخواست تکراری دوباره برداشت نمی‌کند. مصرف خودکار منابع در نیایشگاه حذف شد. |
| ۴ | snapshot RPC برای ذخیره/بازیابی؛ owner validation، transaction و server revision؛ تعارض با انتخاب کاربر. mock بررسی شد؛ Firebase زنده بررسی نشده است. |
| ۵ | **blocked**: تصاویر look/diag، کارت‌ها و مراجع اصلی محیط قبلی وجود ندارند. مخزن game در HEAD برابر 05d6609 فقط .gitattributes دارد. تصاویر فعلی تغییر نکردند؛ نمایش هنوز چهار قاب دارد، هرچند حرکت مورب ممکن است. سه لباس/سه رنگ و آلبوم هشت‌جهته تحویل نشده‌اند. |
| ۶ | یک منو، کنترل‌های کوچک‌تر و لمس 44px؛ بررسی سه viewport؛ pause وقتی صفحه hidden است، DPR حداکثر 1.5 و delta برای گردش جلوه‌های اصلی. مدیریت کامل توقف tick همهٔ مناطق هنوز انجام نشده است. |
| ۷ | بررسی‌ها انجام شده؛ انتشار branch/PR طبق گزارش تحویل. merge یا production deploy انجام نشده. |

## شاهد بررسی‌ها

- node --test scripts/caravan-reliability.test.mjs: ۹ آزمون موفق؛ مهاجرت، داده خراب، مالک، قطع بعد از برداشت، درخواست تکراری، restore بدون rewind، منابع ناکافی، ساخت/تکامل و پاداش یک‌بار.
- npx vitest run src/lib/caravanCloud.test.ts: ۴ آزمون موفق با mock؛ round-trip، تعارض revision، جایگزینی صریح و داده/مالک نامعتبر.
- npm run typecheck: موفق؛ npm run build: موفق؛ lint فایل‌های تغییرکرده و git diff --check: موفق.
- Chromium نرم‌افزاری: ساخت موجود و Reload بدون حذف یا هزینه دوباره؛ تبدیل منابع؛ 390×844، 768×1024 و 1365×900؛ بدون pageerror یا HTTP 404.
- fixture والد هم‌مبدأ: تبدیل منابع داخل iframe، snapshot و restore، جابه‌جایی alice→bob و رد پاسخ owner قدیمی؛ بدون pageerror.
- مرورگر fixture به Firebase واقعی ننوشت و امتیاز واقعی کاربر مصرف نشد. FPS گوشی واقعی اندازه‌گیری نشده است.
- PWA در build درباره اندازهٔ chunkها هشدار دارد؛ این هشدار مانع build نیست. cache فعلی حدود 85MiB است و نیاز به بررسی مستقل دارد.

## ادامهٔ ضروری

۱. فایل‌های تأییدشده look-*.webp، diag-*.webp، cards-*.webp، story-adults.webp و manifest/reference اصلی را به محیط منتقل کن؛ تصاویر جدید با چهره متفاوت تولید نکن.
۲. هشت جهت با قرارداد ردیف/ستون واقعی atlas، hysteresis و fade حدود 160ms؛ حفظ children[0] و shadow؛ پیش‌فرض فرشته مشکی/لباس اولیه، گوراستاخ سفید/لباس اولیه.
۳. انتخاب سه رنگ و سه لباس مستقل، ذخیره‌شونده؛ آلبوم ۲۴ کارت اختیاری. این atlasها خودشان walk-cycle چندقابی نیستند.
۴. توقف tick گروه‌های نامرتبط با مقصد، و بررسی کاهش جلوه‌ها بدون تغییر هویت معنوی.
۵. بررسی نهایی مدل قوی‌تر روی journal/replay، تعویض حساب، پیام دیررس و conflict cloud. اقتصاد سمت مرورگر مقاوم به دستکاری یا همزمانی چند تب ادعا نمی‌شود؛ برای آن locking/server authority مستقل لازم است.
۶. تست با حساب واقعی و دستگاه واقعی فقط در محیط و دسترسی مناسب، سپس تصمیم انتشار.

## قرارداد پیام و ذخیره

bridgeVersion=1، ownerId و type در هر پیام؛ requestId برای transfer و snapshot/restore. طرف گیرنده event.source و event.origin را بررسی می‌کند. کلید بازی dream-caravan:save:v2:<owner> و journal با dream-caravan:transfers:v1:<owner> است. path ابری users/<owner>/caravan_profile/save_v1 حفظ شده، با state و revision در سند. ذخیرهٔ عمومی قدیمی خودکار به یک حساب نسبت داده نمی‌شود.
