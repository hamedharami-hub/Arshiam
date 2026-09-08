// Smart Procrastination & CBT Engine
// Psychologically grounded heuristics and CBT reframing for overcoming procrastination.

export type ProcrastinationBarrier =
  | "perfectionism"
  | "overwhelm"
  | "low_energy"
  | "anxiety";

export interface BarrierMeta {
  id: ProcrastinationBarrier;
  titleFa: string;
  titleEn: string;
  taglineFa: string;
  taglineEn: string;
  reframeFa: string;
  reframeEn: string;
  strategyTitleFa: string;
  strategyTitleEn: string;
  quickWinFa: string;
  quickWinEn: string;
  defaultSprintMinutes: number;
}

export const PROCRASTINATION_BARRIERS: Record<ProcrastinationBarrier, BarrierMeta> = {
  perfectionism: {
    id: "perfectionism",
    titleFa: "کمال‌گرایی و وسواس",
    titleEn: "Perfectionism",
    taglineFa: "می‌ترسم خروجی بی‌نقص نباشه یا انرژی زیادی ببره",
    taglineEn: "Fear of not being perfect or taking too much effort",
    reframeFa: "«نسخه اول قرار نیست شاهکار باشه؛ فقط قراره وجود داشته باشه. کار انجام‌شده بهتر از کار بی‌نقص اما خیالیه.»",
    reframeEn: "“The first draft isn't supposed to be a masterpiece; it just needs to exist. Done is better than perfect.”",
    strategyTitleFa: "تکنیک نسخه اولیه ۴۰ درصدی (Good Enough Sprint)",
    strategyTitleEn: "Good Enough 40% Sprint",
    quickWinFa: "تنها یک پاراگراف یا چارچوب سریع و نامرتب بدون قضاوت کردن بنویس.",
    quickWinEn: "Write just one rough paragraph or skeleton without judging it.",
    defaultSprintMinutes: 10,
  },
  overwhelm: {
    id: "overwhelm",
    titleFa: "ابهام و سنگینی کار",
    titleEn: "Overwhelm & Ambiguity",
    taglineFa: "کار خیلی بزرگه یا نمی‌دونم دقیقاً از کجا شروع کنم",
    taglineEn: "Task feels huge or I don't know where to begin",
    reframeFa: "«یک کوه رو نمی‌شه یک‌جا جابجا کرد، اما می‌شه یک سنگ کوچیک از روش برداشت. تمرکز روی فقط یک گام بعدی کافیه.»",
    reframeEn: "“You cannot move a mountain all at once, but you can pick up one stone. Focus solely on the next tiny step.”",
    strategyTitleFa: "تکنیک ریزگام‌های شفاف (Next Physical Action)",
    strategyTitleEn: "Next Physical Action Breakdown",
    quickWinFa: "فقط یک لیست ۳ خطی از خروجی‌های نهایی کار یادداشت کن.",
    quickWinEn: "Jot down a quick 3-bullet list of the final outcome.",
    defaultSprintMinutes: 5,
  },
  low_energy: {
    id: "low_energy",
    titleFa: "بی‌حوصلگی و خستگی",
    titleEn: "Low Energy & Boredom",
    taglineFa: "مود و حوصله ندارم، انرژی بدنم پایینه",
    taglineEn: "No mood, feeling sluggish, brain resisting",
    reframeFa: "«انگیزه قبل از کار نمی‌آید؛ انگیزه فرزند عمل است! اگر فقط ۵ دقیقه آرام شروع کنی، دوپامین جریان پیدا می‌کنه.»",
    reframeEn: "“Motivation doesn't come before action; it is born from action. Start for just 5 minutes gently.”",
    strategyTitleFa: "قرارداد ۵ دقیقه اضطراری (5-Minute Gentle Kickstart)",
    strategyTitleEn: "Emergency 5-Minute Kickstart",
    quickWinFa: "یک لیوان آب خنک بخور، آهنگ ملایم بذار و تایمر ۵ دقیقه رو روشن کن.",
    quickWinEn: "Drink a glass of water, put on soft music, and start a 5-minute timer.",
    defaultSprintMinutes: 5,
  },
  anxiety: {
    id: "anxiety",
    titleFa: "اضطراب و مقاومت ذهنی",
    titleEn: "Anxiety & Dread",
    taglineFa: "فکر کردن به این کار بهم حس استرس یا فرار میده",
    taglineEn: "Thinking about this task makes me uneasy or want to flee",
    reframeFa: "«اضطراب یعنی مغزم می‌خواد ازم مراقبت کنه، اما این کار خطری نداره. بدترین حالت چی می‌تونه باشه؟ من از پسش برمیام.»",
    reframeEn: "“Anxiety is just the brain being overly protective, but this task is safe. Even the worst case is manageable.”",
    strategyTitleFa: "آرام‌سازی + اولین قدم امن (Safe First Step)",
    strategyTitleEn: "Calm Down + Safe First Step",
    quickWinFa: "۳ نفس عمیق شکمی بکش و فقط صفحه یا دفترچه مربوطه رو باز کن.",
    quickWinEn: "Take 3 deep belly breaths and simply open the relevant page or document.",
    defaultSprintMinutes: 5,
  },
};

