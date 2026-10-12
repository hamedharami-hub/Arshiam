# وضعیت موقت اصلاحات ممیزی طراحی آرشیام

> **هشدار تازگی:** جدول زیر snapshot مرور پیش از اصلاحات تکمیلی است، نه وضعیت کد نهایی. پس از این مرور، اصلاحات گسترده‌ای برای حذف/بازیابی، AI، gesture، تقویم، آمار، ورودی‌ها، ابزارک‌ها و پیش‌نویس‌ها انجام شده است. شمارهای ۱۷/۴۶/۲۶/۱۱ نباید به نسخهٔ فعلی نسبت داده شوند. آزمون یکپارچه و بازطبقه‌بندی مستقل هنوز لازم‌اند؛ هیچ ردیفی صرفاً بر اساس پیام ایجنت بسته نشده است.

> **درخواست تازهٔ کاربر:** پس از عبور اصلاحات از آزمون نهایی، تغییرات روی `main` ادغام شوند؛ سپس روی همان نسخه بازبینی تازهٔ ظاهر/طراحی، پیشنهادهای بهبود و رفع باگ انجام شود. ادغام و بازبینی پس از ادغام هنوز در این سند تأیید نشده‌اند.

**زمان ثبت مرور:** `2026-10-13T07:17:11+11:00`؛ **HEAD مبنا:** `a698c3ff62c29a13a5a086a1ad00897d7628d069`؛ شاخهٔ `design-remediation`.

**مرجع الزام‌ها:** `C:\Users\hamed\AppData\Local\Temp\opencode\arshiam-design-audit-final-fa.md`، بخش ۷، دقیقاً ردیف‌های 001–100 و زیرمعیارهای بخش «تکمیل دامنه». این سند مرور مستقل منبع جاری و `git diff` است؛ پیام عامل‌ها، عنوان commitها و وجود فایل تست، شاهد اتمام نیستند. تغییرهای مشترک هنوز در جریان‌اند؛ مسیرها و شماره‌خط‌ها مربوط به زمان خواندن و موقت‌اند. هیچ منبع محصولی در این مرور تغییر نکرد.

## معنای وضعیت‌ها

- **implemented:** قرارداد اصلی در منبع دیده شد؛ به معنی تأیید تولید، امنیت، پزشکی یا اجرای تمام پذیرش‌ها نیست.
- **partial:** بخشی اصلاح شده، اما یک معیار مشخص هنوز غایب یا ناقص است؛ شکاف در همان ردیف آمده است.
- **not implemented:** مسیر مورد ممیزی همچنان رفتار مسئله‌دار را دارد یا اصلاح اصلی در آن دیده نشد.
- **needs real validation:** اصلاح ساختاری دیده می‌شود، ولی معیار اصلی وابسته به مرورگر، دستگاه، AT یا نتیجهٔ بصری است و از خواندن منبع بسته نمی‌شود.

تمام مسیرهای `src/` و `index.html` در جدول‌ها نسبت به `frontend/` هستند. «نیاز به آزمون» در توضیح یک ردیف، مجوز نادیده‌گرفتن شکاف کد همان ردیف نیست. برای موارد مرکب، انجام یک جزء باعث بسته‌شدن کل ردیف نشده است.

**جمع وضعیت موقت:** ۱۷ implemented، ۴۶ partial، ۲۶ not implemented و ۱۱ needs real validation؛ مجموع ۱۰۰ ردیف. این شمار، درصد تحقق تجربهٔ کاربری یا تعداد باگ مستقل نیست.

## شواهد اصلاحات تکمیلی — پس از snapshot جدول

این بخش گزارش جدید را از جدول تاریخی زیر جدا می‌کند. شماره‌خط‌های جدول تاریخی برای کد امروز معتبر نیستند. «شاهد جدید» به معنی بسته‌شدن همهٔ زیرمعیارهای ردیف نیست؛ شمار نهایی ۱۰۰ ردیف هنوز اعلام نمی‌شود.

