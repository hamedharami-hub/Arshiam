# تحویل بستهٔ ۰۶ — AI، پاک‌سازی زمان‌بندی قدیمی و پذیرش

شاخه: `codex/planning-phase-zero`

مبنای این بسته: `ad69213`

وضعیت: تغییرات بستهٔ ۰۶ آمادهٔ بازبینی؛ در حساب واقعی هیچ مهاجرت یا write انجام نشد.

## تغییرات

- `TaskAIPanel` پیشنهاد عنوان، گام کوچک و قصد اختیاری «اگر X شد، Y را انجام می‌دهم» را پیش‌نمایش می‌دهد. تا پذیرش کاربر هیچ تغییری ذخیره نمی‌شود؛ اعمال از callback مشترک تغییر تسک می‌گذرد. تاریخ پیشنهادی تنها وقتی نگه داشته می‌شود که متن اصلی تسک همان روز/زمان را صریحاً بیان کند؛ مقدار روز نسبی هنگام ساخت پیشنهاد تثبیت می‌شود تا عبور از نیمه‌شب آن را جابه‌جا نکند. ساعت پیش‌فرض، مهلت یا زمانِ بخشی از روز ساخته نمی‌شود. تکرار فقط با عبارت صریح و rule معتبر پیشنهاد می‌شود و مقدار قبلی در ابهام دست‌نخورده می‌ماند.
- شناسهٔ ایجاد پیشنهاد/زیرتسک‌ها در retry همان قصد ثابت می‌ماند؛ شکست بخشی از ذخیره باعث تکرار مواردی که قبلاً ثبت شده‌اند نمی‌شود.
- reader/writerهای فعال تسک فیلدهای قدیمی time-block، part-of-day/time-of-day و deadline را خنثی یا از پاسخ حذف می‌کنند. backup مهاجرت نسخه‌دار دست‌نخورده باقی می‌ماند. در جست‌وجوی کد، کاربردهای `deadline` در Countdown و Google polling و `timeOfDay` در باغچه، معنای مستقل دارند و حفظ شده‌اند.
- API زمان‌بندی، `work_date` را canonical می‌کند؛ PATCH فراداده زمان را تغییر نمی‌دهد، پاک‌کردن canonical را می‌پذیرد و ورودی ناقص/متناقض یا اختلاف `work_date` و alias قدیمی را 400 می‌کند. اعتبارسنجی priority نیز 400 می‌دهد. اولویت legacy در read/filter به `p1→high`, `p2→medium`, `p3→low`, `p4→none` تبدیل می‌شود؛ `urgent` مستقل می‌ماند. schemaهای OpenAPI هم‌تراز شده‌اند.
- `getTodayTasks` با روز محلی timezone معتبر حساب محاسبه می‌شود؛ بدون timezone معتبر، API روز UTC را حدس نمی‌زند. در Calendar API، `end_at` فقط ورودی اختیاری و request-only برای بازهٔ تعارض است؛ در نبود آن فقط همان لحظهٔ شروع بررسی می‌شود و duration ذخیره نمی‌شود.
- نمایش و overdue برای `schedule_v=2`، مقدار صریح 23:59 را زمان واقعی نگه می‌دارد؛ رفتار legacy جدا می‌ماند. پیش‌نمایش Quick Add نیز نسخهٔ v2 را صریحاً به formatter می‌دهد.

## آزمون‌ها و build

