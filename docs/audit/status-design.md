# وضعیت یافته‌های ممیزی طراحی/UX در درخت کاری فعلی

**مخزن:** `Arshiam` — HEAD `b1e9d0b` + تغییرات uncommitted (۳۶ فایل؛ ۴۱ فایل/مسیر حذف‌شده).
**روش:** `git diff`/`git status` + خواندن کد فعلی در ناحیهٔ ارجاع + grep برای نمادها. هیچ فایلی در مخزن تغییر نکرد.
**قید:** همهٔ مسیرها نسبت به `Arshiam/frontend/src/` هستند مگر خلافش ذکر شود. شماره‌خط‌ها مربوط به درخت کاری فعلی‌اند.

**تغییرات تأییدشدهٔ درخت کاری (مبنای داوری):** `BottomTabBar.tsx` (حذف آرایهٔ مردهٔ `tabs`، حذف Alt+5، حذف import نوارهای مرده)، `CommandPalette.tsx` (رویداد `lov:open-quick-capture`)، `TaskFilterSheet.tsx` + `AIPanel.tsx` + `KeyboardShortcutsDialog.tsx` (دوزبانه با `useBilingual`)، `TasksHeader.tsx` (حذف ردیف تکراری «تایم‌باکت»)، `SidebarNavSections.tsx` (+۲ کلید EN)، `TaskListItem.tsx` (مکانیزم `TAP_HALO`)، `TaskActionSheet.tsx` (ادغام سه ردیف ویرایش/ضمیمه/تگ)، `TaskMetaBar.tsx` + `index.css` (فید لبه)، `MetaTile.tsx` (`h-7`→`h-9`)، `TodayDashboardView.tsx` (گارد `tasksReady`)، `App.tsx` (`RouteFallback` اسپینر)، حذف `App.css`/`IslandView.tsx`/۵ کامپوننت و ۱۸ فایل `ui/*`.

---

## (الف) جدول وضعیت ۳۶ یافته