| ID | شاهد جدید در کد و آزمون | محدودیت باقی‌مانده |
|---|---|---|
| 002 | `BottomTabItem` لینک مقصد، نام و برچسب ثابت؛ AdaptiveNavigation و BottomTabItem tests | متن بزرگ و هندسهٔ دستگاه واقعی |
| 003، 005 | `SidebarFoldersList` / `SidebarTagsList`: دیالوگ مستقل از حالت collapsed، ایجاد در فهرست خالی، دکمهٔ مدیریت؛ ۳ تست `SidebarCreation` موفق | مسیر collapsed/expanded در مرورگر واقعی، focus restore |
| 007 | `MiniAppsView`: Run پیش‌فرض ابزار ذخیره‌شده، Edit صریح و preview کهنه؛ تست‌های MiniApps موفق | کاربردپذیری روی موبایل |
| 008 | `appNavigation`: مالک/allowlist/query امن؛ تست‌های Index و appNavigation | restore scroll خارج از دامنهٔ این helper |
| 009، 010 | `CommandPalette`: stale/open/account guards، pending/error، body-only hit و cmdk واقعی | تأخیر شبکهٔ واقعی و کتابخانهٔ بسیار بزرگ |
| 014، 016 | shared completion fail-closed، Horizon outcome handoff، بررسی شکست بازتخصیص goal؛ taskCompletion/Kanban/Horizon tests | parity تمام entry pointها و قطع شبکه وسط عملیات |
| 015 | Kanban وضعیت‌های waiting و wont_do را نیز عرضه می‌کند | بررسی خوانایی ستون‌ها در موبایل |
| 020 | server snapshot کامل روابط و رد cache/error/unsynced؛ bundle دستگاهی حساب‌محور، restore شکست‌خورده قابل retry؛ recentlyDeleted/taskService tests | فقط ۱۰ دقیقه روی همین دستگاه؛ فاصلهٔ حذف تا ثبت bundle crash-atomic نیست؛ cloud/cross-device recovery نیست |
| 024–028 | priority مشترک و label، ساعت کلیک‌شده شامل نیمه‌شب، zoom keyboard، URL date/view، Stats stale/owner/rollover؛ `focusMetrics` مشترک با Pomodoro | صحت منبع duration و ماتریس تقویم/منطقهٔ زمانی دستگاه واقعی |
| 030 | Widgets بدون fallback نمونهٔ حساب واقعی، completion مشترک و حفظ ردیف هنگام شکست؛ IslandAlbum حذف تأییدی و نتیجهٔ صریح | snapshot recovery آلبوم بلندمدت فراهم نیست |
| 031 | عنوان و متن در draft دستگاهی؛ revision/owner guards، انتخاب دو نسخه و ذخیرهٔ بازیابی فقط با اقدام صریح؛ NotesView.recovery/debouncedWrites tests | همهٔ فیلدهای note و cloud conflict transaction کامل پوشش داده نشده‌اند |
| 034 | ArticleRewrite draft حساب‌محور با readback، buffer جدا و exit guard؛ ۳ تست موفق | device retention جای پشتیبان ابری نیست |
| 035–037، 039 | practice standalone در reader، لینک سند در tree، unmount subtree جمع‌شده و جلوگیری از collapse هنگام focus، partial graph + Retry؛ تست‌های reader/tree/mindmap موفق | race بین دستگاه‌ها و walkthrough کامل keyboard |
| 041، 043 | region resources در gate، SOS مستقل، support هنگام پاسخ و شکست save؛ ClinicalSafety/ClinicalDisclaimer tests | شماره‌ها و URI تماس/SMS نیازمند دستگاه/منطقهٔ واقعی |
| 045 | retry نتیجه با ID ثابت؛ نتیجهٔ حساب قبلی پاک، late callbacks رد، timeout و Retry | subscription failure واقعی و قطع شبکه |
| 048، 049 | chart فاصلهٔ واقعی تاریخ، gaps و جدول؛ heatmap missing/unrated بدون امتیاز مصنوعی | کنتراست و درک legend در آزمون کاربر |
| 050 | Checkin مقدار نامعلوم را خنثی فرض نمی‌کند؛ Breathing پاسخ worse/not-sure/skip و ادعای مشروط | اثربخشی یا تأیید پزشکی ادعا نمی‌شود |
| 051، 052 | Diary title/content proposal + Apply/undo/stale-owner guards؛ Values readback و وضعیت صادقانهٔ دستگاه | atomic/cloud durability جامع نیست |
| 055، 056 | Life Architect ساخت طرح تازه را صریح می‌گوید، goals/values opt-in و partial failure؛ ۳ تست موفق | deployment غیرتراکنشی و retry idempotent همهٔ mutationها هنوز کامل نیست |
| 059 | Cycle draft حساب/پروفایل با readback، guard شکست و day rollover؛ ۱۴ تست | IME و دستگاه واقعی |
| 062–064 | enrichment خاموش در folder/weekly؛ weekly همان context تأییدشده؛ AboutMe preview provider/payload، stale guards، proposal review؛ تست‌های privacy و AboutMe موفق | همهٔ سطوح AI دارای first-send gate مشترک نشده‌اند |
| 066، 070 | discard/reset/bulk/key removal تأیید می‌خواهند؛ strategy تغییرکرده custom keys را حذف نمی‌کند؛ AISettings ۶ تست موفق | setup ساده و recovery بلندمدت همهٔ تنظیمات کامل نیست |
| 068 | check دستی دیگر applyUpdate نمی‌کند؛ queue read failure مانع reload است | ثبت مرکزی همهٔ draftهای صفحه‌ها برای update هنوز کامل نیست |
| 074، 075، 079 | یک مالک edge وب، بدون sentinel، cancel/retreat/multitouch/selection guards؛ gesture و Back tests | رفتار native/device واقعی |
| 078، 080 | install بالای bottom bar؛ toolbar با actual measure/visualViewport و wrap، dialog close ۴۴px | stack همهٔ overlayها و کیبورد واقعی |
| 081، 083–085، 087، 090 | boot theme/reduced-motion، status tokens، gradient rules محدود، font variable، header budget مشترک و reactive locale | همهٔ composite contrastها و سطح‌های legacy هنوز بصری تأیید نشده‌اند |
| 088، 092، 093 | logical dialog/sheet، skip/focus/announcement shell، command focus ring، thumb نام‌دار | screen reader و modal nested focus واقعی |
| 094–096 | label association، websites opt-in، retry created IDs، زبان keyboard، خطای Link اعلام‌شده | IDs واردکردن contact فقط در mount/account/task جاری retained هستند |
| 097–100 | page-local loading/error boundary، note ۵۰ردیفی اولیه، queue identity signature، Google error/Retry و نصب همیشگی | رندر/تعامل کامل ۵۰۰۰ note و authenticated first-value flow هنوز اجرا نشده |

### آخرین دروازهٔ آزمون

- typecheck مستقیم پس از آخرین اصلاحات: بدون خطا.
- build پس از آخرین اصلاحات: `BUILD_EXIT=0`؛ هشدار chunk size باقی است.
- اجرای کنترل‌شدهٔ دوم: ۳۰۴ فایل / ۱۹۵۹ تست موفق؛ یک تست debounce تمرین ناموفق. همان فایل جداگانه ۱۳/۱۳ موفق شد؛ تست debounce به ساعت کنترل‌شده تبدیل و دوباره ۱۳/۱۳ گذشت.
- اجرای کامل تازه با تست deterministic موفق شد: **۳۰۵ فایل و ۱۹۶۰ تست موفق، SUITE_EXIT=0**. ادغام و مرور تصویری پس از آن جداگانه ثبت می‌شوند؛ موفقیت suite به معنی بسته‌شدن ۱۰۰ زیرمعیار ممیزی نیست.
- آخرین ماتریس تصویری پیش از اصلاح سایدبار: ۲۶ responsive و ۱۰ desktop موفق. این‌ها fixture مصنوعی‌اند؛ بعد از ادغام باید روی `main` تکرار شوند.

## خطرهای تاریخی اولویت‌دار در snapshot مبنا (وضعیت امروز نیست)

