import type { SelfCheckDef, B } from "./types";

const b = (fa: string, en: string): B => ({ fa, en });
const it = (fa: string, en: string, reverse = false) => ({ text: b(fa, en), reverse });
const NOTE = b("این خودسنجی کوتاه فقط برای آگاهی شخصی است؛ تشخیص نیست و نسخهٔ استاندارد رسمی هم نیست.", "This short check is for personal awareness only — not a diagnosis and not an official standard instrument.");

// Bands are by percentage of the maximum score, after reversing items so that "higher" always means more of the thing named in the title.
const bands3 = (low: [string, string, string, string], mid: [string, string, string, string], high: [string, string, string, string], m: [string[], string[], string[]]) => [
  { max: 33, label: b(low[0], low[1]), message: b(low[2], low[3]), methods: m[0] },
  { max: 66, label: b(mid[0], mid[1]), message: b(mid[2], mid[3]), methods: m[1] },
  { max: 100, label: b(high[0], high[1]), message: b(high[2], high[3]), methods: m[2] },
];

export const SELF_CHECKS: SelfCheckDef[] = [
  {
    id: "stress", title: b("نشانه‌های استرس", "Stress signals"), intro: NOTE, scale: "frequency", higherIsBetter: false, sensitive: true,
    items: [
      it("احساس می‌کنم کارها از دستم خارج می‌شود.", "I feel things are getting out of my hands."),
      it("بدنم تنش دارد (شانه، گردن، فک، سردرد).", "My body feels tense (shoulders, neck, jaw, headaches)."),
      it("به‌سختی می‌توانم ذهنم را آرام کنم.", "I find it hard to calm my mind."),
      it("زود عصبی یا کلافه می‌شوم.", "I get irritable or snappy quickly."),
      it("می‌توانم به خاطر کارها و فکرها خوب بخوابم.", "I sleep well despite my tasks and thoughts.", true),
      it("برای استراحت و کارهای دوست‌داشتنی وقت نمی‌کنم.", "I don't make time for rest or things I enjoy."),
    ],
    bands: bands3(
      ["کم", "Low", "نشانه‌های استرس در حد کم است. اگر زمان خوبی است، روتین‌هایی که کمکت کرده را نگه دار.", "Stress signals look low. Keep the routines that are helping."],
      ["متوسط", "Moderate", "چند نشانه فشار دیده می‌شود. یک تخلیهٔ ذهن و چند دقیقه آرام‌سازی به کاهش آن کمک می‌کند.", "Several signs of strain. A brain dump and a few minutes of relaxation can help."],
      ["بالا", "High", "نشانه‌های فشار بالاست. به خودت فضا بده، از یک نفر مورد اعتماد کمک بگیر و اگر ادامه دارد، با متخصص صحبت کن.", "Strain looks high. Give yourself room, lean on someone you trust, and talk to a professional if it persists."],
      [["weekly-review"], ["brain-dump", "progressive-relaxation", "priority-matrix"], ["grounding", "brain-dump", "set-boundary", "progressive-relaxation"]],
    ),
  },
  {
    id: "procrastination", title: b("اهمال‌کاری", "Procrastination"), intro: NOTE, scale: "frequency", higherIsBetter: false,
    items: [
      it("کارهای مهم را تا آخرین لحظه می‌اندازم.", "I leave important tasks until the last minute."),
      it("می‌دانم باید شروع کنم ولی سرم را با چیز دیگری گرم می‌کنم.", "I know I should start but busy myself with something else."),
      it("وقتی کاری بزرگ است، منجمد می‌شوم.", "When a task is big, I freeze."),
      it("به خاطر عقب انداختن از خودم انتقاد می‌کنم.", "I criticise myself for putting things off."),
      it("کارها را به‌موقع شروع می‌کنم.", "I start tasks on time.", true),
    ],
    bands: bands3(
      ["کم", "Low", "اهمال‌کاری مشکل بزرگی برایت نیست.", "Procrastination isn't a big issue for you."],
      ["متوسط", "Moderate", "گاهی گیر می‌کنی. قدم‌های مانند ۵ دقیقه شروع خیلی کمک می‌کنند.", "Sometimes you get stuck. Tiny starts like a 5-minute step help a lot."],
      ["بالا", "High", "اهمال‌کاری در زندگی‌ات جا باز کرده. در این مسیر مهربانی با خود مهم‌تر از سرزنش است.", "Procrastination takes up real space. Kindness to yourself works better than scolding."],
      [["tiny-habit"], ["five-min-step", "two-minute", "start-ritual"], ["five-min-step", "self-compassion", "small-steps", "pomodoro-focus"]],
    ),
  },
  {
    id: "self-esteem", title: b("ازش‌گذاری به خود", "Self-worth"), intro: NOTE, scale: "agree", higherIsBetter: true, sensitive: true,
    items: [
      it("به‌طور کلی از خودم راضیم.", "Overall, I am satisfied with myself."),
      it("فکر می‌کنم نقاط قوت خوبی دارم.", "I think I have good qualities."),
      it("گاهی فکر می‌کنم اصلاً به درد نمی‌خورم.", "At times I feel I am no good at all.", true),
      it("به اشتباهاتم همان‌قدر مهربان نگاه می‌کنم که به اشتباه یک دوست.", "I treat my mistakes as kindly as a friend's."),
      it("خودم را با دیگران مقایسه می‌کنم و کم‌ارزش می‌شمارم.", "I compare myself to others and come up short.", true),
    ],
    bands: bands3(
      ["کم‌تر", "Lower", "الان دیدت نسبت به خود سخت‌گیرانه است. این قابل تغییر است؛ مهربانی با خود از این‌جا شروع می‌شود.", "You may be hard on yourself right now. It can change — self-compassion is a good place to start."],
      ["متوسط", "Mixed", "ترکیبی از اطمینان و تردید داری؛ طبیعی است. شناسایی خطاهای فکری کمک می‌کند.", "A mix of confidence and doubt — normal. Spotting thinking traps helps."],
      ["بالاتر", "Higher", "نگاه مهربان‌تری به خودت داری. با ارزش‌هایت آن را محکم‌تر کن.", "You hold a fairly kind view of yourself. Strengthen it by living your values."],
      [["self-compassion", "thinking-traps", "values-compass"], ["thinking-traps", "self-compassion"], ["values-compass"]],
    ),
  },
  {
    id: "loneliness", title: b("احساس تنهایی", "Feeling lonely"), intro: NOTE, scale: "frequency", higherIsBetter: false, sensitive: true,
    items: [
      it("احساس می‌کنم کسی را ندارم که با او درددل کنم.", "I feel I have no one to open up to."),
      it("با اینکه آدم‌ها اطرافم هستند، احساس جدابودن می‌کنم.", "I feel apart even when people are around."),
      it("احساس می‌کنم کسی واقعاً مرا نمی‌شناسد.", "I feel nobody really knows me."),
      it("از ارتباط‌هایم حمایت و نزدیکی می‌گیرم.", "I get support and closeness from my connections.", true),
      it("می‌توانم وقتی لازم دارم به کسی زنگ بزنم.", "I can reach out to someone when I need to.", true),
    ],
    bands: bands3(
      ["کم", "Low", "احساس تنهایی کم است. ارتباط‌هایت را قدر بدان.", "Loneliness looks low. Value your connections."],
      ["متوسط", "Moderate", "گاهی دلتنگی داری. یک پیام کوچک به یک نفر شروع خوبی است.", "You sometimes feel disconnected. A small message to one person is a good start."],
      ["بالا", "High", "تنهایی پررنگ است. این احساس بسیار انسانی است؛ اگر سنگین است با یک فرد مورد اعتماد یا متخصص صحبت کن.", "Loneliness is strong. This is deeply human; if it feels heavy, talk to someone you trust or a professional."],
      [["reach-out"], ["reach-out", "behavioral-activation"], ["reach-out", "self-compassion", "behavioral-activation"]],
    ),
  },
  {
    id: "sleep-quality", title: b("کیفیت خواب", "Sleep quality"), intro: NOTE, scale: "frequency", higherIsBetter: false,
    items: [
      it("به خواب رفتنم بیش از ۳۰ دقیقه طول می‌کشد.", "Falling asleep takes me over 30 minutes."),
      it("شب بیدار می‌شوم و دوباره به خواب نمی‌روم.", "I wake at night and struggle to get back to sleep."),
      it("صبح با احساس خستگی بیدار می‌شوم.", "I wake up feeling tired."),
      it("ساعت خواب و بیداری‌ام منظم است.", "My sleep and wake times are regular.", true),
      it("قبل از خواب مدت طولانی صفحه نگاه می‌کنم.", "I look at a screen for long before bed."),
    ],
    bands: bands3(
      ["خوب", "Good", "خوابت به نظر خوب می‌آید.", "Your sleep looks good."],
      ["متوسط", "Mixed", "چند نشانهٔ خواب ناآرام هست. بهداشت خواب و روتین شب کمک می‌کنند.", "Some signs of restless sleep. Sleep habits and a wind-down routine can help."],
      ["ضعیف", "Poor", "خوابت آسیب دیده. اگر چند هفته ادامه داشت، با پزشک مشورت کن.", "Your sleep is struggling. If it lasts several weeks, consult a doctor."],
      [["sleep-hygiene"], ["sleep-hygiene", "wind-down"], ["sleep-hygiene", "wind-down", "progressive-relaxation", "worry-time"]],
    ),
  },
  {
    id: "decision-style", title: b("سبک تصمیم‌گیری: تردید و کمال‌گرایی", "Decision style: doubt & perfectionism"), intro: NOTE, scale: "agree", higherIsBetter: false,
    items: [
      it("برای انتخاب یک گزینه مدت‌ها فکر می‌کنم.", "I think for a long time before choosing."),
      it("بعد از تصمیم هم می‌ترسم گزینهٔ دیگر بهتر بود.", "After deciding I worry another option was better."),
      it("می‌خواهم قبل از انتخاب، همهٔ اطلاعات را داشته باشم.", "I want all the information before I choose."),
      it("با راه‌حلی «خوب و کافی» هم راضی می‌شوم.", "I can be happy with a \"good enough\" choice.", true),
      it("از نظر دیگران دربارهٔ تصمیمم می‌ترسم.", "I fear what others will think of my choice."),
    ],
    bands: bands3(
      ["قاطع", "Decisive", "معمولاً قاطع تصمیم می‌گیری. برای تصمیم‌های بزرگ یک مثلث ارزش‌ها را هم نگاه کن.", "You usually decide firmly. For big choices, check them against your values too."],
      ["متعادل", "Balanced", "گاهی تردید داری؛ ماتریس تصمیم و سه سناریو کمک می‌کنند.", "You sometimes hesitate; a decision matrix and three scenarios help."],
      ["تردیدمیل", "Hesitant", "تردید و کمال‌گرایی تصمیم را سنگین می‌کند. مهلت مشخص و معیار روشن می‌گذاریم.", "Doubt and perfectionism make decisions heavy. Set a time limit and clear criteria."],
      [["values-compass"], ["decision-matrix", "scenarios"], ["decision-matrix", "scenarios", "self-compassion", "five-min-step"]],
    ),
  },
  {
    id: "planning-habits", title: b("عادت‌های برنامه‌ریزی", "Planning habits"), intro: NOTE, scale: "frequency", higherIsBetter: true,
    items: [
      it("برای هر روز چند اولویت مشخص دارم.", "I set a few clear priorities for each day."),
      it("کارها را به قدم‌های کوچک تقسیم می‌کنم.", "I break tasks into small steps."),
      it("هر هفته به برنامه و پیشرفت نگاه می‌کنم.", "I review my plan and progress weekly."),
      it("برای استراحت و کارهای غیرمنتظره جا می‌گذارم.", "I leave room for rest and surprises."),
      it("برنامه‌هایم را در یک جای مشخص ثبت می‌کنم.", "I record my plans in one place."),
    ],
    bands: bands3(
      ["کم‌نظم", "Loose", "برنامه‌ریزی هنوز جای رشد دارد؛ از خالی‌کردن ذهن شروع کن.", "Planning has room to grow; start with a brain dump."],
      ["در حال رشد", "Growing", "کار خوبی می‌کنی؛ بازبینی هفتگی و جعبه‌بندی زمان بهترش می‌کند.", "You're doing fine; weekly review and time-boxing can sharpen it."],
      ["منظم", "Organised", "عادت‌های برنامه‌ریزی تو قوی است. مراقب استراحت هم باش.", "Your planning habits are strong. Protect your rest time too."],
      [["brain-dump", "priority-matrix", "small-steps"], ["weekly-review", "time-boxing"], ["weekly-review"]],
    ),
  },
  {
    id: "relationship-satisfaction", title: b("رضایت از روابط", "Relationship satisfaction"), intro: NOTE, scale: "agree", higherIsBetter: true,
    items: [
      it("در رابطه‌های مهمم احساس امنیت می‌کنم.", "I feel safe in my important relationships."),
      it("می‌توانم نیازهایم را می‌گویم.", "I can say what I need."),
      it("بعد از اختلاف، ما با هم درست می‌شویم.", "After a disagreement we make up."),
      it("مرزهایم مورد احترام است.", "My boundaries are respected."),
      it("بعضی روابطم مرا خسته و فرسوده می‌کنند.", "Some of my relationships leave me drained.", true),
    ],
    bands: bands3(
      ["کم‌رضایت", "Low", "از روابطت خیلی راضی نیستی. یک گفت‌وگوی آماده‌شده و یک مرز روشن می‌تواند شروع باشد.", "You're not very satisfied. A prepared conversation and one clear boundary could be a start."],
      ["متوسط", "Mixed", "روابطت ترکیبی از خوب و نه چندان خوب است. جمله‌های «من احساس می‌کنم» کمک می‌کنند.", "Your relationships are a mix. \"I feel\" statements can help."],
      ["راضی", "Satisfied", "از روابطت رضایت خوبی داری. قدرش را بدان.", "You're fairly satisfied. Appreciate it."],
      [["hard-conversation", "set-boundary", "i-statements"], ["i-statements", "set-boundary"], ["reach-out"]],
    ),
  },
  {
    id: "values-clarity", title: b("وضوح ارزش‌ها", "Clarity of values"), intro: NOTE, scale: "agree", higherIsBetter: true,
    items: [
      it("می‌دانم چه چیزهایی در زندگی برایم از همه مهم‌ترند.", "I know what matters most to me."),
      it("روزمره‌هایم تا حد زیادی با ارزش‌هایم هماهنگ است.", "My days largely match my values."),
      it("برای تصمیم‌های بزرگ معیار شخصی دارم.", "I have my own criteria for big decisions."),
      it("گاهی نمی‌دانم از زندگی واقعاً چه می‌خواهم.", "At times I don't know what I really want from life.", true),
      it("بیشتر برای رضایت دیگران زندگی می‌کنم تا خودم.", "I live more for others' approval than my own.", true),
    ],
    bands: bands3(
      ["مبهم", "Unclear", "ارزش‌هایت هنوز روشن نیستند — مشکلی نیست؛ قطب‌نمای ارزش‌ها به تو کمک می‌کند.", "Your values aren't clear yet — that's okay; the values compass can help."],
      ["تا حدی روشن", "Partly clear", "مسیر را تا حدی می‌شناسی؛ رفتارهای هفتگی آن را روشن‌تر می‌کنند.", "You see the direction partly; weekly behaviours make it clearer."],
      ["روشن", "Clear", "ارزش‌هایت برایت روشن است. از آن برای هدف‌گذاری استفاده کن.", "Your values are clear. Use them to set goals."],
      [["values-compass", "expressive-writing"], ["values-compass", "woop"], ["woop"]],
    ),
  },
];

export function getSelfCheck(id?: string | null) {
  return SELF_CHECKS.find((c) => c.id === id);
}

export const FREQ_LABELS: B[] = [b("هرگز", "Never"), b("به‌ندرت", "Rarely"), b("گاهی", "Sometimes"), b("اغلب", "Often"), b("همیشه", "Always")];
export const AGREE_LABELS: B[] = [b("کاملاً مخالف", "Strongly disagree"), b("مخالف", "Disagree"), b("نه مخالف، نه موافق", "Neutral"), b("موافق", "Agree"), b("کاملاً موافق", "Strongly agree")];

/** Percentage 0..100 of "more of what the title names" (items reversed first). For higherIsBetter checks, 100 means best. */
export function scoreSelfCheck(def: SelfCheckDef, answers: number[]): { pct: number; band: SelfCheckDef["bands"][number] } {
  const total = def.items.reduce((s, item, i) => s + (item.reverse ? 4 - (answers[i] ?? 0) : (answers[i] ?? 0)), 0);
  const pct = Math.round((total / (def.items.length * 4)) * 100);
  const band = def.bands.find((x) => pct <= x.max) ?? def.bands[def.bands.length - 1];
  return { pct, band };
}