| # | عنوان کوتاه | وضعیت | شاهد (file:line + snippet) |
|---|---|---|---|
| ۱ | سرصفحهٔ موبایل اشباع | NEEDS-OWNER-DECISION | `layouts/AppLayout.tsx:134-157` هنوز ۴ دکمهٔ سراسری (`SidebarTrigger`, جستجو `h-10 w-10`, `ThemeToggle`, AI) + تیتر؛ کنش‌های صفحه‌ای همان‌جا: `TodayDashboardView.tsx:591-623` (چیپ بعدی `max-w-[150px]`، شمارندهٔ تکمیل، دکمهٔ دوپنله). فقط کارت استریک `hidden sm:block` است (`:601`). |
| ۲ | فرمان «ایجاد تسک جدید» بی‌اثر | FIXED | `CommandPalette.tsx:260-263` — `// QuickCaptureDialog listens for lov:open-quick-capture; the old "arshnaz:quick-add-task" event had no listener anywhere` + `window.dispatchEvent(new Event("lov:open-quick-capture"))`؛ شنونده: `QuickCaptureDialog.tsx:59`. رشتهٔ مرده در src باقی نمانده (grep). |
| ۳ | سه سطح پرکاربرد در حالت EN فارسی/RTL | FIXED | `TaskFilterSheet.tsx:250` `dir={isEn ? "ltr" : "rtl"}` + همهٔ متن‌ها داخل `T(...)` (grep فارسی: ۴۳ مورد، همه در `T()` یا ternary `isEn`)؛ `AIPanel.tsx:157-160,209-222` تب‌ها و `dir` شرطی؛ `KeyboardShortcutsDialog.tsx:35,48` `dir={isEn…}` + `T(s.fa, s.en)`. |
| ۴ | ناوبری چهارگانهٔ موازی بدون منبع واحد | OPEN | چهار فهرست مستقل پابرجاست: `components/sidebar/SidebarNavSections.tsx:115-206` (`SECTIONS`+`NAV_ITEMS`)، `lib/sidebarQuickLinks.ts:25-60`، `lib/mobileBottomBarSettings.ts:21-132`، `CommandPalette.tsx:29-48` (۱۸ ورودی)؛ `App.tsx` هنوز ۸۷ `<Route>` و ۲۷ `<Navigate>` (شمارش ماشینی). تنها پیشرفت قبلی: `AppSidebar.tsx:43,522` از `NAV_ITEMS` استفاده می‌کند. |
| ۵ | آیتم‌های ناوبری روی مسیر ریدایرکت‌شده | OPEN | `CommandPalette.tsx:36` `{ label: T("عادات","Habits"), to: "/app/habits" …}` و `:43` `to: "/app/abc"`؛ مقاصد: `App.tsx:345` `path="habits" → /app/today` و `:367` `path="abc" → /app/thoughts?mode=short`. |
| ۶ | دو برچسب سایدبار در EN فارسی | FIXED | `SidebarNavSections.tsx:77-78` — `"ادامهٔ یادگیری": "Continue learning"` و `"پشتیبانی بحران (SOS)": "Crisis support (SOS)"`. |
| ۷ | دکمهٔ «نمای دوپنله» در ۶۰۰–۶۴۰px مرده | OPEN | `TodayDashboardView.tsx:83` `window.innerWidth >= 600` (رندر) در برابر `:615` `disabled={availableWidth !== null && availableWidth < 640}`. الگوی درست در `TasksView.tsx:1227,1230` (title توضیحی) پیاده شده و دست‌نخورده است. |
| ۸ | دو کنترل «نمای فولدر» ناهم‌خوان + گزینهٔ تکراری | PARTIAL | ردیف تکراری حذف شد: `TasksHeader.tsx:114-116` فقط یک `value="buckets"`. اما `ListViewSwitch.tsx:11-13` هنوز گزینهٔ چهارم (`kanban-columns`) ندارد و بند بی‌اثر `:19` `onChange(id === "kanban-stream" && value === "kanban-columns" ? value : id)` باقی است. |
| ۹ | شیت اقدامات: ۱۶ ردیف و ۳ ردیف با یک مقصد | PARTIAL | سه ردیف ادغام شد (`TaskActionSheet.tsx:462` «ویرایش و جزئیات»؛ `Paperclip`/`TagIcon` از import حذف شد) و ردیف تکراری انتظار/پیش‌نیاز از شاخهٔ اصلی حذف شد. اما: هنوز ۹ ردیف بی‌قید + تا ۳ شرطی در `:437-472`؛ گرید بالا هنوز `grid-cols-4` (`:403`) با کاشی شرطی `sharing` (`:411`)؛ «انتظار و پیش‌نیازها» در `:428` و `:533` تکرار شده. |
| ۱۰ | نوار متادیتا: اسکرول نامرئی + کاشی ۲۸px | PARTIAL | فید لبه اضافه شد: `TaskMetaBar.tsx:276` `… ${metaStripFade}` و `index.css:453-455` `.meta-strip-fade-left/right/both`. اما کاشی هنوز `h-9` = ۳۶px است (`MetaTile.tsx:28`) و `overflow-x-auto no-scrollbar` (`TaskMetaBar.tsx:276`) بدون اسکرول‌بار مرئی باقی است؛ هدف لمسی ۴۴px نشد. |
| ۱۱ | هدف‌های لمسی ۱۶–۲۰px در ردیف تسک | PARTIAL | `TaskListItem.tsx:34` `const TAP_HALO = "relative before:absolute before:-inset-2.5 before:content-['']"` روی هر پنج کنترل: `:255` chevron، `:263` pin (`before:-start-1`)، `:331` checkbox، `:339` drag، `:433` چیپ زمان. کامنت خود فایل: «target grows to 36-40px» — یعنی ۴۴px مورد درخواست یافته هنوز محقق نشده (حداقل WCAG 2.5.8 یعنی ۲۴px برآورده است). |
| ۱۲ | ردیف متادیتا با تا ۹ چیپ ریز | OPEN | `TaskListItem.tsx:337` `flex items-center gap-1.5 mt-1 ms-5 flex-wrap min-h-[20px]` و چیپ‌ها: `:344`/`:349`/`:354` (`text-[9px] h-4`)، `:370` (study)، `:399` (source)، `:420` (`text-[10px] h-5`)، `:433` (زمان، `h-5`)، `:448` (زیرتسک)، `:468` (نتیجه). هیچ‌گونه جمع‌شدن «+n» وجود ندارد. |
| ۱۳ | «امروز تسکی نداری» پیش از رسیدن داده | PARTIAL | «امروز» درست شد: `TodayDashboardView.tsx:572-573` `const isEmpty = tasksReady && totalCount === 0 && …`. اما `TasksView.tsx:1132` هنوز `const isEmpty = groupedTasks ? groupedTasks.length === 0 : folderTopLevel.length === 0;` و رندر `:1145` بدون گارد؛ هوک `isReady` را می‌دهد ولی مصرف نمی‌شود: `hooks/useTasksData.ts:195` `isReady: !!userId && readyOwner === userId` (destructure در `TasksView.tsx:128-137` فاقد `isReady`). |
| ۱۴ | نبود بارگذاری سطح اپ؛ EmptyState در ۲ صفحه | PARTIAL | `App.tsx:118-131` `RouteFallback` حالا اسپینر + `role="status"` + `aria-live="polite"` دارد و در `:297` `<Suspense fallback={<RouteFallback />}>` استفاده می‌شود. اما `<EmptyState>` هنوز فقط `NotesView.tsx:624` و `TasksView.tsx:1146`؛ `<Skeleton>` فقط در `PlanningView.tsx:75` (به‌علاوهٔ `ui/sidebar.tsx` و IslandAlbum مرده). |
| ۱۵ | سایه‌ها خنثی ولی پراستفاده | NEEDS-OWNER-DECISION | `tailwind.config.ts:52-56` هنوز `"2xs": "none", xs: "none", sm: "none", DEFAULT: "none", md: "none"`؛ مصرف فعلی در tsx: `shadow-xs` ۸۷، `shadow-sm` ۶۹، `shadow-md` ۳۴، `shadow-2xs` ۱۹ (جمع ۲۰۹). |
| ۱۶ | «مقیاس UI» روی متن px اثر ندارد | OPEN | `lib/uiScale.ts:33` و `:41` فقط `root.style.fontSize` را ست می‌کنند (کامنت `:4-5`). متن‌های ثابت باقی‌اند: `text-[11px]` ۲۹۲، `text-[10px]` ۲۲۴، `text-[9px]` ۴۲ (tsx). |
| ۱۷ | CSS موازی و `!important` | OPEN | شمارش فعلی: `components/knowledge/LessonCardLayout.css` ۷۸ مورد `!important` (فایل ۱۳۵ خطی)، `index.css` ۵۱ مورد (مثل `:1716-1719` خنثی‌سازی gradient/backdrop-blur)، `GardenView.css` ۲، `AngelCompanion.css` ۱؛ فایل‌های موازی `pages/GardenView.css`، `pages/DailyDiaryView.css`، `components/island/island.css`، `components/AngelCompanion.css` هنوز موجودند. |
| ۱۸ | TaskDetail ۱۹۴۳ خطی و mega-fileها | OPEN | اندازهٔ فعلی: `components/TaskDetail.tsx` ۱۹۴۳ خط، `components/review/KnowledgeMindMapView.tsx` ۲۶۲۲، `pages/TasksView.tsx` ۱۴۳۳، `pages/LifeArchitectView.tsx` ۱۳۰۷، `pages/NotesView.tsx` ۱۲۸۸، `pages/SettingsView.tsx` ۹۶۱. هیچ شکستی رخ نداده (این فایل‌ها unmodified هستند). |
| ۱۹ | تب «عمومی» تنظیمات: ۷ بخش + کارت ۳۳۰ خطی | OPEN | `pages/SettingsView.tsx:723` `TabsList … grid grid-cols-3 sm:grid-cols-6`؛ `:743-780` هنوز `LanguageSwitcher`، `CrisisSupportSettings`، کارت معمار زندگی، `AppearanceSettingsSection`، `SidebarQuickLinksSettings`، `MobileBottomBarSettings`، `CompanionSettings`؛ `AppUpdateCard` هنوز داخل همان فایل (`:70` تعریف، `:934` رندر). جستجوی درون‌تنظیمات وجود ندارد (grep تنها `useSearchParams` را نشان می‌دهد). |
| ۲۰ | ۵۹۶ خط UI برای چیدمان ریل | NEEDS-OWNER-DECISION | `pages/settings/SidebarQuickLinksSettings.tsx` هنوز ۵۹۶ خط: پریست‌های عرض `:360-389`، دو فهرست جدا + درگ `:444-468`، شماره‌گذاری `:212` و `:578` `#{orderIndex}`، جستجو `:487`، کاتالوگ `max-h-[360px]` `:538`. |
| ۲۱ | نگاشت آیکن ریل ناهم‌خوان | OPEN | `SidebarQuickLinksSettings.tsx:81-109` هنوز آیکن برای مسیرهای غیرمجاز `/app/buckets` `:90`، `/app/planning` `:91`، `/app/habits` `:98`، `/app/abc` `:104` دارد؛ در برابر `lib/sidebarQuickLinks.ts:25-60` که `/app/interactive-study` (`:47`) را مجاز می‌داند ولی در نگاشت نیست، پس `:139` `QUICK_LINK_ICONS[item.url] || LayoutGrid` آیکن پیش‌فرض می‌دهد. |
| ۲۲ | صفحه/کامپوننت‌های مرده | OPEN (کاهش‌یافته) | حذف‌شده‌ها: `pages/IslandView.tsx`، `components/CognitiveLoadCard.tsx`، `HourlyStoryCard.tsx`، `ProcrastinationBusterModal.tsx`، `island/IslandMiniCard.tsx`، `island/IslandUnlockCelebration.tsx` (همه GONE). باقی‌مانده‌های بی‌ارجاع: `components/bottom-bar/WindowsFluentBar.tsx` (۳۰۶ خط)، `FoldableAdaptiveBar.tsx` (۲۰۹)، `DesktopFloatingDock.tsx` (۱۵۳) — تنها ارجاع‌دهنده `bottom-bar/AdaptiveNavigation.test.tsx:5-6` است؛ `components/island/IslandAlbum.tsx` هم دیگر هیچ‌جا import نمی‌شود. `BottomTabBar.tsx:110-123` فقط `MobileBottomBar` را رندر می‌کند ولی `:78` هنوز `lov:toggle-dock` را dispatch می‌کند که شنوندهٔ mount‌شده ندارد. |
| ۲۳ | آرایهٔ مردهٔ تب‌ها + تضاد Alt+5 | PARTIAL | آرایهٔ `tabs` و Alt+5 حذف شدند: `BottomTabBar.tsx:46-80` فقط `1..4, n, m, d`؛ کامنت `:33` «Alt+1..4, Alt+N, Alt+M, Alt+D»؛ `useMemo` صرفاً از `useMobileBottomTabs` تغذیه می‌شود (`:90-96`). اما میان‌برها هنوز مستند نشده‌اند: `KeyboardShortcutsDialog.tsx:6-13` فقط ⌘K/⌘N/⌘Z/?/Enter/Esc را فهرست می‌کند. |
| ۲۴ | صفحهٔ «اشتراک‌شده‌ها» بدون نقطهٔ ورود | OPEN | مسیر: `App.tsx:386` `<Route path="shared" element={<SharedWithMeView />} />`؛ grep سراسری فقط `App.tsx` و دو فایل تست را نشان می‌دهد. برچسب بی‌استفاده: `SidebarNavSections.tsx:62` `"اشتراک‌ها": "Shared with me"` (در `SECTIONS` هیچ آیتمی با این برچسب نیست). |
| ۲۵ | ناهم‌گونی واژگان | OPEN | «یادداشت‌ها» `lib/mobileBottomBarSettings.ts:48` vs «نوت‌ها» `SidebarNavSections.tsx:135`؛ «صندوق» `mobileBottomBarSettings.ts:83` vs «صندوق ورودی» `SidebarNavSections.tsx:175`؛ «فولدرها» `AppSidebar.tsx:399` vs «پوشه» `task-detail/TaskMetaBar.tsx:144` و «پوشهٔ تازه» `:156`. |
| ۲۶ | Planning نازک + تنظیمات تکراری | OPEN | `pages/PlanningView.tsx:63-72` هنوز پاپ‌اور تنظیمات زمان دارد (بدون اشاره به محل دیگر)، و همان تنظیمات در `pages/SettingsView.tsx:791-792` (`TimeHorizonSettings`، `TimeBucketsSettings`) هست. اسکلت بارگذاری `:74-75` تنها بهبود جانبی است. |
| ۲۷ | تراکم چیپ‌های «افزودن سریع» + شیت ۸۸vh | OPEN | `QuickAddTask.tsx:629,668,715,763` هر چهار چیپ `px-2.5 py-1 … text-[11px]` (≈۲۴px)؛ شیت تاریخ `:640` `max-h-[88dvh]`؛ نوار چسبان با چیپ‌های اضافی: `TasksView.tsx:1094-1118` (تکمیل‌شده + فیلتر). |
| ۲۸ | کنترل «تسک‌های تکمیل‌شده» در سه جا | OPEN | `TasksView.tsx:1096-1106` دکمهٔ هدر؛ `TaskFilterSheet.tsx:630-643` بخش ۹ شیت فیلتر؛ `SettingsView.tsx:784` `CompletedTasksSettings`. (هر سه همان state را ست می‌کنند: `TasksView.tsx:1087` و `:1112`.) |
| ۲۹ | کنش‌های پنهان روی ردیف تسک | OPEN | `TaskListItem.tsx:155` long-press، `:186-189` right-click، `:190-194` ContextMenu/Shift+F10، `:277-280` `onDoubleClick` = تکمیل، `:214-217` `SwipeableRow`. هیچ دکمهٔ «…» دائمی و هیچ هینت `title` برای این کنش‌ها وجود ندارد. |
| ۳۰ | z-index افراطی | OPEN | `components/SelectionActionToolbar.tsx:201` `className="fixed z-[2147483646] …"` و `:218` `className="… z-[2147483647]"`. |
| ۳۱ | رنگ hex + کلاس‌های فیزیکی | OPEN | `pages/settings/MobileBottomBarSettings.tsx:182` هنوز `… text-right select-none` در بلوکی که `dir` را از `isEn` می‌گیرد؛ شمارش فعلی: hex در tsx ۱۵۲، hex در css ۱۷؛ `left-/right-` ۸۸، `text-left/right` ۳۹، `ml-/mr-` ۱۳. |
| ۳۲ | نوار «افزودن سریع» چسبان تکراری | OPEN | `TodayDashboardView.tsx:691` و `TasksView.tsx:1059` هر دو `className="sticky top-0 z-20 py-1.5 -mx-1 px-1 mb-2" style={{ background: "var(--page-surface, hsl(var(--background)))" }}`. |
| ۳۳ | `App.css` بدون import | FIXED | فایل حذف شده است (`git status`: `D frontend/src/App.css`؛ `Test-Path` = GONE). |
| ۳۴ | `.paper-row`/`.paper-chip` بی‌استفاده | OPEN | `index.css:1754-1757` تعریف‌ها باقی‌اند (`.paper-row { min-height: var(--row-h); }` و `@media (pointer: coarse) … 2.5rem`) ولی grep در `*.tsx` صفر مورد است. |
| ۳۵ | تکیه بر ایموجی به‌جای آیکن | OPEN | `pages/tasks/TasksHeader.tsx:106-115` (`📋`, `🎯`, `🧱`, `⏳`)؛ `TaskFilterSheet.tsx:347,401,412,464` و `:585-589` (`📥 🎯 ⚪ 🔥 🔴 🟡 🔵 ⚪`). |
| ۳۶ | تکرار «کار بعدی» در سه سطح | OPEN | `TodayDashboardView.tsx:591-599` چیپ سرصفحه، `TaskListItem.tsx:348-351` نشان ردیف، `TaskActionSheet.tsx:443-450` ردیف شیت. |