1. **P1 / 016، 020 — بازیابی و حذف هنوز release gate هستند.** `src/pages/KanbanView.tsx:480–485` نتیجهٔ boolean بازتخصیص کارها را بررسی نمی‌کند و سپس goal را حذف می‌کند. `src/features/tasks/taskService.ts:235–251` شکست snapshot روابط را تحمل می‌کند؛ snapshot knowledge فقط ستون‌های `id,task_id,user_id` را می‌خواند. `src/lib/recentlyDeleted.ts:13–24` بازیابی را در حافظه و با انقضای ۱۰ دقیقه نگه می‌دارد. «بازیابی کامل تا موفقیت» ثابت نشده است.
2. **P1 / 064، 062 — رضایت با payload واقعی یکی نیست.** `src/pages/MindTrendsView.tsx:302–330` context را هنگام تأیید دوباره می‌سازد؛ `src/lib/mindAI/executor.ts:74–83` فاقد `skipPersonalization` است، در حالی که dialog فقط weekly stats را معرفی می‌کند. `src/components/FolderAIChat.tsx:191–197,329–332` نیز متن «فقط پروژه و گفتگو» دارد ولی enrichment عمومی را صریحاً خاموش نکرده است. این شاهد ناسازگاری قرارداد است، نه اثبات نشت داده در تولید.
3. **P1 / 030 — نمونه و عملیات واقعی Widgets هنوز مخلوط‌اند.** `src/pages/WidgetsView.tsx:142–150` دادهٔ خالی/خطا را با sample عوض می‌کند؛ `:109–110,741–744` timer مستقل با نام Start Focus دارد؛ `:242–243` نتیجهٔ حذف را بررسی نمی‌کند.
4. **P1 / 014 — completion واحد هنوز کامل نیست.** Kanban در خطای خواندن outcome به آرایهٔ خالی سقوط می‌کند (`:315–316`)؛ `src/hooks/useHorizonData.ts:86` outcomes را به سرویس نمی‌دهد. خطای recurrence در سرویس اصلاح شده، اما parity همهٔ نماها بسته نیست.
5. **P1 / 068، 074 — خروج/update و gestureها قرارداد مشترک کامل ندارند.** check در `SettingsView.tsx:329,352,369` در حالت auto-update می‌تواند update اعمال کند؛ تعویق فقط queue را می‌سنجد، نه همهٔ draftها. AppLayout هر دو edge handler وب را mount می‌کند (`:193`)؛ لغو gesture back هنوز همان commit handler را صدا می‌زند.
6. **P1 / 050، 083، 084، 093 — صداقت بازتاب و دسترسی باقی مانده‌اند.** Checkin هنوز null را ۵ و سپس «متعادل» می‌کند؛ پایان تنفس بهبود فیزیولوژیک را قطعی می‌گوید. رنگ‌های learning هنوز literal و neutralization گرادیان blanket است؛ thumb صوت تنفس نام ندارد.

## 001–010 — ناوبری و کتابخانهٔ ابزار

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 001 | P2 | partial | `src/lib/featureRegistry.ts:98–548,565–575` registry و Cycle دارد؛ `SidebarNavSections.tsx` و palette از آن مصرف می‌کنند و diff همین اتصال را گسترش می‌دهد. aliasها تنها از registry حذف شده‌اند (`:52–54`)؛ توضیح redirect و registry واحد platform/shortcut کامل دیده نشد. |
| 002 | P2 | partial | `src/components/bottom-bar/BottomTabItem.tsx:93–98,123–131` برچسب ثابت و aria-current دارد، ولی مقصد هنوز button با handleClick است، نه NavLink. خوانایی ۳۲۰px/متن بزرگ تأیید نشده. |
| 003 | P2 | not implemented | `src/components/AppSidebar.tsx:257–299,568` mount فهرست‌ها به expanded وابسته است؛ `SidebarFoldersList.tsx:229–296` در collapsed زود return می‌کند و dialog ساخت در شاخهٔ بعدی است. انتقال dialog به یک mount مستقل دیده نشد. |
| 004 | P2 | partial | `src/components/sidebar/SidebarNavSections.tsx:196–201` branch فعال را باز می‌کند؛ احترام collapse تا تغییر activeBranch تا حدی هست. sectionهای سطح بالا هنوز `open={isOpen || collapsed}` (`:382`) هستند و reveal کامل parentهای مقصد در همهٔ مراکز ثابت نشده. |
| 005 | P2 | not implemented | `src/components/sidebar/SidebarFoldersList.tsx:96–156,220` و `SidebarTagsList.tsx:41–63` long press/context menu دارند؛ More نام‌دارِ مدیریت هر ردیف دیده نشد. |
| 006 | P1 | needs real validation | diff `src/pages/MiniAppsView.tsx:155–166,311–328,345` draft حساب/ابزار و read-back صحت retention را اضافه می‌کند؛ `src/hooks/useRecoverableExit.ts:17–57` route/POP/unload را محافظت می‌کند. قرارداد navigator دستکاری‌شده باید در BrowserRouter واقعی و create-task با شکست storage آزموده شود. |
| 007 | P2 | partial | `src/pages/MiniAppsView.tsx:590–604,666–684` اجرای preview صریح است، اما فرم تألیف همچنان سطح اولیهٔ ابزار ذخیره‌شده است؛ Run پیش‌فرض/Edit جدا و حذف CTAهای تکراری کامل دیده نشد. |
| 008 | P2 | not implemented | `src/layouts/AppLayout.tsx:79` همچنان کلید عمومی `last_route` و فقط pathname می‌نویسد؛ `src/pages/Index.tsx:18` همان را می‌خواند. account scoping، query و allowlist مقصد transient پیاده نشده‌اند. |
| 009 | P2 | not implemented | `src/components/CommandPalette.tsx:66,131–139,198–205` cancelled تعریف می‌شود ولی cleanup فقط timer را پاک می‌کند؛ پاسخ remote قبلی می‌تواند setHits کند. pending/error مستقل هم در UI دیده نشد. |
| 010 | P2 | not implemented | `src/components/CommandPalette.tsx:119–125,167–173,274` body hit تولید می‌شود ولی value فقط kind/title است؛ `src/components/ui/command.tsx:30` filtering پیش‌فرض cmdk را دارد. snippet/مرجع filtering واحد و آزمون واقعی body-only هنوز لازم‌اند. |