- `npm test -- --run src/components/TaskAIPanel.test.tsx src/components/AIPanel.test.tsx src/lib/nlDate.test.ts src/lib/taskDate.test.ts src/lib/priority.test.ts src/lib/horizonFilters.test.ts src/lib/smartListService.test.ts` در `frontend/` — موفق؛ ۷ فایل، ۴۲ تست.
- `./frontend/node_modules/.bin/vitest run --config frontend/.vitest-api.temp.config.ts api/api.test.ts api/agentApi.test.ts` از ریشه — موفق؛ ۲ فایل، ۳۸ تست. فایل config موقت پس از اجرا حذف شد.
- `npm run typecheck` در `frontend/` — موفق، exit status 0.
- `npm run build` در `frontend/` — موفق، Vite bundle تولید کرد؛ فقط هشدارهای موجود مربوط به اندازهٔ chunk نمایش داده شد.
- `npm test -- --run` در `frontend/` — ۲۳۳ فایل، ۱٬۹۷۵ تست موفق و ۹ شکست در ۲ فایل (`TasksView.folderOverdue.test.tsx` چهار شکست و `TasksView.split.test.tsx` پنج شکست). علت: `useTodayPlanning` با uid تعریف‌نشده برابر‌سازی می‌کند (`undefined === undefined`) و سپس `ownerSnapshot.snapshot` را می‌خواند. Sol این مورد را مستقل بازتولید کرد؛ به درخواست والد، این باگ مستقل در این بسته تغییر داده نشد و برای audit جداگانه ثبت شد.
- `git diff --check` — موفق.
- ریشهٔ مخزن API manifest وابستگی دارد ولی build script مستقل ندارد؛ API مسیرها با تست‌های بالا بررسی شدند.

## بررسی بصری

fixtureها با دادهٔ ساختگی روی Chromium اجرا شدند. برای پنل AI، نسخهٔ مبنا از `ad69213` با همان تسک و پاسخ ساختگی قطعی از endpoint سفارشی اجرا شد؛ هر دو نسخه برای 360/1280، FA/EN و روشن/تاریک ثبت شدند. نسخهٔ فعلی در موبایل عرض کامل 360px و در دسکتاپ پنل 512px داشت و در این 8 حالت overflow نداشت. baseline/current را می‌توان در `/workspace/plan-research/packet06-task-ai-baseline-comparison.png` دید. اسکرین‌شات‌های هر دو نسخه در این مسیرند: `/workspace/plan-research/packet06-task-ai-{baseline,current}-{360,1280}-{fa,en}-{light,dark}.png`.

همچنین نمای Plan با baseline قبلی برای FA/EN، روشن/تاریک و عرض‌های 360/390/1280 مقایسه شد؛ خروجی‌ها خارج از مخزن‌اند:

- `/workspace/plan-research/packet06-current-360-fa-light.png` و `...-360-fa-dark.png`
- `/workspace/plan-research/packet06-current-360-en-light.png` و `...-360-en-dark.png`
- `/workspace/plan-research/packet06-current-390-fa-light.png` و `...-390-fa-dark.png`
- `/workspace/plan-research/packet06-current-390-en-light.png` و `...-390-en-dark.png`
- `/workspace/plan-research/packet06-current-1280-fa-light.png` و `...-1280-fa-dark.png`
- `/workspace/plan-research/packet06-current-1280-en-light.png` و `...-1280-en-dark.png`
- مقایسهٔ baseline/current Plan: `/workspace/plan-research/packet06-comparison-contact.png`

در Plan عرض 390 و 1280 اسکرول افقی دیده نشد. overflow انگلیسی 407px در عرض‌های 360 و 390 با baseline قبلی یکسان است؛ در fixture فعلی فارسی 360 نیز 377px گزارش شد. این overflowهای Plan موجود در بستهٔ ۶ اصلاح نشدند؛ محتوای انگلیسی در تصاویر بریده/جابجا نمی‌شود، ولی صفحه پهن‌تر از viewport است. Vite HMR در مرورگر به websocket محلی وصل نشد و favicon درخواست‌شده 404 بود؛ fixtureها mount شدند و پیشنهاد mock در پنل دیده شد. این پیام‌ها از dev harness بودند، نه خطای render برنامه. تاریخ محتوای Plan fixture با baseline یکسان نیست چون تاریخ آزمایش تغییر کرده است.

## موارد خارج از این بسته

- خطای `useTodayPlanning` با `uid` تهی که باعث ۹ شکست full suite می‌شود، باید جداگانه اصلاح و دوباره آزمون شود.
- overflowهای 360/390 بالا هنوز باقی هستند.
- سناریوهای حساب واقعی یا مهاجرت واقعی اجرا نشدند؛ تست‌ها با دادهٔ ساختگی بودند. زنجیرهٔ کامل E2E برای تمام سناریوهای پذیرش قرارداد در این محیط اجرا نشد.
