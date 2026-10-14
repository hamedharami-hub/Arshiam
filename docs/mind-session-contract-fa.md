# قرارداد محلی جلسهٔ Mind — M02

وضعیت: هستهٔ محلی پیاده‌سازی شده؛ اتصال صفحه‌ها و backup عمومی به عهدهٔ ادغام است. این سند تأیید تکمیل تمام معیارهای M02 یا همگام‌سازی ابری نیست.

## مسیر کوتاه ادغام

```ts
const result = beginMindSession(ownerId, text, language); // fa | en
if (!result.ok) { /* متن فرم حفظ و خطا نمایش داده شود */ }
else {
  const sessionId = result.session.id;
  attachMindTool(ownerId, sessionId, "thought", "thought:main");
  attachMindTool(ownerId, sessionId, "calm", "calm:main");
  // URL فقط sessionId/slot؛ پاسخ و متن خصوصی وارد URL نشود.
}
```

- `getActiveMindSession(ownerId)` تازه‌ترین draft/paused را برای پیشنهاد ادامه می‌دهد؛ انتخاب ادامه با کاربر است. `createOrResumeConcern` فقط با **شناسهٔ صریح** ادامه می‌دهد؛ بدون شناسه همیشه جلسهٔ جدید می‌سازد. تشابه متن معیار ادغام نیست.
- `readMindSession` و `listMindSessionsChecked` نتیجهٔ checked می‌دهند. نسخه‌های convenience (`getMindSession`/`listMindSessions`) در خطا null/[] می‌دهند و برای UI «خالی واقعی» کافی نیستند.
- `updateMindSession(ownerId, completeSession, expectedRevision)` تنها مسیر نوشتن محتوای جدید است. revision صفر فقط برای ایجاد؛ سرویس revision بعدی و زمان ذخیرهٔ جاری را تعیین می‌کند. تمام پاسخ‌ها در `steps[].answers` نگهداری می‌شوند؛ تاریخ اصلی ایجاد ثابت است.
- هر ابزار slot و stepId پایدار دارد. `attachMindTool` تکرار همان اتصال را بدون افزایش revision برمی‌گرداند؛ تغییر منبع قدیمی/شناسهٔ ابزار/نسخه/slot را رد می‌کند. پاسخ ابزار در رکورد قدیمی authoritative باقی می‌ماند اگر `legacyRef` دارد؛ اتصال به معنای کپی‌کردن یا dual-write نیست.
- پیشنهاد local/AI، دلیل، revision ورودی و انتخاب کاربر جدا از متن اصلی‌اند. معنای پیشنهاد زیر همان ID تغییر نمی‌کند؛ فقط انتخاب کاربر تغییر می‌کند. رابطهٔ action با suggestion و مقصد یکتا است؛ تبدیل موفق به حالت pending بازنمی‌گردد. این قرارداد به‌تنهایی ساخت task ابری یا idempotency سرور را اجرا نمی‌کند.
- بازخورد اختیاری، مرتبط با session/tool/version و بدون استنتاج تشخیصی است. رکورد بازخورد موجود و provenance قدیمی در update عادی تغییر نمی‌کنند.
- `transitionMindSession` پایان بدون action و بازگشایی صریح را می‌پذیرد. `draft/paused/finished/archived` محتوایی است؛ `dirty/saving/device-saved/synced/conflict/failed` وضعیت مستقل UI است. این سرویس فقط موفقیت خواندن مجدد **محلی** را تأیید می‌کند، نه `synced`.
- پس از نوشتن و خواندن موفق head یا import موفق، رویداد `arshiam:mind-session` با `detail: { ownerId }` منتشر می‌شود؛ متن، پاسخ‌ها و شناسهٔ رکورد خصوصی در رویداد نیست. ذخیرهٔ failed یا candidate تعارض به‌تنهایی رویداد موفقیت نمی‌دهد. caller باید علاوه بر این رویداد محلی، `storage` را برای تغییر تب دیگر بررسی کند.

## تعارض، ایمنی و حدود storage

کلیدها owner-scoped و schema نسخهٔ ۱ دارند. دادهٔ malformed، مالک اشتباه، schema ناشناخته یا آینده در مسیرهای checked خطا است و overwrite نمی‌شود. مالک باید صریح و غیرخالی باشد؛ guest فقط با شناسهٔ مستقل صریح و نه با fallback به حساب دیگر پشتیبانی می‌شود.