export interface BusterResult {
  barrier: ProcrastinationBarrier;
  barrierInsight: string;
  cbtReframe: string;
  quickWin: string;
  recommendedMinutes: number;
  steps: { text: string; estMinutes: number }[];
}

// Local smart heuristic categorization when offline or AI not available
export function generateLocalBuster(
  taskTitle: string,
  taskDesc: string = "",
  barrier: ProcrastinationBarrier = "overwhelm"
): BusterResult {
  const meta = PROCRASTINATION_BARRIERS[barrier];
  const combined = `${taskTitle} ${taskDesc}`.toLowerCase();

  // Pattern matchers
  const isWrite = /(نوشتن|نویس|نگارش|تدوین|تایپ|پایان‌?نامه|تز|گزارش|رزومه|نامه|ایمیل|متن|محتوا|write|article|report|thesis|essay)/i.test(combined);
  const isStudy = !isWrite && /(مطالع|کتاب|درس|فصل|جزوه|امتحان|کنکور|پادکست|آموزش|یادگیری|خواند|read|study|book|exam|learn)/i.test(combined);
  const isCode = /(کد|برنامه|باگ|پروژه|ریکت|گیتهاب|دیتابیس|سرور|api|fix|bug|code|dev|git|feature)/i.test(combined);
  const isCall = /(تماس|زنگ|پیام|تلفن|هماهنگ|جلسه|صحبت|پیگیر|فیدبک|call|phone|message|meeting)/i.test(combined);
  const isClean = /(تمیز|مرتب|نظافت|شستن|جارو|اتاق|کمد|وسایل|انباری|clean|organize|tidy)/i.test(combined);
  const isFinance = /(پرداخت|قبض|بانک|بیمه|مالیات|قسط|ثبت‌?نام|فاکتور|واریز|پول|حساب|pay|bill|bank|finance|tax)/i.test(combined);
  const isWorkout = /(ورزش|دویدن|تمرین|باشگاه|پیاده‌?روی|شنا|حرکات|workout|gym|run|exercise)/i.test(combined);

  let steps: { text: string; estMinutes: number }[] = [];

  if (isWrite) {
    if (barrier === "perfectionism") {
      steps = [
        { text: `یک فایل خام باز کن و عنوان «${taskTitle}» را بالای صفحه بنویس.`, estMinutes: 2 },
        { text: "پیش‌نویس اولیه داغون (Shitty First Draft): بدون ویرایش و بدون سانسور، هر چه در ذهن داری را در ۱۰ دقیقه سرازیر کن.", estMinutes: 10 },
        { text: "متن را یک دور بخوان و ۳ تیتر اصلی برای ساختاردهی به آن مشخص کن.", estMinutes: 5 },
      ];
    } else {
      steps = [
        { text: `فایل سند «${taskTitle}» را باز کن و فقط ۳ موضوع یا زیرشاخه اصلی را به صورت بولت بنویس.`, estMinutes: 3 },
        { text: "برای بولت اول، ۲ الی ۳ جمله توضیحی اضافه کن.", estMinutes: 6 },
        { text: "منابع یا ارجاعات اولیه را ذخیره و ذخیره‌سازی اولیه را انجام بده.", estMinutes: 4 },
      ];
    }
  } else if (isStudy) {
    if (barrier === "perfectionism") {
      steps = [
        { text: `کتاب یا منبع «${taskTitle}» را باز کن و فقط فهرست و تیترهای اصلی را در ۵ دقیقه ورق بزن.`, estMinutes: 5 },
        { text: "بدون وسواس برای به خاطر سپردن همه چیز، فقط ۳ صفحه اول را بخوان.", estMinutes: 8 },
        { text: "تنها ۱ ایده یا نکته کلیدی را به زبان ساده در ۲ خط یادداشت کن.", estMinutes: 3 },
      ];
    } else if (barrier === "low_energy") {
      steps = [
        { text: "پشت میز بنشین، یک نوشیدنی آماده کن و فقط صفحه اول منبع را باز کن.", estMinutes: 2 },
        { text: "یک تایمر ۵ دقیقه‌ای بگذار و فقط یک پاراگراف را با صدای آرام بخوان.", estMinutes: 5 },
        { text: "اگر کشش داشتی ۵ دقیقه دیگر ادامه بده؛ در غیر این صورت همین مقدار شروع ثبت شود.", estMinutes: 5 },
      ];
    } else {
      steps = [
        { text: `منبع یا جزوه «${taskTitle}» را جلوی دست بگذار و شماره صفحه‌های هدف را مشخص کن.`, estMinutes: 3 },
        { text: "بخش اول را سریع روزنامه‌وار بخوان و زیر کلمات کلیدی خط بکش.", estMinutes: 10 },
        { text: "یک خلاصه بسیار کوتاه در حد دو جمله یادداشت کن.", estMinutes: 5 },
      ];
    }
  } else if (isCode) {
    if (barrier === "overwhelm") {
      steps = [
        { text: `محیط توسعه و برنچ جدید مربوط به «${taskTitle}» را باز کن.`, estMinutes: 3 },
        { text: "مسیر فایل‌های درگیر و ورودی/خروجی مورد انتظار را در قالب کامنت یادداشت کن.", estMinutes: 5 },
        { text: "یک تابع یا تست ماک بسیار ساده برای فاز اول پیاده کن تا مطمئن شوی همه چیز اجرا می‌شود.", estMinutes: 10 },
      ];
    } else {
      steps = [
        { text: `فایل اصلی مربوط به «${taskTitle}» را باز کن و محل تغییرات را مشخص کن.`, estMinutes: 3 },
        { text: "ساده‌ترین لاجیک یا لاگ آزمایشی را بنویس و خروجی را بررسی کن.", estMinutes: 7 },
        { text: "تغییرات اولیه را کامیت کن تا بار ذهنی شکسته شود.", estMinutes: 5 },
      ];
    }
  } else if (isCall) {
    steps = [
      { text: `شماره تلفن یا آدرس مخاطب «${taskTitle}» را در دسترس قرار بده.`, estMinutes: 1 },
      { text: "در یک برگه، ۳ نکته اصلی که می‌خواهی مطرح کنی را در چند کلمه یادداشت کن.", estMinutes: 3 },
      { text: "تماس را برقرار کن یا پیام اولیه را ارسال کن و پرونده کار را ببند.", estMinutes: 5 },
    ];
  } else if (isClean) {
    steps = [
      { text: "یک کیسه یا جعبه برای وسایل اضافه یا دورریختنی آماده کن.", estMinutes: 2 },
      { text: `تایمر ۱۰ دقیقه‌ای روشن کن و فقط بخش مرکزی «${taskTitle}» را مرتب کن.`, estMinutes: 10 },
      { text: "وسایل تفکیک‌شده را سر جای خود بگذار و دست‌ها را بشوی.", estMinutes: 3 },
    ];
  } else if (isFinance) {
    steps = [
      { text: `رمز پویا یا اطلاعات لازم برای «${taskTitle}» را پیدا کن.`, estMinutes: 3 },
      { text: "سامانه یا درگاه مربوطه را باز کن و مبلغ/اطلاعات را وارد کن.", estMinutes: 4 },
      { text: "رسید پرداخت را اسکرین‌شات بگیر و در آرشیو ذخیره کن.", estMinutes: 2 },
    ];
  } else if (isWorkout) {
    steps = [
      { text: "لباس و کفش ورزشی را بپوش (فقط پوشیدن، بدون تعهد به ورزش سخت).", estMinutes: 3 },
      { text: "یک موزیک انرژی‌بخش بگذار و ۳ دقیقه بدنت را به آرامی گرم کن.", estMinutes: 3 },
      { text: "ست اول یا ۵ دقیقه پیاده‌روی را شروع کن و سرعتت را تنظیم کن.", estMinutes: 5 },
    ];
  } else {
    // General tailored heuristic
    if (barrier === "perfectionism") {
      steps = [
        { text: `ابزار یا صفحه اصلی مربوط به «${taskTitle}» را آماده کن.`, estMinutes: 2 },
        { text: "تنها یک نسخه آزمایشی و سریع (کیفیت ۴۰٪) در ۱۰ دقیقه ایجاد کن.", estMinutes: 10 },
        { text: "نتیجه را مرور کن و یک اصلاح کوچک روش انجام بده.", estMinutes: 5 },
      ];
    } else if (barrier === "low_energy") {
      steps = [
        { text: `محیط کار را برای «${taskTitle}» آماده کن و یک لیوان آب خنک بنوش.`, estMinutes: 2 },
        { text: "یک تایمر ۵ دقیقه‌ای بگذار و فقط ساده‌ترین بخش این کار را انجام بده.", estMinutes: 5 },
        { text: "بعد از ۵ دقیقه تصمیم بگیر که ادامه دهی یا برای نوبت بعد ذخیره شود.", estMinutes: 2 },
      ];
    } else if (barrier === "anxiety") {
      steps = [
        { text: "چند نفس عمیق بکش و بدترین ترسی که از این کار داری را روی کاغذ خط بزن.", estMinutes: 2 },
        { text: `تنها امن‌ترین و بی‌ریسک‌ترین قسمت «${taskTitle}» را در ۵ دقیقه انجام بده.`, estMinutes: 5 },
        { text: "یک علامت تیک برای اولین گام بگذار تا مغز پاداش دوپامین بگیرد.", estMinutes: 1 },
      ];
    } else {
      steps = [
        { text: `محیط و ورودی‌های لازم برای «${taskTitle}» را روی میز یا صفحه بچین.`, estMinutes: 3 },
        { text: "اولین حرکت فیزیکی شفاف و عینی را مشخص کن و در ۷ دقیقه انجامش بده.", estMinutes: 7 },
        { text: "بخش انجام شده را ذخیره کن و مرحله بعدی را مشخص کن.", estMinutes: 4 },
      ];
    }
  }

  return {
    barrier,
    barrierInsight: `دلیل مقاومت شما برای «${taskTitle}» به احتمال زیاد ناشی از «${meta.titleFa}» است. مغز در این شرایط به دنبال حفاظت از انرژی است.`,
    cbtReframe: meta.reframeFa,
    quickWin: meta.quickWinFa,
    recommendedMinutes: meta.defaultSprintMinutes,
    steps,
  };
}

