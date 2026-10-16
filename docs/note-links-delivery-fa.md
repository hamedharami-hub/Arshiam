# پیوند یادداشت‌ها و ارجاع‌های برگشتی — گزارش اجرا

مبنای اجرا: `main` به‌روز‌شده از GitHub تا `60ae86a`؛ پلن محلی هنگام fast-forward حفظ شد.

## قابلیت‌های پیاده‌شده

- در ساخت و ویرایش یادداشت عمومی، دکمهٔ «پیوند به یادداشت» و میان‌بر `[[` انتخابگر مقصد را باز می‌کنند. انتخابگر جست‌وجوی فارسی/انگلیسی، پوشه، پیش‌نمایش کوتاه و کنترل کیبورد دارد.
- لینک با شناسه و قالب استاندارد `[عنوان](/app/notes?select=ID)` ذخیره می‌شود. تغییر عنوان یا پوشه مقصد را عوض نمی‌کند؛ انتخاب نوت هم‌نام لازم است صریح باشد.
- سه حالت دیداری، Markdown و پیش‌نمایش پوشش داده شده‌اند؛ ساخت نوت جدید هم از `NoteEditorTabs` استفاده می‌کند. انتخاب متن در پنجرهٔ درج حفظ می‌شود و لغو میان‌بر، `[[` را پاک نمی‌کند.
- پیش‌نمایش مقصد با دکمهٔ اطلاعات کنار لینک قابل بازکردن است؛ لینک مقصد را در برنامه باز می‌کند.
- پایین یادداشت، پنل جمع‌شوندهٔ ارجاع‌ها با snippet، تعداد occurrence و «نمایش بیشتر» وجود دارد. مبدأ تکراری یک ردیف دارد.
- نمایه از دادهٔ پذیرفته‌شده/ادغام‌شده با صف ساخته می‌شود. پیش‌نویس ردشده به‌عنوان ارجاع ذخیره‌شده منتشر نمی‌شود. متن، مرجع اصلی است؛ مجموعه یا writer جدید برای رابطه ساخته نشده است.
- رفت‌وبرگشت با URL و history، پیش‌نویس دستگاه را حفظ می‌کند. ورود snapshot تازه به همان URL، متن در حال تایپ را بازنشانی نمی‌کند.
- در موبایل فقط یک ویرایشگر نصب می‌شود. Escape ارسالی از Back اندروید در سفر نوت→نوت به مبدأ برمی‌گردد. رخداد Escape در `AndroidBackButton` اکنون cancelable است تا پنجره بتواند از بسته‌شدن هم‌زمان جلوگیری کند.
- مقصد حذف‌شده/ناموجود قابل بازکردن نیست؛ ID تازه با عنوان مشابه جانشین آن نمی‌شود. حذف مبدأ، ردیف ارجاع را حذف می‌کند؛ بازیابی همان ID دوباره پیوند را قابل تشخیص می‌کند.
- نوت اختصاصی تسک، Diary، نوع‌های غیرعمومی و حساب دیگر از دامنهٔ پیوند کنار گذاشته می‌شوند. رابطهٔ موجود نوت–تسک مستقل است.

## ساختار فایل‌ها

| مسیر در `frontend/src` | نقش |
|---|---|
| `lib/noteLinks.ts` | قرارداد دامنه، URL، Markdown، استخراج ارجاع و جست‌وجوی فارسی |
| `lib/noteLinkIndex.ts` | نمایهٔ افزایشی، حذف مبدأ و تجمیع occurrence |
| `hooks/useNoteLinks.ts` | پردازش قطعه‌ای با چرخهٔ عمر حساب؛ استفاده از subscription موجود |
| `components/notes/` | انتخابگر، پیش‌نمایش و پنل ارجاع |
| `components/NoteEditorTabs.tsx`، `RichEditor.tsx`، `NoteMarkdown.tsx` | اتصال اختیاری قابلیت به اجزای مشترک |
| `pages/NotesView.tsx` و `NewNoteView.tsx` | درج در جریان ساخت/ویرایش و ناوبریِ محافظ پیش‌نویس |
| `lib/firestoreDataService.ts` | وضعیت اختیاری cache/synced روی callback موجود و دریافت تغییر metadata |

## شواهد بررسی

### آزمون‌های خودکار

۱۹ فایل آزمون مرتبط، با ۱۵۶ تست متمایز، در گروه‌های متوالی اجرا و موفق شدند. گروه اولیه ۱۸ فایل و ۱۴۷ تست داشت؛ پس از تکمیل Back موبایل، فایل Notes با ۱۶ تست و AndroidBackButton با ۸ تست بازاجرا شدند.