قبل از نوشتن head هر نسخه در کلید immutable مستقل ذخیره و دوباره خوانده می‌شود. revision قدیمی head را تغییر نمی‌دهد؛ نتیجهٔ conflict شامل current/proposed و `preserved` است. شکست quota می‌تواند نگهداری candidate را هم شکست دهد؛ UI باید متن را در حافظه و امکان کپی حفظ کند و هرگز موفقیت کاذب نشان ندهد. `listMindSessionVersions` همهٔ snapshotها را برمی‌گرداند؛ `reconcileMindSession` فقط انتخاب/ویرایش صریح با expectedRevision جاری را می‌نویسد و نسخه‌های قبلی را پاک نمی‌کند.

**محدودیت صریح:** localStorage transaction یا compare-and-swap بین تب‌ها ندارد. بررسی baseline و read-back بسیاری از raceها را رد می‌کند، ولی تضمین قفل خطی دو تب نیست. دو نویسنده ممکن است هر دو موفقیت لحظه‌ای بگیرند؛ هر candidate با کلید مستقل باقی می‌ماند و شاخه‌های هم‌revision از نسخه‌ها قابل بررسی‌اند. coordinator باید UI تعارض و storage-event/refetch را وصل کند؛ برای تضمین atomic واقعی در آینده transactional IndexedDB لازم است. هیچ تضمین چنددستگاهی ارائه نشده است. storage رمزنگاری نیست، ظرفیت محدود دارد و snapshotهای خصوصی expiry خودکار ندارند.

## مهاجرت و backup/rollback

`migrateLegacyMindDraft(ownerId)` اختیاری و نسخه‌دار است. تنها متن/path شناخته‌شدهٔ `mind_draft_v1_<owner>` منتقل می‌شود؛ زبان تاریخی null، پاسخ‌ها/شواهد خالی و زمان ایجاد رکورد جدید زمان مهاجرت است، نه تاریخ فرضی تمرین قدیمی. زمان قدیمی به تاریخ تکمیل تبدیل نمی‌شود. منبع حذف یا تغییر نمی‌کند. provenance مقصد پس از write/read موفق نشان مهاجرت است؛ اجرای مجدد همان ID را برمی‌گرداند و append ناتمام قبل از head با همان ID بازیابی می‌شود. اگر چند candidate مهاجرت موجود باشد عملیات با conflict متوقف می‌شود. این مسیر برای اجرای هم‌زمان چند migrator قفل atomic ندارد؛ ادغام باید مهاجرت را یک‌بار در مسیر شروع حساب انجام دهد.

`attachLegacyMindTool` فقط مرجع immutable مالک/collection/recordId اضافه می‌کند؛ مجوز cloud جدید نمی‌سازد و نسخهٔ تاریخی نامعلوم را `unknown` نگه می‌دارد.

اگر پس از مهاجرت یا rollback متن/path منبع قدیمی تغییر کرده باشد، `legacy-draft-changed` برمی‌گردد؛ نوشتهٔ تازه نه نادیده گرفته و نه خودکار با جلسهٔ قبلی ادغام می‌شود. UI می‌تواند با انتخاب کاربر دغدغهٔ مستقلی بسازد. لغو migration با اجرا نکردن دوبارهٔ آن ممکن است؛ حذف منبع یا downgrade انجام نمی‌شود.

`exportMindSessions` خروجی JSON نسخه‌دار شامل headها و **تمام نسخه‌های conflict و تاریخچه** می‌دهد. `importMindSessions` schema/مالک/هویت را قبل از نوشتن بررسی می‌کند، revision و فیلدهای رکورد را دقیق حفظ می‌کند، additive است و هیچ رکوردی را حذف نمی‌کند. head متفاوت دست‌نخورده و نسخهٔ ورودی محفوظ می‌ماند؛ conflicts به caller برمی‌گردد. import ناموفق ممکن است prefix موفقی داشته باشد؛ retry ایمن است، نه rollback مخرب. بازگشت UI قدیمی کلیدهای جدید را پاک نمی‌کند و با فعال‌سازی مجدد قابل خواندن‌اند.

## کارهای باقی‌ماندهٔ ادغام/انتشار

- اتصال editorهای واقعی، ادامهٔ همان session، UI وضعیت/تعارض و خروج/بازگشت دستگاه.
- اتصال این export/import به backup عمومی و دامنهٔ حذف حساب/پاک‌کردن دستگاه با انتخاب صریح؛ این تغییر هیچ فایل backup عمومی را ویرایش نکرده است.
- **Cloud اجرا نشده:** collection، rule، index، subscription، cache ابری و مجوز external-agent جدید وجود ندارد. emulator و بررسی backup/rules لازمهٔ افزودن cloud است؛ این بسته آزمون emulator یا جداسازی چنددستگاهی را ادعا نمی‌کند.
- رشد تاریخچه، pagination/retention انتخابی و transactional storage برای volume/race واقعی باید جدا بررسی شوند. هیچ حذف خودکار یا downgrade مخربی اضافه نشده است.