---

## (ب) شمارش دقیق وضعیت‌ها

| وضعیت | تعداد | شناسه‌ها |
|---|---|---|
| FIXED | ۴ | ۲، ۳، ۶، ۳۳ |
| PARTIAL | ۷ | ۸، ۹، ۱۰، ۱۱، ۱۳، ۱۴، ۲۳ |
| OPEN | ۲۲ | ۴، ۵، ۷، ۱۲، ۱۶، ۱۷، ۱۸، ۱۹، ۲۱، ۲۲، ۲۴، ۲۵، ۲۶، ۲۷، ۲۸، ۲۹، ۳۰، ۳۱، ۳۲، ۳۴، ۳۵، ۳۶ |
| NEEDS-OWNER-DECISION | ۳ | ۱، ۱۵، ۲۰ |
| **جمع** | **۳۶** | — |

از ۳ P0: یک مورد FIXED (۲)، یک FIXED (۳)، یک مورد NEEDS-OWNER-DECISION (۱).
از ۱۴ P1: ۱ FIXED (۶)، ۶ PARTIAL (۸، ۹، ۱۰، ۱۱، ۱۳، ۱۴)، ۶ OPEN (۴، ۵، ۷، ۱۲، ۱۶، ۱۷)، ۱ مالک (۱۵).