پوشش اصلی:
- parser و رفت‌وبرگشت Markdown/HTML قدیمی، کد/کامنت، عنوان فارسی و شناسهٔ encode‌شده؛
- حفظ انتخاب در TipTap، لغو/درج میان‌بر، Undo/Redo و بازکردن متن ذخیره‌شده؛
- پیوندهای واقعی و مقصد ناموجود، جست‌وجوی فارسی، حساب دیگر و بازسازی نمایه؛
- رفت‌وبرگشت مرورگر و Escape موبایل، شکست ذخیرهٔ دستگاه، حفظ draft روی snapshot تازه و جلوگیری از backlink جعلی؛
- تست‌های رگرسیون یادداشت تسک، رابطهٔ نوت–تسک، ساخت تسک از نوت، Diary، رسانه و صف آفلاین.

فرمان آزمون، از `frontend` و با اجرای تک‌کارگر:

```bash
npm run test -- src/lib/noteLinks.test.ts src/components/notes/NoteLinks.test.tsx src/lib/markdown.test.ts src/components/NoteMarkdown.test.tsx src/components/NoteEditorTabs.test.tsx src/components/RichEditorFormatting.test.tsx src/components/RichEditorCloudMedia.test.tsx src/pages/NotesView.test.tsx src/pages/NotesView.recovery.test.tsx src/pages/NewNoteView.test.tsx src/pages/DailyDiaryView.test.tsx src/components/task-detail/TaskNoteEditorDialog.test.tsx src/lib/taskNotesService.test.ts src/lib/noteTaskLinkService.test.ts src/lib/noteActionItemService.test.ts src/lib/noteQueueProjection.test.ts src/lib/firestoreDataService.test.ts src/lib/firestoreDataService.noteDelete.test.ts src/components/AndroidBackButton.test.tsx --maxWorkers=1 --minWorkers=1 --silent
```

### بررسی مرورگری اجزای واقعی با دادهٔ مصنوعی

`scripts/verify_note_links.mjs` با Chromium Headless 156 روی همین VPS اجرا شد. احراز هویت مصنوعی بود؛ تماس‌های بیرونی در ماتریس رابط مسدود شدند. این بررسی جای آزمون حساب واقعی را نمی‌گیرد.

- ۱۲ ترکیب: عرض ۳۶۰/۳۹۰/۱۲۸۰ × فارسی/انگلیسی × روشن/تاریک.
- درج پیوند در ویرایشگر واقعی، پیدا کردن مقصد از میان ۱۰۰۰ نوت، بازکردن مقصد و برگشت از پنل ارجاع موفق بود.
- صفحه و انتخابگر در هیچ‌یک از این حالت‌ها overflow افقی نداشتند؛ خطای اجرایی صفحه مشاهده نشد.
- پاسخ جست‌وجو با احتساب debounce ۱۲۰ میلی‌ثانیه: حدود **۱۲۹ تا ۱۷۲ میلی‌ثانیه**.
- آماده‌شدن صفحه و نمایه با ۱۰۰۰ نوت/۵۰۰۰ لینک: حدود **۱٫۰ تا ۱٫۴ ثانیه** در اجرای نهایی. این زمان شامل mount و بارگذاری اجزای صفحه است، نه فقط parser.
- آزمایش فشار ۱۰٬۰۰۰ نوت/۵۰٬۰۰۰ لینک: آماده‌شدن حدود **۵٫۶ ثانیه**؛ به‌روزرسانی عنوان‌ها با محتوای یکسان، بدون parse مجدد، حدود **۳٫۶ میلی‌ثانیه**.

اجرای مجدد نیازمند Playwright و Chromium است. اگر Playwright بیرون پروژه نصب شده، `NOTES_QA_PLAYWRIGHT` مسیر `playwright/index.mjs` را می‌پذیرد:

```bash
node scripts/verify_note_links.mjs
```

fixture در `src/test/note-links-browser.html` و `src/test/note-links-browser.tsx` است و route محصول نیست.

### TypeScript، lint و build

- TypeScript و ESLint محدود به فایل‌های تغییرکرده موفق بودند؛ lint نهایی بدون خطا و هشدار بود.
- ساخت عادی یک بار در مهلت ۱۸۰ ثانیه قطع شد؛ سقف heap یک گیگابایتی نیز برای TypeScript کافی نبود.
- ساخت با سقف heap ۱۵۳۶ MB موفق شد و `dist/`، service worker و precache تولید شدند:

```bash
NODE_OPTIONS=--max-old-space-size=1536 npm run build
```

- پیام‌های bundler دربارهٔ importهای هم‌زمان static/dynamic گزارش شدند؛ build با موفقیت پایان یافت.

## حدود راستی‌آزمایی

- آزمون همگام‌سازی روی دو دستگاه واقعی با حساب Firebase، و اجرای APK روی سخت‌افزار Android انجام نشده است. قرارداد صف/revision و رفتار Back در تست‌های کنترل‌شده پوشش داده شده‌اند.
- پردازش نمایه قطعه‌ای است؛ عدد حداکثر long task هنگام تایپ روی موبایل فیزیکی اندازه‌گیری نشده است.
- تغییرات کد و خروجی build در محیط محلی هستند. انتشار آنلاین یا ارسال به GitHub بخشی از این اجرا نبوده است.

طرح اصلی و معیارهای پذیرش: [پیوند یادداشت‌ها](../plan/obsidian-note-links.md).