## 011–020 — کار، تکمیل و حذف

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 011 | P1 | implemented | `src/components/QuickAddTask.tsx:230,385–389,432,1137–1152` draft canonical و merge patch زمان‌بندی دارد؛ `src/lib/taskSchedule.ts:125–145,346–347` schedule/deadline مستقل را حفظ می‌کند. پذیرش round-trip recurrence/reminder/deadline همهٔ entry pointها هنوز نتیجهٔ این مرور نیست. |
| 012 | P2 | implemented | `src/components/QuickAddTask.tsx:396–398` فقط undefined را با mention/default جایگزین می‌کند و null صریح را نگه می‌دارد؛ `:948–964,1171–1203` مقصد resolved و Inbox قابل دیدن‌اند. |
| 013 | P1 | implemented | `src/features/tasks/taskCompletion.ts:28–32` failure recurrence نتیجهٔ failed و پایان مسیر است؛ `src/pages/KanbanView.tsx:306–328,373–376` done/drop را از همین قرارداد عبور می‌دهد. |
| 014 | P1 | partial | سرویس study/recurrence/outcomes دارد (`taskCompletion.ts:26–39`) و Kanban row/drop مشترک شده؛ ولی `KanbanView.tsx:315–316` failure outcomes را خالی فرض می‌کند و `useHorizonData.ts:86` بدون outcomes فراخوانی می‌کند. parity چندنما کامل نیست. |
| 015 | P2 | not implemented | `src/pages/KanbanView.tsx:115–120` فقط todo/in_progress/done در COLUMNS و COL_ORDER دارد؛ گروه/mapping آشکار waiting و wont_do دیده نشد. |
| 016 | P1 | partial | `src/pages/KanbanView.tsx:437–493,713–761` تأیید، شمار کار و unassign/reassign اضافه شده؛ نتیجهٔ `upsertTask` داخل Promise.all بررسی نمی‌شود و سپس goal حذف می‌شود (`:480–485`). undo و all-entry-point recovery کامل نیست. |
| 017 | P1 | implemented | `src/components/QuickAddTask.tsx:1058,1095` opener/title نام‌دار دارد؛ عنصر opener button واقعی و focus-visible در مسیر compact است. هندسهٔ ring و walkthrough keyboard نیازمند اجراست. |
| 018 | P1 | implemented | `src/pages/TaskDetailView.tsx:138–161,220` Escape و onOpenChange به requestClose می‌روند و requestClose به handle داخل TaskDetail تفویض می‌کند؛ backdrop دیگر exit مستقیمِ loaded editor نیست. |
| 019 | P2 | implemented | `src/components/tasks/TaskDeleteConfirmDialog.tsx:15–26,29,59–61` busy lock و false/throw باعث حفظ dialog می‌شوند؛ `TaskDetailView.tsx:213–215` همین primitive مشترک را مصرف می‌کند. |
| 020 | P1 | partial | `src/features/tasks/taskService.ts:213–255` server snapshot و recovery graph دارد؛ اما snapshot روابط می‌تواند شکست بخورد و حذف ادامه یابد. `src/lib/recentlyDeleted.ts:13–24,45–55` false را حفظ می‌کند ولی bundle فقط در حافظه و با TTL است؛ همهٔ روابط/پایداری تا موفقیت تضمین نشده. |

## 021–030 — امروز، تقویم و تمرکز

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 021 | P2 | needs real validation | `src/pages/TodayDashboardView.tsx:621–653,655–691` انتخاب صریح Next و کنترل runtime مشترک دارد؛ diff `FocusRuntime.tsx:29–39,119` mini تکراری Today را پنهان می‌کند. hierarchy، label موبایل و فهم study launcher بدون walkthrough تأیید نمی‌شوند. |
| 022 | P1 | implemented | `src/pages/CalendarView.tsx:178–184,250–258` fetch/heading/list period از periodFor با calendar مشترک استفاده می‌کنند؛ Agenda دیگر محدودهٔ مستقل میلادی ندارد. ماتریس نوروز/locale هنوز نیازمند اجراست. |
| 023 | P1 | implemented | `src/components/calendar/MonthGrid.tsx:30–46` weekStartsOn و weekdayLabels را از روز واقعی شروع هفته می‌سازد؛ Gregorian+Saturday hardcode قبلی رفع شده است. |
| 024 | P1 | partial | `DayDetailSheet.tsx:20–28,72–75` rank از registry مشترک و urgent دارد؛ `MonthGrid.tsx:11–16,101` رنگ‌ها registry محلی‌اند و priority متن مکمل ندارد. «registry و متن در همهٔ سطوح» کامل نیست. |
| 025 | P2 | not implemented | `src/pages/CalendarView.tsx:410,417` hour ورودی را در onSlotClick نادیده می‌گیرد؛ `src/components/calendar/DayDetailSheet.tsx:50,83–84` افزودن همچنان ساعت پیش‌فرض ۹ دارد. |
| 026 | P1 | partial | `WeekView.tsx:32–46` slot button و task button با keyboard هست، اما task مقصد Link نیست؛ `:73–84` zoom فقط pinch است. `CalendarView.tsx:45–46` date/view محلی‌اند، URL state و +/-/reset دیده نشد. |
| 027 | P2 | not implemented | `src/pages/StatsView.tsx:40–42,46–85,87` تاریخ‌ها memo ثابت و reads بدون owner-generation/error/loading هستند؛ rollover و activity refresh آشکار ندارند. نمایش حساب قبلی در تولید ادعا نمی‌شود. |
| 028 | P1 | partial | `src/pages/PomodoroView.tsx:128–151,228,398,544–546` زمان توقف زودهنگام و completed count را جدا می‌کند؛ `StatsView.tsx:69–76,97–101` هنوز فقط completed=true و started_at می‌خواند. تعریف مشترک duration/day attribution بسته نیست. |
| 029 | P2 | needs real validation | `src/pages/StatsView.tsx:256–279` summary/table و `PomodoroView.tsx:427–462` chart مخفی برای AT همراه جدول دارد. خوانش Recharts/AT، unit/legend قابل مشاهده و ترتیب جدول باید در اجرا سنجیده شوند. |
| 030 | P1 | not implemented | `src/pages/WidgetsView.tsx:95–110,142–150,242–243,741–744` sample fallback، timer مستقل و success حذف بدون بررسی outcome باقی‌اند؛ `src/components/island/IslandAlbum.tsx:53–56,96` حذف snapshot هم بدون confirmation/recovery است. |