---

## (ج) کارهای باقی‌ماندهٔ قابل انجام (OPEN/PARTIAL به ترتیب اولویت)

> ستون «ظاهر»: آیا اصلاح کمینه ظاهر را تغییر می‌دهد؟ (قید مالک: باید حتی‌الامکان `false` بماند.)
> مبنای قید مالک (`plan/plan.md:58-59`): «بدون بازطراحی: همان رنگ‌ها، فونت‌ها، تم روشن/تاریک، آیکون‌ها، کارت‌ها و چیدمان» + «فقط کنترل‌های خواسته‌شده حذف می‌شوند، **انتخابگرهای تکراری یکی می‌شوند** و **چیدمان‌های شکسته با همان اجزای موجود درست می‌شوند**». پس یکی‌کردن کنترل‌های تکراری (#۸) و درست‌کردن چیدمان شکسته (#۷، #۱۰) صریحاً مجاز است و «بازطراحی» نیست.

### P1 — باگ/دسترس‌پذیری (کم‌ریسک، بدون تغییر ظاهر)

1. **#۷ دکمهٔ مردهٔ دوپنله در ۶۰۰–۶۳۹px** — اصلاح: آستانهٔ رندر در `TodayDashboardView.tsx:83` از ۶۰۰ به ۶۴۰ (یا افزودن `title` توضیحی مثل `TasksView.tsx:1230`). ریسک: کم. ظاهر: `false` برای ≥۶۴۰ (فقط حذف دکمهٔ بی‌اثر در بازهٔ ۶۰۰–۶۳۹).
2. **#۵ دو ورودی پالت با مقصد ریدایرکت‌شده** — اصلاح: حذف یا تصحیح مقصد دو ردیف `CommandPalette.tsx:36` و `:43` (`/app/today` و `/app/thoughts?mode=short`). ریسک: کم. ظاهر: `false` (فقط دو ردیف پالت).
3. **#۱۳ (بخش TasksView) فلاش حالت خالی** — اصلاح: افزودن `isReady` به destructure در `TasksView.tsx:128-137` و `const isEmpty = isReady && (…)` در `:1132`. ریسک: کم. ظاهر: `false`.
4. **#۱۴ (بخش EmptyState)** — اصلاح: استفادهٔ مشترک از `<EmptyState>` در ۵ صفحهٔ اصلی (import فقط). ریسک: کم. ظاهر: `false` (فقط صفحه‌های خالی فعلی).
5. **#۲۳ (بخش مستندسازی)** — اصلاح: افزودن Alt+1..4/N/M/D به آرایهٔ `SHORTCUTS` در `KeyboardShortcutsDialog.tsx:6-13`. ریسک: کم. ظاهر: `false` (افزودن ردیف متنی در دیالوگ موجود).

### P1 — ساختاری (کد-محور، بدون تغییر ظاهر)

6. **#۱۷ حذف `!important`های ضدتم** — اصلاح گام‌به‌گام: در `index.css:1250-1264` و `LessonCardLayout.css:121-122` رنگ‌های هاردکد با `hsl(var(--primary))`/`var(--destructive)` عوض شوند و `!important` برداشته شود. ریسک: متوسط (نیاز به تست بصری دو صفحه). ظاهر: هدف `false` (مقادیر توکن معادل انتخاب شود)؛ انحراف رنگ محتمل است.
7. **#۱۶ مقیاس UI** — اصلاح کمینه: افزودن هشدار در بخش ظاهر تنظیمات که بزرگ‌نمایی روی برچسب‌های ریز اثر محدود دارد (متن ثابت)، یا مهاجرت تدریجی `text-[10px]/[11px]` به دو توکن rem. ریسک: کم برای هشدار، متوسط برای مهاجرت. ظاهر: `false` برای هشدار.
8. **#۴ منبع واحد ناوبری** — اصلاح: تولید فهرست پالت و ریل از `SECTIONS`/`NAV_ITEMS` (`SidebarNavSections.tsx:206`) با حفظ دقیق همان برچسب‌ها/آیکن‌های فعلی. ریسک: متوسط. ظاهر: `false` اگر برچسب‌ها یک‌به‌یک حفظ شوند.
9. **#۱۲ چگالی چیپ‌های ردیف تسک** — اصلاح کمینه: پنهان‌کردن دو چیپ کم‌اهمیت در `<sm` (نشان منبع `TaskListItem.tsx:396-411` و چیپ نتیجه `:463-475`) بدون افزودن UI جدید. ریسک: کم. ظاهر: `true` جزئی (فقط موبایل، حذف دو چیپ).
10. **#۹ (بخش باقی‌مانده) ردیف‌های شیت اکشن** — اصلاح: دسته‌بندی ۹ ردیف باقی‌مانده زیر دو تیتر کوچک و تبدیل گرید بالا به `grid-cols-3` وقتی `sharing` خاموش است (`TaskActionSheet.tsx:403,411`). ریسک: کم. ظاهر: `true` جزئی (تیتر گروه + تقارن گرید).
11. **#۸ (بخش باقی‌مانده) سوییچ نما** — اصلاح: افزودن گزینهٔ `kanban-columns` به `ListViewSwitch.tsx:11-13` و حذف شرط بی‌اثر `:19` (یا `allowKanban` کافی است). ریسک: کم. ظاهر: `true` جزئی (یک دکمهٔ چهارم در سوییچ هدر).
12. **#۱۰ (بخش باقی‌مانده) هدف لمسی کاشی‌ها** — اصلاح: `h-9`→`min-h-11` در `MetaTile.tsx:28` یا افزودن `after:-inset-1` مشابه `TAP_HALO`. ریسک: کم. ظاهر: `true` جزئی (ارتفاع نوار متادیتا).
13. **#۱۱ (بخش باقی‌مانده) هدف لمسی ۴۴px** — اصلاح: `before:-inset-2.5`→`before:-inset-3` برای چهار کنترل ۲۰px (نه چیپ‌ها). ریسک: متوسط (همپوشانی هدف‌های مجاور؛ تست دستی لازم). ظاهر: `false` (شبه‌عنصر نامرئی).

### P2 — پاک‌سازی و یکدست‌سازی

14. **#۲۲ حذف کد مردهٔ باقی‌مانده** — اصلاح: حذف `WindowsFluentBar.tsx`، `FoldableAdaptiveBar.tsx`، `DesktopFloatingDock.tsx`، `AdaptiveNavigation.test.tsx`، `island/IslandAlbum.tsx` و dispatch بی‌شنوندهٔ `BottomTabBar.tsx:78`. ریسک: کم. ظاهر: `false`.
15. **#۳۴ کلاس‌های بی‌استفاده** — اصلاح: حذف `index.css:1754-1757` یا وصل‌کردن `.paper-chip` به چیپ‌های تسک. ریسک: کم. ظاهر: `false` برای حذف، `true` جزئی برای وصل‌کردن.
16. **#۱۹ جداکردن `AppUpdateCard`** — اصلاح: انتقال بلوک `SettingsView.tsx:70-402` به فایل مستقل (صرفاً جابه‌جایی کد، ترتیب تب‌ها ثابت). ریسک: کم. ظاهر: `false`.
17. **#۲۱ یکدست‌کردن نگاشت آیکن** — اصلاح: انتقال آیکن به `lib/sidebarQuickLinks.ts` (`SIDEBAR_QUICK_LINK_OPTIONS`) و حذف `QUICK_LINK_ICONS` (`SidebarQuickLinksSettings.tsx:81-109`)؛ تعیین آیکن برای `/app/interactive-study`. ریسک: کم. ظاهر: `true` جزئی (آیکن درست برای یک آیتم ریل).
18. **#۲۸ کنترل تکراری تکمیل‌شده** — اصلاح کمینه: افزودن یک خط اشاره در شیت فیلتر (`TaskFilterSheet.tsx:630-643`) که همین تنظیم در «تنظیمات → تسک‌ها» هم هست (بدون حذف هیچ کنترلی). ریسک: کم. ظاهر: `true` جزئی (یک خط متن).
19. **#۲۶ تنظیمات تکراری Planning** — اصلاح کمینه: افزودن متن کوتاه اشاره در پاپ‌اور `PlanningView.tsx:63-72` (بدون حذف دکمه). ریسک: کم. ظاهر: `true` جزئی (یک خط متن).
20. **#۲۹ کنش پنهان دوبار-کلیک** — اصلاح: حذف `onDoubleClick` در `TaskListItem.tsx:277-280` (رفتار، بدون UI جدید) و افزودن `title` راهنما روی ردیف. ریسک: کم. ظاهر: `false`.
21. **#۲۴ نقطهٔ ورود «اشتراک‌شده‌ها»** — اصلاح: استفاده از برچسب موجود `SidebarNavSections.tsx:62` به‌عنوان یک آیتم در بخش «خودِ من» (مقصد `/app/shared`). ریسک: کم. ظاهر: `true` جزئی (یک ردیف سایدبار).
22. **#۲۵ یکدست‌سازی واژگان** — اصلاح: مبنا = برچسب سایدبار؛ «نوت‌ها»→«یادداشت‌ها» یا برعکس در `mobileBottomBarSettings.ts:48,83` و `AppSidebar.tsx:399,425` هماهنگ شود. ریسک: کم. ظاهر: `true` جزئی (متن).
23. **#۳۰ z-index افراطی** — اصلاح: `z-[2147483646]`→`z-50` و `z-[2147483647]`→`z-[60]` در `SelectionActionToolbar.tsx:201,218`. ریسک: متوسط (لایه‌بندی؛ تست باز بودن شیت/توست). ظاهر: `false` در حالت عادی.
24. **#۲۷ چیپ‌های افزودن سریع** — اصلاح کمینه: `py-1`→`py-1.5`/`min-h-9` روی چهار چیپ `QuickAddTask.tsx:629,668,715,763` (بدون انتقال چیپ‌ها به منو). ریسک: کم. ظاهر: `true` جزئی (ارتفاع چیپ‌ها).
25. **#۱۸ شکستن mega-fileها** — اصلاح: فقط استخراج بلوک‌های مستقل (`TaskDetail.tsx` expandables، `KnowledgeMindMapView.tsx`) با حفظ ترتیب رندر. ریسک: متوسط. ظاهر: `false`.
26. **#۳۱ کلاس‌های فیزیکی/رنگ hex** — اصلاح: `text-right`→`text-end` در `MobileBottomBarSettings.tsx:182` و جایگزینی تدریجی hexهای پرتکرار با توکن. ریسک: کم. ظاهر: `true` جزئی (اصلاح تراز در EN).

### P3 — پولیش

27. **#۳۲ نوار چسبان تکراری** — اصلاح: کامپوننت مشترک `StickyQuickAdd` با کلاس `.page-surface` در `index.css` و استفاده در `TodayDashboardView.tsx:691` و `TasksView.tsx:1059`. ریسک: کم. ظاهر: `false`.
28. **#۳۵ ایموجی در منوها** — اصلاح: جایگزینی ایموجی‌های `TasksHeader.tsx:106-115` و `TaskFilterSheet.tsx:585-589` با آیکن‌های `lucide-react` موجود. ریسک: کم. ظاهر: `true` (آیکن به‌جای ایموجی).
29. **#۳۶ تکرار «کار بعدی»** — اصلاح: هم‌نام‌کردن برچسب ردیف شیت با برچسب ردیف تسک (`TaskActionSheet.tsx:446` ↔ `TaskListItem.tsx:350`) و باقی‌گذاشتن چیپ سرصفحه فقط وقتی `nextTask` ست است (همین حالا برقرار است). ریسک: کم. ظاهر: `true` جزئی (متن).
> **#۳۳ کاری برای انجام ندارد:** فایل حذف شده و grep برای `App\.css` در `frontend/src` صفر مورد برمی‌گرداند.

---

## (د) نیازمند تصمیم مالک

> تصمیم‌های زیر یا تغییر ساختار بصری‌اند (ممنوع طبق `plan/plan.md:58-60`) یا انتخاب محصولی‌اند و بدون نظر مالک قابل اجرا نیستند.

1. **#۱ سرصفحهٔ موبایل اشباع (P0)** — تصمیم لازم: کدام‌یک از چهار کنترل سراسری (رنگ صفحه، جستجو، تم، AI) در موبایل به منوی «…» یا به تنظیمات منتقل شود. **گزینهٔ کمینهٔ غیربازطراحی:** فقط شمارندهٔ «x از y تکمیل‌شده» (`TodayDashboardView.tsx:604-608`) در `<sm` پنهان شود (اطلاع همان در فهرست دیده می‌شود) و دکمهٔ رنگ صفحه با `hidden sm:flex` به ≥sm منتقل شود؛ ساختار سرصفحه و ترتیب دکمه‌ها دست‌نخورده می‌ماند. ظاهر: `true` فقط در موبایل (نه بازطراحی).
2. **#۱۵ سایه‌های خنثی‌شده (P1)** — تصمیم لازم: آیا پلت بودن عمدی است؟ بازگرداندن مقادیر واقعی در `tailwind.config.ts:52-56` روی ۲۰۹ کاربرد اثر می‌گذارد و ظاهر کل اپ را عوض می‌کند (بازطراحی محسوب می‌شود). **گزینهٔ کمینه:** فقط یک توکن (`lg`/`xl` که اکنون به `var(--shadow-float)` نگاشت شده) برای دیالوگ/شیت تقویت شود و `2xs..md` خنثی بمانند. ظاهر: `true` (محدود به لایه‌های شناور).
3. **#۲۰ پیچیدگی ۵۹۶ خطی تنظیمات ریل (P2)** — تصمیم لازم: ادغام «فعال» و «کاتالوگ» یا حذف شماره‌گذاری، یک بازآرایی بصری در تنظیمات است. **گزینهٔ کمینهٔ غیربازطراحی:** فقط حذف برچسب‌های `#{orderIndex}` (`SidebarQuickLinksSettings.tsx:212,578`) و افزودن متن راهنمای کوتاه؛ ساختار دو فهرست حفظ می‌شود. ظاهر: `true` جزئی (حذف شماره‌ها). اگر مالک ساختار فعلی را می‌خواهد، این یافته باید «پذیرفته‌شده» علامت بخورد.

**اقلام خارج از فهرست مالک که ممکن است تصمیم محصولی لازم داشته باشند (اما اصلاح غیربصری دارند):** #۲۴ (افزودن ردیف سایدبار برای «اشتراک‌شده‌ها») و #۲۲ (حذف نوارهای ویندوز/تاشو — اگر مالک رندر آن‌ها را بخواهد، تبدیل به تصمیم مالک می‌شود).
