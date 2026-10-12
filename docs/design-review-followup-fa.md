# بازبینی طراحی پس از ادغام روی main

اصلاحات پس از عبور از ۳۰۵ فایل / ۱۹۶۰ تست، typecheck و build، در commit `a649bde` با fast-forward روی `main` ادغام شدند. push انجام نشده است. بازبینی زیر روی همان منبع پس از ادغام اجرا شده؛ پیشنهادهای تکمیلی، اصلاح ضروری و محدودیت آزمون از هم جدا هستند.

## نتیجهٔ بازبینی پس از ادغام

- `frontend/scripts/verify_remediation.mjs`: هر ۲۶ fixture فارسی/انگلیسی، عرض ۳۲۰/۳۹۰/۸۲۰، شش accent، light/dark/OLED و editor طولانی موفق؛ بدون سرریز افقی. داده‌ها مصنوعی و بدون حساب واردشده‌اند.
- `frontend/scripts/verify_layout.mjs`: هر ۱۰ سناریوی desktop، سایدبار چپ/راست، باز/بسته و RTL/LTR موفق؛ هیچ‌یک از ۲۵ تسک fixture زیر سایدبار پنهان نبود.
- تصاویر editor فارسی در ۳۲۰/light و ۳۹۰/dark-amber و چیدمان desktop فارسی ۱۲۸۰/right-expanded بازخوانی شدند: ring کنترل فعال قابل مشاهده، toolbar در محدوده و سطح sidebar/main جداست. این مشاهدهٔ محدود، تأیید کنتراست همهٔ ترکیب‌ها نیست.
- در این دور، باگ بصری تازهٔ قابل بازتولید در این fixtureها یافت نشد؛ تغییر ظاهری گستردهٔ بدون شاهد به `main` اضافه نشد.
- شواهد بیرون مخزن: `C:\Users\hamed\AppData\Local\Temp\opencode\arshiam-main-responsive` و `arshiam-main-layout`.

## پیشنهادهای طراحی برای بررسی بصری

- `frontend/src/layouts/AppLayout.tsx`: تعداد زیاد اقدام‌های سربرگ (نصب، رنگ، جستجو، پوسته، AI) را در عرض ۳۲۰ و ۳۹۰ با عنوان فارسی بلند بررسی کنیم. پیشنهاد: جستجو و اقدام اصلی ثابت، باقی در منوی «بیشتر»؛ نه حذف قابلیت‌ها.
- `frontend/src/components/InstallPrompt.tsx`: پیشنهاد نصب نباید روی کنترل تمرکز، وضعیت همگام‌سازی یا ناوبری پایین بیفتد. فاصله از نوار پایین اصلاح شده؛ ترکیب هم‌زمان هنوز نیازمند screenshot است.
- `frontend/src/pages/SettingsView.tsx`: یک اقدام اصلی در هر بخش و وضعیت صریح ذخیره، بدون ترکیب «بررسی به‌روزرسانی» با نصب. بررسی دستی اکنون نصب را اجرا نمی‌کند.
- `frontend/src/pages/NotesView.tsx`: فهرست ۵۰‌ردیفی اولیه و جستجو در کل کتابخانه حفظ شوند. benchmark کامل تعامل ۵۰۰۰ یادداشت با رندر واقعی، جدا از هزینهٔ توابع فیلتر/پیش‌نمایش لازم است.
- `frontend/src/index.css`: پس از حذف neutralization عمومی گرادیان‌ها، تمام کارت‌های legacy در light/dark/OLED و شش accent نیازمند کنترل رنگ/کنتراست تصویری‌اند؛ صرف درست‌بودن tokenها تأیید کنتراست نیست.
- `frontend/src/components/ui/dialog.tsx`: ارتفاع محدود به viewport، scroll containment، بستن ۴۴پیکسلی و جهت زبانی اصلاح شدند؛ با کیبورد، landscape و بزرگ‌نمایی نیز بررسی شود.

## باگ‌های اصلاح‌شده در بازبینی کد تکمیلی

- `frontend/src/components/SelectionActionToolbar.tsx`: clamp ثابت به اندازه‌گیری واقعی و visualViewport تغییر کرد؛ wrapping و تست فضای محدود کیبورد اضافه شد.
- `frontend/src/components/modules/ModuleGatedOutlet.tsx`: Suspense/error boundary داخل صفحه، برای حفظ پوسته و ناوبری هنگام بارگذاری یا شکست صفحه.
- `frontend/src/components/OfflineIndicator.tsx`: هشدار با تغییر هویت mutation، حتی با شمار ثابت، دوباره نمایش داده می‌شود. متن آفلاین دیگر ذخیرهٔ قطعی همهٔ ویرایشگرها را ادعا نمی‌کند.
- `frontend/src/pages/LifeArchitectView.tsx`: «تنظیم سریع ریتم» به ساخت طرح تازه با ریتم دلخواه تغییر نام داد تا رفتار افزایشی آن را به‌اشتباه باززمان‌بندی طرح فعلی معرفی نکند.
- `frontend/src/components/RecentlyDeletedSheet.tsx`: وضعیت دستگاهی/نشستی و محدودیت ۱۰ دقیقه روشن است؛ failure یا false نتیجهٔ restore پیام موفقیت نمی‌دهد.

## حدود بررسی

ابزار مرورگر متصل در دسترس نیست؛ Chrome headless محلی برای fixtureهای مصنوعی استفاده شد. بازبینی روی حساب واقعی، دستگاه واقعی، screen reader و مطالعهٔ کاربردپذیری انجام نشده است. سربرگ ۳۲۰px با تمام اقدام‌های هم‌زمان، overlay stack، IME و همهٔ مسیرهای محصول هنوز تأیید بصری جامع ندارند. این گزارش ادعای رفع همهٔ باگ‌های برنامه یا تکمیل تمام ۱۰۰ ردیف ممیزی نمی‌کند.
