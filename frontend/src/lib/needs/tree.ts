import type { NeedsCategory, NeedsTool, B } from "./types";

export const TOOLS: Record<string, NeedsTool> = {
  checkin: { id: "checkin", route: "/app/checkin", title: { fa: "ثبت خلق و انرژی", en: "Mood & energy check-in" }, desc: { fa: "حال امروز را در چند ثانیه ثبت کن", en: "Log how you are today" } },
  calm: { id: "calm", route: "/app/calm", title: { fa: "آرام‌شدن", en: "Calm down" }, desc: { fa: "تنفس و صدای آرام", en: "Breathing and calming sound" } },
  breathing: { id: "breathing", route: "/app/breathing?start=1", title: { fa: "تنفس هدایت‌شده", en: "Guided breathing" }, desc: { fa: "چند دقیقه تنفس با راهنمای دیداری", en: "A few minutes with a visual guide" } },
  sleep: { id: "sleep", route: "/app/sleep", title: { fa: "خواب و صدای آرامش", en: "Sleep sounds" }, desc: { fa: "صدا و تایمر خاموشی", en: "Sounds and a fade-out timer" } },
  thoughts: { id: "thoughts", route: "/app/thoughts", title: { fa: "ثبت و بررسی افکار", en: "Thought record" }, desc: { fa: "فکر را بنویس و با دید دیگری ببین", en: "Write a thought and look at it again" } },
  worry: { id: "worry", route: "/app/worry", title: { fa: "مدیریت نگرانی", en: "Worry tree" }, desc: { fa: "نگرانی قابل‌حل را از غیرقابل‌حل جدا کن", en: "Separate solvable from unsolvable worry" } },
  values: { id: "values", route: "/app/values", title: { fa: "ارزش‌ها و اهداف", en: "Values & goals" }, desc: { fa: "آنچه برایت مهم است را روشن کن", en: "Clarify what matters to you" } },
  architect: { id: "architect", route: "/app/life-architect", title: { fa: "معمار زندگی", en: "Life Architect" }, desc: { fa: "طراحی سامانهٔ زندگی", en: "Design your life system" } },
  self: { id: "self", route: "/app/self", title: { fa: "خودشناسی", en: "Self-knowledge" }, desc: { fa: "شخصیت، نقاط قوت و سبک دلبستگی", en: "Personality, strengths and attachment" } },
  cycle: { id: "cycle", route: "/app/cycle", title: { fa: "چرخهٔ ماهانه", en: "Cycle tracker" }, desc: { fa: "ثبت و الگوی چرخه", en: "Log and see your pattern" } },
  trends: { id: "trends", route: "/app/mind/trends", title: { fa: "روند و سنجش‌ها", en: "Trends & check-ups" }, desc: { fa: "روند حال و پرسشنامه‌ها", en: "Mood trends and questionnaires" } },
  pomodoro: { id: "pomodoro", route: "/app/pomodoro", title: { fa: "پومودورو", en: "Pomodoro" }, desc: { fa: "کار متمرکز در بازه‌های کوتاه", en: "Focused work in short blocks" } },
  diary: { id: "diary", route: "/app/diary", title: { fa: "دفتر خاطرات", en: "Diary" }, desc: { fa: "نوشتن برای سبک‌شدن", en: "Write to feel lighter" } },
  planning: { id: "planning", route: "/app/planning", title: { fa: "برنامه‌ریزی", en: "Planning" }, desc: { fa: "برنامهٔ روز، هفته و ماه", en: "Plan your day, week and month" } },
  knowledge: { id: "knowledge", route: "/app/knowledge", title: { fa: "دانش", en: "Knowledge" }, desc: { fa: "یادگیری و مرور", en: "Learn and review" } },
  kanban: { id: "kanban", route: "/app/kanban", title: { fa: "برد کانبان", en: "Kanban board" }, desc: { fa: "کارها را در ستون‌های مرحله مرتب کن", en: "Move work through stages" } },
  today: { id: "today", route: "/app/today", title: { fa: "امروز", en: "Today" }, desc: { fa: "تسک‌ها و عادت‌های امروز", en: "Today's tasks and habits" } },
};