// Build optimized AI prompt with CBT context
export function buildAIBusterPrompt(
  taskTitle: string,
  taskDescription: string = "",
  barrier: ProcrastinationBarrier = "overwhelm"
): string {
  const meta = PROCRASTINATION_BARRIERS[barrier];

  return `شما یک روانشناس متخصص بهره‌وری و شناخت‌درمانی (CBT) هستید.
کاربر برای شروع تسک زیر دچار اهمال‌کاری و سد ذهنی شده است:
عنوان تسک: "${taskTitle}"
توضیحات: "${taskDescription || "ندارد"}"
ریشه سد ذهنی کاربر: ${meta.titleFa} (${meta.taglineFa})

دستورالعمل:
۱. بر اساس تکنیک CBT متناسب با این سد ذهنی، یک بینش کوتاه (barrier_insight) و یک بازسازی شناختی تفکر منفی (cbt_reframe) تولید کن.
۲. یک اقدام فوق‌العاده سریع ۳۰ ثانیه‌ای (quick_win) برای شکستن یخ کار ارائه بده.
۳. این تسک را به ۳ الی ۵ گام واقعی، عینی، شفاف و عملیاتی خرد کن که دقیقاً مرتبط با موضوع "${taskTitle}" باشد. برای هر گام زمان تقریبی تخمینی (est_minutes بین ۲ تا ۱۵ دقیقه) بنویس. گام‌ها نباید جملات تکراری و کلیشه‌ای باشند، بلکه باید مراحل ملموس همین تسک باشند.

پاسخ را دقیقاً و الزاماً در قالب JSON معتبر زیر بازگردان و هیچ متن اضافه یا مقدمه‌ای قبل و بعد از JSON ننویس:
{
  "barrier_insight": "بینش کوتاه روانشناختی درباره این سد ذهنی",
  "cbt_reframe": "جمله بازسازی شناختی رهایی‌بخش برای کاربر",
  "quick_win": "اقدام فیزیکی ۳۰ ثانیه‌ای برای شکستن مقاومت اولیه",
  "recommended_sprint_minutes": 5,
  "steps": [
    { "text": "مرحله اول مشخص و ملموس این تسک", "est_minutes": 3 },
    { "text": "مرحله دوم مشخص و ملموس این تسک", "est_minutes": 7 },
    { "text": "مرحله سوم مشخص و ملموس این تسک", "est_minutes": 10 }
  ]
}`;
}

export function parseAIBusterResponse(
  rawText: string,
  fallback: BusterResult
): BusterResult {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);

    const steps: { text: string; estMinutes: number }[] = [];
    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      for (const item of parsed.steps) {
        if (typeof item === "string" && item.trim()) {
          steps.push({ text: item.trim(), estMinutes: 5 });
        } else if (item && typeof item === "object" && item.text) {
          steps.push({
            text: String(item.text).trim(),
            estMinutes: Number(item.est_minutes) || 5,
          });
        }
      }
    }

    if (steps.length === 0) return fallback;

    return {
      barrier: fallback.barrier,
      barrierInsight: parsed.barrier_insight || fallback.barrierInsight,
      cbtReframe: parsed.cbt_reframe || fallback.cbtReframe,
      quickWin: parsed.quick_win || fallback.quickWin,
      recommendedMinutes: Number(parsed.recommended_sprint_minutes) || fallback.recommendedMinutes,
      steps: steps.slice(0, 5),
    };
  } catch (err) {
    console.warn("[Buster] Failed to parse AI JSON, using smart fallback:", err);
    return fallback;
  }
}