## 031–040 — نوشتن، دانش و ادامهٔ یادگیری

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 031 | P1 | partial | `src/lib/debouncedWrites.ts:13–51` draft account/note با read-back؛ diff `NotesView.tsx:676–735` writes/clear را revision-serialized و exit را at-risk می‌کند. title در NoteDraftRecord نیست و failed jobهای debounce حافظه‌ای‌اند (`debouncedWrites.ts:63–85`)؛ conflict/reload همهٔ فیلدها کامل نیست. |
| 032 | P1 | implemented | `src/pages/NotesView.tsx:768–817,1169–1179` proposal به note/owner/baseRevision وصل، stale رد و Apply/Regenerate صریح است؛ late result دیگر مستقیم content را جایگزین نمی‌کند. |
| 033 | P1 | implemented | `src/components/NoteEditorTabs.tsx:40–41,80–81` externalRevision را به RichEditor می‌دهد؛ `RichEditor.tsx:165–166,300–318` replacement فقط revision-bound است، نه remount روی هر تایپ. حفظ selection/undo در مرورگر هنوز باید آزموده شود. |
| 034 | P1 | partial | `src/pages/ArticleRewriteView.tsx:113–164` buffer جدا، abort و Apply/Discard دارد؛ `:37–51,90–95` draft کلید عمومی و write بی‌بررسی است و guard شکست retention ندارد. recovery حساب‌محور/شکست storage کامل نیست. |
| 035 | P1 | partial | `InteractiveLearningModal.tsx:77–99,210,434–461` proposal منبع/زبان-scoped و replace opt-in دارد؛ `KnowledgeDocumentReader.tsx:300–320,369–381,483–515` snapshot/stale comparison/restore دارد. اما reader در `:960–978` mode جداگانه نمی‌دهد و modal پیش‌فرض editor است (`InteractiveLearningModal.tsx:59,519–541`)؛ practice جدا پیش‌فرض کامل نیست. cross-device race هم نیازمند اجراست. |
| 036 | P1 | partial | `src/components/knowledge/KnowledgeSidebarTree.tsx:138–150,300–311` treeitem با نام و key handlers دارد؛ سند هنوز div onClick است نه link و کنترل‌های ثانویه در همان treeitem هستند (`:326–347`). شرط semantic/sibling کامل نیست. |
| 037 | P2 | not implemented | `src/pages/KnowledgeBaseView.tsx:104–114,534–543` collapse خودکار و aria-hidden/pointer-events-none دارد، ولی subtree mount و focusable می‌ماند؛ inert/unmount و توقف collapse با focus داخلی دیده نشد. |
| 038 | P2 | partial | `src/components/RichEditor.tsx:195` نام body اختیاری و API focus دارد؛ ولی `NoteEditorTabs.tsx:98–111` raw markdown همچنان بدون label و `KnowledgeDocumentEditorModal.tsx:341–362` titleها بدون association روشن‌اند. نام همهٔ editor/زبان‌ها کامل نیست. |
| 039 | P2 | not implemented | `src/components/review/KnowledgeMindMapView.tsx:930–962` Promise.all و catch هنوز دادهٔ سالم را [] می‌کند و فقط console.error دارد؛ error/partial graph/Retry جدا دیده نشد. |
| 040 | P2 | partial | diff `src/lib/lastStudy.ts:116–143` version/language/section/card/practice را persist می‌کند و reader `:203–239` position را ثبت می‌کند؛ Continue/InteractiveStudy مصرف دارند. زیرمعیار Full article/print/find و bridge note→knowledge با provenance و آزمون کاربر کامل تأیید نشده است. |

## 041–050 — حمایت، خودشناسی و بازتاب

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 041 | P1 | partial | `src/components/ClinicalDisclaimer.tsx:23–38,84–107,127–129` SOS از gate مستقل و تماس‌ها link شده‌اند؛ notice همچنان شمارهٔ emergency ایران را بدون انتخاب region نشان می‌دهد. parity انتخاب منطقه در همین gate کامل نیست. |
| 042 | P1 | needs real validation | `src/lib/crisisResources.ts:183–195` Crisis Text Line شمارهٔ voice ندارد و smsBody=HOME/primaryChannel=sms دارد؛ URI/channel/fallback واقعی روی دستگاه و منطقه باید آزموده شود. |
| 043 | P1 | partial | `src/pages/ScreenerView.tsx:192–200,302–309,696,900` flag محلی در review و result حتی failure save قابل دیدن است؛ در stage run (`:563–670`) خود support card render نمی‌شود. شرط answer/review/failure کامل نیست. |
| 044 | P1 | implemented | `src/lib/firestoreDataService.ts:1285–1316` currentIndex/current_index/index را normalize و clamp می‌کند؛ runner max cursor ابزار را به read می‌دهد. round-trip منطق در منبع حاضر است. |
| 045 | P1 | partial | diff `AssessmentRunner.tsx:177–251` finish lock، result ID ثابت retry و check save دارد؛ `AssessmentResult.tsx:56–76` loaded/empty دارد اما subscription error/retry و reset کامل نتیجه هنگام تغییر owner/type آشکار نیست. recovery همهٔ failureها بسته نیست. |
| 046 | P1 | implemented | `src/pages/AssessmentResult.tsx:325–330,345` متن دو زبان AI reflection اختیاری/غیربالینی و احتمال خطا را صریح می‌کند؛ ادعای clinical report حذف شده است. |
| 047 | P1 | implemented | `src/pages/WorryView.tsx:158–181,225–241,704` retry از sessionId و task ID وابسته استفاده می‌کند و resetForNewWorry ID/state جدید می‌سازد؛ نگرانی جدید دکمهٔ reset مستقل دارد. |
| 048 | P2 | partial | `src/pages/MindTrendsView.tsx:343–374` metric/دامنهٔ ۱–۱۰ دارد، ولی x بر index است نه فاصلهٔ تاریخ و polyline nullها را به هم وصل می‌کند؛ axis تاریخ، gaps، table/summary metric کامل نیست. |
| 049 | P2 | not implemented | `src/pages/MindTrendsView.tsx:254–268` unrated=0.4 و missing=0 باقی است؛ `src/pages/mind/MindTrendCharts.tsx:249–268` همین intensity را در legend/tooltip به امتیاز تبدیل می‌کند. تفکیک missing از صفر انجام نشده. |
| 050 | P2 | not implemented | `src/pages/CheckinView.tsx:335–337,386–391` nullها به ۵ و سپس Balanced تبدیل می‌شوند؛ `BreathingView.tsx:398–405` بهبود دستگاه عصبی را قطعی می‌گوید و worse/other/skip ندارد. |