const q = (fa: string, en: string): B => ({ fa, en });

export const CATEGORIES: NeedsCategory[] = [
  {
    id: "problem", icon: "puzzle",
    title: q("حل مسئله و تصمیم‌گیری", "Problems & decisions"),
    desc: q("تصمیم سخت، گیر کردن، انتخاب بین گزینه‌ها", "Hard choices, feeling stuck"),
    questions: [
      q("اگر این مسئله حل شود، چه چیزی در زندگی‌ات فرق می‌کند؟", "If this were solved, what would be different in your life?"),
      q("تا حالا چه کارهایی را امتحان کرده‌ای و چه نتیجه‌ای داشت؟", "What have you already tried, and what happened?"),
      q("چه مهلت یا فشاری از بیرون وجود دارد؟ چه کسی درگیر است؟", "What outside pressure or people are involved?"),
    ],
    topics: [
      { id: "hard-decision", title: q("تصمیم سخت", "A hard decision"), methods: ["define-problem", "pros-cons", "decision-matrix", "scenarios"], checks: ["decision-style"], tools: ["values", "thoughts", "diary"], question: q("گزینه‌هایی که الان داری کدام‌اند؟", "What options do you have right now?"), keywords: ["تصمیم", "انتخاب", "decision", "choose", "choice"],
        details: [{ id: "two-options", title: q("بین دو گزینه", "Between two options") }, { id: "many-options", title: q("بین چند گزینه", "Between many options") }, { id: "big-life", title: q("تصمیم بزرگ زندگی", "A big life decision") }] },
      { id: "stuck", title: q("گیر کرده‌ام", "I feel stuck"), methods: ["define-problem", "five-whys", "five-min-step", "small-steps"], checks: ["procrastination"], tools: ["thoughts", "worry"], question: q("کدام قسمتش بیشتر از همه گیرت می‌اندازد؟", "Which part stops you the most?"), keywords: ["گیر", "stuck", "بن‌بست", "نمی‌دانم چه کنم"] },
      { id: "break-down", title: q("مسئلهٔ بزرگ را کوچک کنم", "Break a big problem down"), methods: ["small-steps", "five-min-step", "brain-dump", "if-then"], checks: ["planning-habits"], tools: ["planning", "today"], question: q("نتیجهٔ نهایی که می‌خواهی دقیقاً چیست؟", "What exactly is the end result you want?"), keywords: ["بزرگ", "سنگین", "overwhelm", "too big", "break down"] },
      { id: "choose-options", title: q("انتخاب بین چند گزینه", "Choosing between options"), methods: ["decision-matrix", "pros-cons", "scenarios"], checks: ["decision-style"], tools: ["values"], question: q("برای تو مهم‌ترین معیارها (مثلاً هزینه، آرامش، رشد) کدام‌اند؟", "Which criteria matter most (cost, peace, growth…)?"), keywords: ["گزینه", "options", "compare", "مقایسه"] },
      { id: "fear-mistake", title: q("ترس از اشتباه", "Fear of making a mistake"), methods: ["scenarios", "thinking-traps", "self-compassion", "five-min-step"], checks: ["decision-style", "self-esteem"], tools: ["thoughts", "worry"], question: q("بدترین اتفاقی که فکر می‌کنی می‌افتد چیست؟", "What is the worst thing you think could happen?"), keywords: ["ترس از اشتباه", "اشتباه", "mistake", "perfection", "کمال‌گرا"] },
    ],
  },
  {
    id: "planning", icon: "listChecks",
    title: q("برنامه‌ریزی و بهره‌وری", "Planning & productivity"),
    desc: q("اهمال‌کاری، تمرکز، اولویت‌ها، عادت‌ها", "Procrastination, focus, priorities, habits"),
    questions: [
      q("یک روز معمولی‌ات چطور می‌گذرد و کجا همه‌چیز به هم می‌ریزد؟", "What does a normal day look like, and where does it fall apart?"),
      q("مهم‌ترین کاری که باید انجام شود چیست؟", "What is the single most important thing to get done?"),
      q("چه چیزی تا حالا کمکت کرده بود حتی کمی؟", "What has helped you even a little before?"),
    ],
    topics: [
      { id: "planning-trouble", title: q("مشکل برنامه‌ریزی", "Trouble planning"), methods: ["brain-dump", "priority-matrix", "weekly-review", "time-boxing"], checks: ["planning-habits"], tools: ["planning", "today", "kanban"], question: q("برنامه‌ات معمولاً کجا از هم می‌پاشد؟", "Where does your plan usually fall apart?"), keywords: ["برنامه", "plan", "schedule", "organize"] },
      { id: "procrastination", title: q("اهمال‌کاری", "Procrastination"), methods: ["five-min-step", "two-minute", "start-ritual", "pomodoro-focus", "self-compassion"], checks: ["procrastination"], tools: ["pomodoro", "today"], question: q("وقتی به شروع کار فکر می‌کنی چه حسی می‌آید (ترس، خستگی، بی‌حوصلگی)؟", "When you think of starting, what do you feel (fear, tiredness, boredom)?"), keywords: ["اهمال", "عقب انداختن", "procrastinat", "postpone", "delay"] },
      { id: "focus", title: q("تمرکز", "Focus"), methods: ["pomodoro-focus", "brain-dump", "start-ritual", "grounding"], checks: ["stress", "sleep-quality"], tools: ["pomodoro", "breathing"], question: q("بیشتر چه چیزی حواست را پرت می‌کند؟", "What distracts you the most?"), keywords: ["تمرکز", "حواس", "focus", "concentrat", "distract"] },
      { id: "priorities", title: q("اولویت‌بندی", "Prioritising"), methods: ["priority-matrix", "brain-dump", "decision-matrix"], checks: ["planning-habits", "values-clarity"], tools: ["planning", "kanban"], question: q("فهرست کارهایی که روی دوشت است را بگو.", "List what is on your plate."), keywords: ["اولویت", "priority", "prioriti"] },
      { id: "time-management", title: q("مدیریت زمان", "Time management"), methods: ["time-boxing", "priority-matrix", "weekly-review"], checks: ["planning-habits"], tools: ["planning", "pomodoro"], question: q("وقتت بیشتر کجا هدر می‌رود؟", "Where does your time leak?"), keywords: ["وقت", "زمان", "time management"] },
      { id: "habits", title: q("عادت‌سازی", "Building habits"), methods: ["tiny-habit", "if-then", "weekly-review"], checks: ["planning-habits"], tools: ["today"], question: q("کدام عادت را می‌خواهی بسازی یا ترک کنی؟", "Which habit do you want to build or drop?"), keywords: ["عادت", "habit", "routine", "روتین"] },
      { id: "cant-start", title: q("شروع‌نکردن", "Can't get started"), methods: ["two-minute", "five-min-step", "start-ritual", "behavioral-activation"], checks: ["procrastination"], tools: ["pomodoro"], question: q("کوچک‌ترین قدمی که می‌شود امروز برداشت چیست؟", "What is the smallest step you could take today?"), keywords: ["شروع", "start", "begin"] },
      { id: "reach-goal", title: q("رسیدن به هدف", "Reaching a goal"), methods: ["woop", "small-steps", "if-then", "weekly-review"], checks: ["values-clarity"], tools: ["values", "planning"], question: q("هدفت را مشخص بگو و تا چه زمانی می‌خواهی به آن برسی؟", "State your goal and when you want to reach it."), keywords: ["هدف", "goal", "target"] },
    ],
  },
  {
    id: "mood", icon: "cloudRain",
    title: q("حال روحی و هیجان", "Mood & emotions"),
    desc: q("غمگینی، اضطراب، استرس، خشم، تنهایی", "Low mood, anxiety, stress, anger, loneliness"),
    questions: [
      q("این حال از کی شروع شده و چقدر ادامه داشته؟", "When did this feeling start and how long has it lasted?"),
      q("چه چیزهایی آن را بدتر یا بهتر می‌کند؟", "What makes it worse or better?"),
      q("روی خواب، کار و رابطه‌هایت چه اثری گذاشته؟", "How has it affected sleep, work and relationships?"),
    ],
    topics: [
      { id: "sadness", title: q("غمگینی و بی‌انگیزگی", "Sadness & low motivation"), sensitive: true, methods: ["behavioral-activation", "self-compassion", "expressive-writing", "grounding"], checks: ["phq9", "who5"], tools: ["checkin", "diary", "trends"], question: q("چه چیزهایی که قبلاً دوست داشتی، الان کمتر انجام می‌دهی؟", "What did you used to enjoy that you do less now?"), keywords: ["غم", "افسرد", "بی‌انگیزه", "depress", "sad", "hopeless", "unmotivated", "ناامید"],
        details: [{ id: "no-energy", title: q("انرژی ندارم", "No energy") }, { id: "no-joy", title: q("از چیزی لذت نمی‌برم", "Nothing feels enjoyable") }, { id: "hopeless", title: q("ناامیدم", "I feel hopeless") }] },
      { id: "anxiety", title: q("اضطراب", "Anxiety"), sensitive: true, methods: ["grounding", "worry-time", "thinking-traps", "progressive-relaxation"], checks: ["gad7", "stress"], tools: ["breathing", "worry", "thoughts"], question: q("اضطراب بیشتر در بدنت حس می‌شود یا در فکرهایت؟", "Do you feel anxiety more in your body or in your thoughts?"), keywords: ["اضطراب", "استرس‌دارم", "anxi", "panic", "پنیک", "نگران"],
        details: [{ id: "panic", title: q("حمله‌های ناگهانی", "Sudden panic") }, { id: "social", title: q("اضطراب اجتماعی", "Social anxiety") }, { id: "health", title: q("نگرانی دربارهٔ سلامت", "Health worries") }, { id: "exam", title: q("اضطراب امتحان یا عملکرد", "Exam / performance anxiety") }] },
      { id: "stress", title: q("استرس", "Stress"), methods: ["brain-dump", "progressive-relaxation", "priority-matrix", "grounding"], checks: ["stress", "burnout"], tools: ["calm", "checkin"], question: q("بزرگ‌ترین منبع فشار این روزها چیست؟", "What is the biggest source of pressure these days?"), keywords: ["استرس", "فشار", "stress", "pressure"] },
      { id: "anger", title: q("خشم", "Anger"), methods: ["stop-pause", "grounding", "i-statements", "thinking-traps"], checks: ["stress"], tools: ["breathing", "thoughts"], question: q("آخرین بار که عصبانی شدی چه شد و بعدش چه کردی؟", "What happened the last time you got angry, and what did you do?"), keywords: ["خشم", "عصبان", "anger", "angry", "furious", "rage"] },
      { id: "loneliness", title: q("تنهایی", "Loneliness"), methods: ["behavioral-activation", "reach-out", "self-compassion"], checks: ["loneliness", "relationship-satisfaction"], tools: ["diary", "checkin"], question: q("چه نوع ارتباطی را بیشتر از همه کم داری؟", "What kind of connection do you miss most?"), keywords: ["تنها", "lonely", "alone", "isolat"] },
      { id: "guilt-shame", title: q("احساس گناه و شرم", "Guilt & shame"), methods: ["self-compassion", "thinking-traps", "expressive-writing"], checks: ["self-esteem"], tools: ["thoughts", "diary"], question: q("این احساس به کدام اتفاق یا رفتار برمی‌گردد؟", "Which event or behaviour does the feeling go back to?"), keywords: ["گناه", "شرم", "guilt", "shame", "ashamed"] },
      { id: "self-esteem", title: q("عزت‌نفس", "Self-esteem"), methods: ["self-compassion", "thinking-traps", "values-compass"], checks: ["self-esteem"], tools: ["self", "thoughts"], question: q("معمولاً با خودت چطور حرف می‌زنی؟", "How do you usually talk to yourself?"), keywords: ["عزت", "اعتماد به نفس", "self-esteem", "confidence", "worthless", "بی‌ارزش"] },
    ],
  },
  {
    id: "relationships", icon: "users",
    title: q("روابط", "Relationships"),
    desc: q("خانواده، همسر، دوستی، مرزها، بخشش", "Family, partner, friends, boundaries"),
    questions: [
      q("دقیقاً چه اتفاقی افتاد یا چه الگویی تکرار می‌شود؟", "What exactly happened, or what pattern keeps repeating?"),
      q("تو در این رابطه چه نیازی داری که برآورده نمی‌شود؟", "What need of yours is not being met here?"),
      q("از این رابطه چه می‌خواهی که واقع‌بینانه باشد؟", "What realistic outcome do you want from this relationship?"),
    ],
    topics: [
      { id: "family", title: q("خانواده", "Family"), methods: ["i-statements", "set-boundary", "hard-conversation"], checks: ["relationship-satisfaction"], tools: ["diary", "thoughts"], question: q("کدام عضو خانواده و کدام موقعیت؟", "Which family member, and which situation?"), keywords: ["خانواده", "پدر", "مادر", "family", "parent", "sibling"] },
      { id: "partner", title: q("همسر و رابطهٔ عاشقانه", "Partner & romance"), methods: ["i-statements", "hard-conversation", "forgiveness", "set-boundary"], checks: ["relationship-satisfaction"], tools: ["self", "diary"], question: q("آخرین بحث جدی‌تان دربارهٔ چه بود؟", "What was your last serious disagreement about?"), keywords: ["همسر", "شریک", "عشق", "partner", "spouse", "boyfriend", "girlfriend", "marriage"] },
      { id: "friends", title: q("دوستی", "Friendship"), methods: ["reach-out", "i-statements", "set-boundary"], checks: ["loneliness", "relationship-satisfaction"], tools: ["diary"], question: q("چه چیزی در دوستی‌هایت عوض شده؟", "What has changed in your friendships?"), keywords: ["دوست", "friend"] },
      { id: "boundaries", title: q("مرزها", "Boundaries"), methods: ["set-boundary", "i-statements", "hard-conversation"], checks: ["self-esteem"], tools: ["values"], question: q("کجا حس می‌کنی از حدّت فراتر رفته‌اند؟", "Where do you feel your limits are being crossed?"), keywords: ["مرز", "نه گفتن", "boundar", "say no", "people pleas"] },
      { id: "communication", title: q("ارتباط مؤثر", "Communicating well"), methods: ["i-statements", "hard-conversation", "stop-pause"], checks: ["relationship-satisfaction"], tools: ["thoughts"], question: q("چه گفت‌وگویی را می‌خواهی بهتر پیش ببری؟", "Which conversation do you want to handle better?"), keywords: ["گفت‌وگو", "حرف زدن", "communicat", "talk", "conversation"] },
      { id: "hurt-forgive", title: q("دلخوری و بخشش", "Hurt & forgiveness"), methods: ["forgiveness", "expressive-writing", "self-compassion"], checks: [], tools: ["diary", "thoughts"], question: q("چه چیزی هنوز آزارت می‌دهد؟", "What still hurts?"), keywords: ["دلخور", "ببخش", "کینه", "forgive", "resent", "betray", "خیانت"] },
    ],
  },
  {
    id: "work", icon: "briefcase",
    title: q("کار، تحصیل و مسیر شغلی", "Work, study & career"),
    desc: q("فرسودگی، انتخاب مسیر، امتحان، یادگیری", "Burnout, direction, exams, learning"),
    questions: [
      q("در چه موقعیتی هستی (کار، دانشگاه، جست‌وجوی شغل) و چه مدتی است؟", "What is your situation (job, university, job hunt) and for how long?"),
      q("کدام بخشش انرژی‌ات را می‌گیرد و کدام انرژی می‌دهد؟", "Which part drains you and which gives energy?"),
      q("چه تغییر کوچکی در همین هفته ممکن است؟", "What small change is possible this week?"),
    ],
    topics: [
      { id: "burnout", title: q("فرسودگی شغلی", "Burnout"), methods: ["energy-audit", "set-boundary", "progressive-relaxation", "priority-matrix"], checks: ["burnout", "stress"], tools: ["checkin", "calm"], question: q("آخرین بار کِی احساس انرژی واقعی داشتی؟", "When did you last feel truly energised?"), keywords: ["فرسود", "خسته از کار", "burnout", "burned out", "exhaust"] },
      { id: "career-path", title: q("انتخاب مسیر", "Choosing a path"), methods: ["values-compass", "decision-matrix", "scenarios", "woop"], checks: ["values-clarity", "decision-style"], tools: ["values", "self", "architect"], question: q("اگر پول و نظر دیگران مسئله نبود، چه می‌کردی؟", "If money and others' opinions didn't matter, what would you do?"), keywords: ["مسیر شغلی", "شغل", "career", "job", "major", "رشته"] },
      { id: "exam-interview", title: q("آمادگی امتحان یا مصاحبه", "Exam or interview prep"), methods: ["active-recall", "time-boxing", "grounding", "scenarios"], checks: ["stress"], tools: ["knowledge", "pomodoro", "breathing"], question: q("چند روز مانده و چه حجمی باقی است؟", "How many days are left and how much is left to cover?"), keywords: ["امتحان", "کنکور", "مصاحبه", "exam", "interview", "test prep"] },
      { id: "learning", title: q("یادگیری مؤثر", "Learning effectively"), methods: ["active-recall", "pomodoro-focus", "weekly-review"], checks: ["planning-habits"], tools: ["knowledge", "pomodoro"], question: q("چه چیزی را یاد می‌گیری و تا الان چطور مرور می‌کنی؟", "What are you learning and how do you review it?"), keywords: ["یادگیری", "درس", "study", "learn", "memor", "حفظ"] },
    ],
  },
  {
    id: "body", icon: "activity",
    title: q("بدن و سلامت", "Body & health"),
    desc: q("خواب، انرژی، تغذیه، تحرک، چرخهٔ ماهانه", "Sleep, energy, food, movement, cycle"),
    questions: [
      q("این مشکل بدنی از کی شروع شده و الگویی دارد؟", "When did this start and is there a pattern?"),
      q("چه عادت‌هایی (خواب، غذا، حرکت، صفحه‌نمایش) به نظرت اثر دارند؟", "Which habits (sleep, food, movement, screens) might matter?"),
      q("آیا با پزشک دربارهٔ آن صحبت کرده‌ای؟", "Have you talked to a doctor about it?"),
    ],
    topics: [
      { id: "sleep", title: q("خواب", "Sleep"), methods: ["sleep-hygiene", "wind-down", "progressive-relaxation", "worry-time"], checks: ["sleep-quality"], tools: ["sleep", "breathing"], question: q("خوابیدن سخت است، یا ماندن در خواب، یا زود بیدار شدن؟", "Is it falling asleep, staying asleep or waking too early?"), keywords: ["خواب", "بی‌خواب", "sleep", "insomnia"] },
      { id: "energy", title: q("انرژی و خستگی", "Energy & fatigue"), methods: ["energy-audit", "sleep-hygiene", "behavioral-activation"], checks: ["sleep-quality", "burnout", "who5"], tools: ["checkin", "trends"], question: q("در طول روز انرژی‌ات کِی بالا و کِی پایین است؟", "When is your energy high and low during the day?"), keywords: ["انرژی", "خستگی", "energy", "tired", "fatigue"] },
      { id: "nutrition", title: q("تغذیه", "Food & eating"), methods: ["tiny-habit", "if-then", "weekly-review"], checks: ["planning-habits"], tools: ["today", "diary"], question: q("الگوی غذا خوردنت در یک روز معمولی چیست؟", "What does eating look like on a normal day?"), keywords: ["تغذیه", "غذا", "رژیم", "food", "eating", "diet", "weight"] },
      { id: "movement", title: q("تحرک", "Movement"), methods: ["tiny-habit", "behavioral-activation", "if-then"], checks: ["planning-habits"], tools: ["today"], question: q("چه نوع حرکتی را دوست داری یا دوست داشتی؟", "What movement do you enjoy, or used to?"), keywords: ["ورزش", "تحرک", "exercise", "workout", "movement", "walk"] },
      { id: "tension", title: q("تنش بدنی", "Body tension"), methods: ["progressive-relaxation", "grounding", "wind-down"], checks: ["stress"], tools: ["breathing", "calm"], question: q("تنش بیشتر در کدام بخش بدن است؟", "Where in your body is the tension?"), keywords: ["تنش", "گردن", "درد", "tension", "tight", "pain", "headache"] },
      { id: "cycle", title: q("چرخهٔ ماهانه", "Monthly cycle"), methods: ["energy-audit", "weekly-review", "self-compassion"], checks: [], tools: ["cycle", "checkin"], question: q("در کدام روزهای چرخه حال و انرژی‌ات تغییر می‌کند؟", "On which cycle days do mood and energy change?"), keywords: ["پریود", "چرخه", "قاعدگی", "period", "cycle", "pms"] },
    ],
  },
  {
    id: "growth", icon: "sprout",
    title: q("معنا و رشد فردی", "Meaning & personal growth"),
    desc: q("ارزش‌ها، هویت، رها کردن گذشته، سوگ، تغییر", "Values, identity, letting go, grief, change"),
    questions: [
      q("چه چیزی باعث شد همین حالا به این موضوع فکر کنی؟", "What brought this up for you right now?"),
      q("چه زمانی احساس می‌کردی «خودِ واقعی‌ات» هستی؟", "When did you last feel most like yourself?"),
      q("اگر یک سال دیگر راضی باشی، چه چیزی فرق کرده است؟", "If a year from now you felt good about it, what would be different?"),
    ],
    topics: [
      { id: "values-goals", title: q("هدف و ارزش‌ها", "Purpose & values"), methods: ["values-compass", "woop", "weekly-review"], checks: ["values-clarity"], tools: ["values", "architect", "self"], question: q("سه چیزی که برایت واقعاً مهم است چیست؟", "What are three things that truly matter to you?"), keywords: ["ارزش", "معنا", "هدف زندگی", "purpose", "meaning", "values"] },
      { id: "identity", title: q("هویت و خودشناسی", "Identity & self-knowledge"), methods: ["values-compass", "expressive-writing", "self-compassion"], checks: ["values-clarity", "self-esteem"], tools: ["self", "architect", "diary"], question: q("خودت را در سه کلمه چطور توصیف می‌کنی؟", "How would you describe yourself in three words?"), keywords: ["هویت", "خودشناسی", "identity", "who am i", "self-knowledge"] },
      { id: "let-go", title: q("رها کردن گذشته", "Letting go of the past"), methods: ["letter-letting-go", "forgiveness", "expressive-writing"], checks: [], tools: ["diary", "thoughts"], question: q("چه چیزی از گذشته هنوز دنبالت است؟", "What from the past still follows you?"), keywords: ["گذشته", "رها", "past", "let go", "regret", "پشیمان"] },
      { id: "grief", title: q("سوگ و فقدان", "Grief & loss"), sensitive: true, methods: ["grief-ritual", "expressive-writing", "self-compassion", "grounding"], checks: ["who5"], tools: ["diary", "checkin"], question: q("چه کسی یا چه چیزی را از دست داده‌ای و چه مدت گذشته؟", "Who or what have you lost, and how long ago?"), keywords: ["سوگ", "فوت", "از دست", "grief", "loss", "died", "bereave"] },
      { id: "life-change", title: q("تغییر زندگی", "A life change"), methods: ["scenarios", "woop", "values-compass", "small-steps"], checks: ["stress", "values-clarity"], tools: ["architect", "planning"], question: q("چه تغییری در راه است یا می‌خواهی ایجادش کنی؟", "What change is coming or do you want to make?"), keywords: ["تغییر", "مهاجرت", "change", "transition", "move", "immigrat"] },
    ],
  },
  {
    id: "daily", icon: "home",
    title: q("زندگی روزمره و مالی", "Daily life & money"),
    desc: q("بی‌نظمی، پول، فشار مسئولیت‌ها", "Clutter, money, too many responsibilities"),
    questions: [
      q("کدام بخش از روزمرگی بیشتر اذیتت می‌کند؟", "Which part of daily life bothers you most?"),
      q("چه کسی یا چه چیزی می‌تواند کمکت کند؟", "Who or what could help?"),
      q("اگر فقط یک کار را این هفته درست کنی، آن چیست؟", "If you fixed just one thing this week, what would it be?"),
    ],
    topics: [
      { id: "clutter", title: q("بی‌نظمی خانه و وسایل", "Clutter at home"), methods: ["declutter-10", "two-minute", "tiny-habit"], checks: ["planning-habits"], tools: ["today"], question: q("کدام گوشه یا اتاق بیشتر از همه آزارت می‌دهد؟", "Which corner or room bothers you most?"), keywords: ["نظم", "بی‌نظمی", "خانه", "clutter", "mess", "tidy"] },
      { id: "money", title: q("مدیریت پول", "Managing money"), methods: ["simple-budget", "priority-matrix", "weekly-review"], checks: ["stress"], tools: ["planning", "today"], question: q("بزرگ‌ترین نگرانی مالی‌ات چیست؟", "What is your biggest money worry?"), keywords: ["پول", "مالی", "بدهی", "money", "debt", "budget", "income"] },
      { id: "responsibility-pressure", title: q("فشار مسئولیت‌ها", "Too many responsibilities"), methods: ["brain-dump", "priority-matrix", "set-boundary", "progressive-relaxation"], checks: ["stress", "burnout"], tools: ["planning", "today", "calm"], question: q("کدام مسئولیت‌ها را می‌شود کم کرد، واگذار کرد یا عقب انداخت؟", "Which responsibilities could you reduce, hand off or postpone?"), keywords: ["مسئولیت", "کارهای زیاد", "responsibilit", "overwhelmed", "too much"] },
    ],
  },
  {
    id: "unknown", icon: "helpCircle",
    title: q("نمی‌دانم مشکلم چیست", "I don't know what's wrong"),
    desc: q("فقط بنویس؛ دسته را با هم پیدا می‌کنیم", "Just write; we'll find the category together"),
    questions: [],
    topics: [],
  },
];

export function getCategory(id?: string | null): NeedsCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
export function getTopic(catId?: string | null, topicId?: string | null) {
  return getCategory(catId)?.topics.find((t) => t.id === topicId);
}
export function pickLang(b: B, isEn: boolean): string {
  return isEn ? b.en : b.fa;
}

/** Offline matcher for the "I don't know" path: ranks topics by keyword hits. */
export function matchTopicsLocal(text: string, max = 3): Array<{ cat: string; topic: string }> {
  const hay = text.toLowerCase();
  const scored: Array<{ cat: string; topic: string; score: number }> = [];
  for (const c of CATEGORIES) {
    for (const t of c.topics) {
      const score = t.keywords.reduce((n, k) => (hay.includes(k.toLowerCase()) ? n + 1 : n), 0);
      if (score > 0) scored.push({ cat: c.id, topic: t.id, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(({ cat, topic }) => ({ cat, topic }));
}