## 051–060 — دفتر روزانه و زندگی

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 051 | P1 | partial | `src/components/diary/DiaryAiTools.tsx:12–21,38–41,61–85` content proposal/undo entry/revision-scoped است؛ title در `:65` مستقیم اعمال می‌شود و owner در RequestScope نیست. همهٔ Apply/owner-switch معیارها کامل نیستند. |
| 052 | P1 | partial | `src/pages/ValuesGoalsView.tsx:158–189,258,279` debounce/retry و boolean outcomes دارد؛ ولی `:200–205` localStorage failure را می‌بلعد و همچنان status=device می‌دهد، و unmount write در `:215` بدون outcome است. local durability/synced honesty کامل نیست. |
| 053 | P1 | implemented | `src/pages/ValuesGoalsView.tsx:669` confirm حذف goal دارد و return delete بررسی می‌شود (`:279`)؛ `src/components/diary/DiaryAttachments.tsx:154` action «جداکردن» با توضیح نگه‌داشتن فایل و pendingRemove است. |
| 054 | P2 | partial | `src/components/LifeSystemMap.tsx:35,47,83–86` فقط Kanban goals می‌خواند و task percent هنوز Overall progress است. مسیر Plan/first-step تا حدی هست (`:52–57`)؛ شناخت هر دو نوع goal و disclosure مکمل Garden کامل نیست. |
| 055 | P1 | not implemented | `src/pages/LifeArchitectView.tsx:370–388` Quick Pace Tuning هنوز startWizard(5) با ادعای adjust cadence است؛ update current cadence یا نام صادقانهٔ ساخت blueprint تازه دیده نشد. |
| 056 | P1 | partial | diff `LifeArchitectView.tsx:160–165,228–247,1234–1250` goals/values opt-in و mutation counts دارد؛ diff `lifeArchitect.ts:1230–1238` read failure values را empty فرض نمی‌کند. نتیجهٔ جزئی فقط warning برای بررسی دستی پیش از retry است؛ idempotent recovery و preview تمام dependency/mutationها در اجرا بسته نیست. |
| 057 | P1 | partial | `src/pages/LifeArchitectView.tsx:76,465–477,813–825` role/keyActivate و radio cards اضافه شده؛ diff checkboxهای goals/values را onCheckedChange می‌کند. کارت‌های review باقی‌مانده هنوز toggle ردیف با checkbox جدا دارند؛ radio arrow/roving و stepper کامل تأیید نشده. |
| 058 | P1 | implemented | `src/pages/CycleView.tsx:143–146,267–320` date انتخابی، edit/upsert log و undoPeriodStart بدون حذف profile دارد؛ undo فقط event را تغییر می‌دهد. |
| 059 | P2 | partial | `src/pages/CycleView.tsx:154–166,325–337` guard checkin هنگام switch/date/period هست؛ profileDraft در state است (`:66`) و persistence/refresh/route guard برای آن دیده نشد. |
| 060 | P2 | partial | `src/components/SleepSoundsCard.tsx:40–81,91,98,109,122` deadline نگه داشته، timer reset صریح و selected state/policy breathing دارد. aria-label Slider روی Root است؛ `src/components/ui/slider.tsx:18` thumb نام‌دار نمی‌شود و navigation عمومی playback policy کامل نیست. |

## 061–070 — حریم خصوصی، تنظیمات و پشتیبان

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 061 | P1 | partial | `src/components/FirebaseSyncCard.tsx:146` E2EE را به TLS/rules تغییر داده؛ مسیر readable `firestoreSync.ts:396–405` با ادعای E2EE معرفی نمی‌شود. متن rules/readiness و diagnostics هنوز شاهد ارزیابی مستقل زیرساخت نیست و card bilingual/progressive disclosure کامل نیست. |
| 062 | P1 | partial | `AISettingsTab.tsx:539` history و task scope مستقل از personalization را توضیح می‌دهد؛ AIPanel چند call را skipPersonalization می‌کند. `FolderAIChat.tsx:191–197,329–332` enrichment را خاموش نکرده و provider/payload first-send approval مشترک ندارد؛ disclosure با همهٔ درخواست‌ها برابر نیست. |
| 063 | P1 | partial | `src/pages/AboutMeView.tsx:686–702` Save & Finish از analyze جدا و شرح BYOK دارد؛ analyze snapshot می‌گیرد (`:183–184`) و skipPersonalization دارد (`:210`). نام provider واقعی/preview همان payload پیش از send به‌صورت consent gate دیده نشد. |
| 064 | P1 | not implemented | `MindWeeklyInsightsDialog.tsx:40–45` preview stats-only؛ `MindTrendsView.tsx:302–330` payload را دوباره می‌سازد؛ `mindAI/executor.ts:80–83` skipPersonalization ندارد. همان snapshot approved و منع enrichment پیاده نشده‌اند. |
| 065 | P1 | needs real validation | `src/pages/settings/AssistantAccessSettings.tsx:151–155,189–210,222–229` پیش‌فرض tasks:read، ۷ روز، review و revoke دارد. enforce expiry/revocation server و جلوگیری از write واقعی باید آزموده شود. |
| 066 | P1 | partial | `src/components/SyncIssuesDialog.tsx:32–48,81–126,129–152,215–232` category، export، Undo و bulk confirm دارد؛ single discard هنوز مستقیم `discard([item])` در `:189` است. confirmation هر discard و recovery بلندمدت کامل نیست. |
| 067 | P1 | implemented | `src/pages/SettingsView.tsx:694–717,777–794,807–869` manifest/status، preview unsupported/collisions و saved/queued/failed شمارش دارد؛ restore عمداً tasks/notes محدود است و پیش از اعمال اعلام می‌شود. این implemented به معنی round-trip همهٔ collections نیست. |
| 068 | P1 | partial | `src/pages/SettingsView.tsx:164–207,507–530` queue defer و cache warning/confirm دارد و autoUpdate preference در شاخه‌ها رعایت شده؛ اما check در `:329,352,369` update اعمال می‌کند و همهٔ editor draftها را نمی‌سنجد. شرط check read-only/defer edits کامل نیست. |
| 069 | P2 | not implemented | `src/components/FolderAIChat.tsx:127–143` بازشدن session را پاک می‌کند؛ `:355–375` پیشنهادها فقط خواندنی و «ساخت همه» هستند، description/انتخاب/ویرایش و outcome هر آیتم دیده نشد. |
| 070 | P2 | partial | `src/pages/SettingsView.tsx:95–127,1063–1065` disclosure دسترسی عامل دارد؛ `AISettingsTab.tsx:364–397` reset/bulk همچنان فوراً save می‌کنند و undo ندارند، تغییر default با مدل explicit/auto-save متفاوت است. setup ساده و guard تمام edits کامل نیست. |

## 071–080 — موبایل، PWA و gesture

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 071 | P1 | needs real validation | `index.html:20` maximum-scale/user-scalable حذف شده؛ zoom/reflow و OS text enlargement روی PWA/WebView از منبع قابل تأیید نیست. |
| 072 | P1 | implemented | `src/components/bottom-bar/BottomQuickAddButton.tsx:96–99` handlers و didFire صحیح‌اند؛ More actions صریح با ref/focus و expanded state اضافه شده است. nested capture و long press واقعی هنوز باید آزموده شود. |
| 073 | P1 | needs real validation | `src/layouts/AppLayout.tsx:110–111,172–175` و `BottomTabBar.tsx:8,37` از shouldShowBottomNavigation مشترک استفاده می‌کنند؛ `src/index.css:376–381` width-only hiding را جایگزین کرده. wide-touch/foldable reservation و هندسه باید در دستگاه سنجیده شوند. |
| 074 | P1 | not implemented | `src/layouts/AppLayout.tsx:193` وب هر دو EdgeSwipeHandler و EdgePanBack را mount می‌کند؛ `EdgeSwipeHandler.tsx:41–62` و `EdgePanBack.tsx:32–44` edgeهای مشترک دارند و ownership overlay/selection مشترک دیده نشد. |
| 075 | P2 | partial | `src/components/BackButtonHandler.tsx:22–24` sentinel را فقط idx صفر push می‌کند، اما onPop در `:29` ref/root pathname را می‌سنجد نه event marker واقعی؛ overlay-first و Notes→Today قرارداد کامل ندارد. |
| 076 | P2 | needs real validation | `src/layouts/AppLayout.tsx:127,170–185` main-scroll/overflow-auto هست ولی shell min-h-screen دارد. owner واقعی scroll، long-list virtualization، route restoration و keyboard viewport بدون اجرا تعیین نمی‌شوند. |
| 077 | P2 | needs real validation | `src/components/ui/dialog.tsx:39` primitive ثابت و `MobileSpeedDialMenu.tsx:93` modal دارد؛ `index.html:20` resizes-content. IME/landscape/zoom، dvh/body containment و Android resize policy در این مرور اجرا نشد. |
| 078 | P2 | partial | diff `FocusRuntime.tsx:29–39,119` duplicate Today را کم می‌کند، ولی `InstallPrompt.tsx:102` هنوز bottom-4/z-50 مستقل است؛ overlay stack/clearance مشترک install/mini/sync/selection دیده نشد. |
| 079 | P2 | not implemented | `src/components/EdgePanBack.tsx:56–73` touchcancel را به onEnd commit متصل می‌کند؛ `src/components/gestures/PullToRefresh.tsx:79` نیز cancel=end است. retreat/final-distance/disarm مشترک کامل نیست. |
| 080 | P2 | not implemented | `src/components/SelectionActionToolbar.tsx:131–133` clamp با حد ثابت ۱۴۸ و window.innerWidth است؛ toolbar actual measure/visualViewport/wrap دیده نشد. `ui/dialog.tsx:45` close hitbox کوچک مانده است. |

## 081–090 — پوسته، تایپوگرافی و بومی‌سازی

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 081 | P2 | not implemented | `index.html:25,50` theme-color تکراری؛ `:58–62` boot تیره و spinner بدون reduced-motion inline با انتخاب light اولیه ناسازگارند. boot tokens هم‌پوسته/cold-load رفع کامل نشده. |
| 082 | P1 | needs real validation | `src/index.css:86,128,133–137` destructive dark foreground و amber pairs اصلاح شده؛ `src/components/ui/button.tsx:12–13` fill/foreground مشترک مصرف می‌کند. contrast همهٔ accent/state/compositeها اندازه‌گیری واقعی نشده است. |
| 083 | P1 | not implemented | `src/index.css:754–782` callout رنگ‌های literal مستقل از theme دارد؛ status learning tokens theme-aware و composite acceptance در مسیر ممیزی دیده نشد. |
| 084 | P1 | partial | foreground primary بعضی dark pairها اصلاح شده، اما `src/index.css:1734–1737` هنوز substring/!important تمام گرادیان‌ها را neutralize می‌کند. migration component-level درخواست‌شده انجام نشده. |
| 085 | P2 | partial | `src/index.css:1778–1782` body/toast انگلیسی language-aware هستند؛ `tailwind.config.ts` fontFamily مشترک تعریف نمی‌کند. stack body/font-sans یکسان و edge cue scrollbar زیرمعیار کامل نیست. |
| 086 | P2 | partial | `src/components/ui/button.tsx:8` transition-colors دارد، ولی `src/index.css:336,517,799,1742–1746` scale/transition-all/blanket animation overrides و `BottomQuickAddButton.tsx:100` transition-all باقی‌اند. migration variantهای صریح کامل نیست. |
| 087 | P2 | partial | `src/index.css:1784–1790` workspace remaining-space دارد، اما header ثابت ۳rem است در برابر min-height=3.5rem (`:1901`)؛ branch desktop bottom reservation را هم مستقل کم می‌کند. actual scroll budget و scrollbar discoverability بسته نیست. |
| 088 | P2 | not implemented | `src/components/ui/dialog.tsx:45,55` right-4/sm:text-left و `src/components/ui/sheet.tsx:60,71` همان الگوی physical را دارند؛ logical portal/submenu migration کامل دیده نشد. |
| 089 | P2 | partial | `src/lib/localeFormat.ts:23–25` resolver locale دارد؛ `MonthGrid.tsx:45,66–68,107` زبان/digits را از system استنتاج می‌کند و count همیشه Persian است، `WeekView.tsx:161` نیز ساعت فارسی hardcode است. date/count name و aria-current date زیرمعیار غایب‌اند. |
| 090 | P2 | not implemented | `src/lib/uiPrefsSync.ts:59` remote enJalali را بدون date-format event می‌نویسد؛ `AppLayout.tsx:114,157–158` و `HeaderBackButton.tsx:18` language/direction را از DOM می‌خوانند نه اشتراک reactive. |

## 091–100 — دسترسی تکمیلی، recovery و کارایی

| ID | اولویت | وضعیت | شاهد منبع و شکاف مشخص |
|---|---|---|---|
| 091 | P1 | needs real validation | `src/components/bottom-bar/MobileSpeedDialMenu.tsx:90–103` Radix Root/Portal/Content با autofocus/restore دارد؛ `TaskDetailView.tsx:220–245` Dialog نام‌دار با requestClose است. Tab trap/inert/Escape/nested capture و return focus واقعی هنوز آزموده نشده‌اند. |
| 092 | P2 | not implemented | `src/layouts/AppLayout.tsx:125–185` main دارد ولی skip link/route focus/announcement در shell دیده نشد؛ `src/components/ui/command.tsx:42–47` input outline-none بدون focus-within replacement است. |
| 093 | P1 | partial | `src/pages/BreathingView.tsx:99–116,278–281,365` reduced JS transform و phase live status دارد؛ `:441` Slider بی‌نام و `ui/slider.tsx:18` Thumb بدون naming API است. reset/slider naming کامل نیست. |
| 094 | P2 | not implemented | `src/components/contacts/ContactEditorDialog.tsx:282–291,344–351` label adjacent بدون association دارد؛ `DeviceContactImportModal.tsx:64,130–162` websites پیش‌فرض true و batch loop بدون گزارش partial/retry IDs است. |
| 095 | P2 | not implemented | `src/pages/settings/SectionCard.tsx:33–55` control ID/help association ندارد؛ `src/components/LinkDialog.tsx:67` error بدون describedby است؛ `src/components/ui/slider.tsx:18` props Root به Thumb منتقل نمی‌شوند. نام/selected/error همهٔ فرم‌های ممیزی بسته نیست. |
| 096 | P2 | partial | `src/components/LanguageSwitcher.tsx:19–28,59–69` radio role/lang و ترجمه دارد، ولی arrow/roving keyboard ندارد؛ `AILangToggle.tsx:12` SelectTrigger بی‌نام است. mixed calendar title و نام‌گذاری یکدست همهٔ goal/backup surfaces کامل نیست. |
| 097 | P1 | partial | `src/components/ErrorBoundary.tsx:64–95,141` purge خودکار حذف، recovery رضایتی/محدود و unsaved caveat دارد؛ `src/App.tsx:298–402` Suspense هنوز router/shell را بیرون می‌پوشاند و boundary داخلی فقط در بخشی از مسیرهاست (`:329`). page-local containment کامل نیست. |
| 098 | P2 | partial | diff `src/pages/NotesView.tsx:892–900,1431` filtering/preview helper memoized است و draft feedback افزوده شده؛ sidebar همچنان filtered.map است و `noteSaveState` فقط idle/saving/device/failed (`:190`) دارد. benchmark ۵۰۰/۵۰۰۰، loading/error/stale و queued/synced مجزا کامل نیست. |
| 099 | P2 | partial | `src/components/OfflineIndicator.tsx:78` signature owner و شمارها را دارد، نه identity/category؛ offline signature فقط offline است. entry/live status وجود دارد، ولی تغییر queue هم‌شمار می‌تواند dismissed بماند و meaningful announce acceptance بسته نیست. |
| 100 | P2 | partial | `Auth.tsx:47,175,257–261` و `AuthCallback.tsx:33–34,64` retry/return target؛ `GoogleLinkSettings.tsx:62–89` و `WeatherLocationPicker.tsx:76–83` error/retry دارند؛ diff InstallPrompt entry دائمی و Later session را اضافه می‌کند. اما `GoogleImportButtons.tsx:15–16` خطا را به null و ناپدیدشدن کنترل تبدیل می‌کند، connect فقط toast است (`:24`) و install هنوز first-value gate ندارد (`InstallPrompt.tsx:60–72`). |

## حدود اعتبار و کار باقی‌مانده

- در این مرور مستقل، مرورگر/سرور/حساب واقعی، failure injection، screen reader، contrast composite، IME یا benchmark اجرا نشد. جدول عمداً تأیید usability/security/clinical نمی‌دهد.
- در کار قبلی همین عامل، فقط دو فایل تست Settings/schedule با **۱۶ تست** و چهار فایل schedule/timeHorizon با **۵۶ تست** موفق شدند و frontend typecheck موفق بود. آن نتایج اثبات پذیرش ۱۰۰ ردیف نیستند و پس از تغییرهای موازی باید تکرار شوند.
- ابتدا شکاف‌های P1 مشخص بالا رفع/آزموده شوند؛ سپس ماتریس fa/en × Jalali/Gregorian × Saturday/Monday، Back/Escape/route/update با dirty/failed، source AI race و restore جزئی انجام شود.
- هر re-review باید HEAD و snapshot diff جدید را ثبت کند؛ تغییر یا ادعای عامل دیگر خودکار وضعیت این جدول را سبز نمی‌کند. این سند باید در پایان ادغام و آزمون واقعی به‌روزرسانی شود.
