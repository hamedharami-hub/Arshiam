import type { MethodDef, B } from "./types";

const b = (fa: string, en: string): B => ({ fa, en });
const m = (id: string, title: [string, string], summary: [string, string], minutes: number, steps: Array<[string, string]>): MethodDef => ({
  id, title: b(...title), summary: b(...summary), minutes, steps: steps.map(([fa, en]) => b(fa, en)),
});

export const METHODS: MethodDef[] = [
  // ── Problem solving & decisions ──
  m("define-problem", ["تعریف دقیق مسئله", "Define the problem"], ["مسئله را در یک جملهٔ روشن بنویس تا مبهم نماند.", "Put the problem in one clear sentence so it stops being vague."], 10, [
    ["بنویس: «من می‌خواهم … ولی … مانع می‌شود».", "Write: \"I want … but … is in the way.\""],
    ["فرق بگذار بین آنچه می‌دانی (حقیقت) و آنچه حدس می‌زنی.", "Separate what you know (facts) from what you are guessing."],
    ["مشخص کن کدام قسمت در دست توست و کدام نه.", "Mark which parts are in your control and which are not."],
    ["نتیجهٔ مطلوب را در یک جمله بنویس.", "Write the outcome you want in one sentence."]]),
  m("small-steps", ["شکستن به قدم‌های کوچک", "Break it into small steps"], ["کار بزرگ را به قدم‌هایی تقسیم کن که هر کدام کمتر از یک ساعت طول بکشد.", "Split a big job into steps that each take under an hour."], 10, [
    ["نتیجهٔ نهایی را بنویس.", "Write the end result."],
    ["عکس برگرد: آخرین قدم، قدم قبلِ آن، و همین‌طور تا اولین قدم.", "Work backwards: the last step, the one before it, down to the first."],
    ["هر قدم را آنقدر کوچک کن که فعل باشد («باز کن»، «بنویس»).", "Make each step a concrete action (\"open\", \"write\")."],
    ["فقط اولین قدم را به تسک امروز تبدیل کن.", "Turn only the first step into a task for today."]]),
  m("five-whys", ["پنج چرا", "Five whys"], ["با پرسیدن پشت همِ «چرا؟» به ریشهٔ مشکل برس.", "Ask \"why?\" repeatedly to reach the root of a problem."], 10, [
    ["مشکل را بنویس.", "Write the problem."],
    ["بپرس: «چرا این اتفاق می‌افتد؟» و به جواب دوباره «چرا؟» بپرس—حداقل پنج بار.", "Ask \"why does this happen?\" then ask \"why?\" of each answer — about five times."],
    ["آخرین جواب از جنس چیزی است که می‌شود رویش کار کرد؛ آن را هدف قرار بده.", "The last answer is usually something you can act on — make it your target."]]),
  m("pros-cons", ["مزایا و معایب", "Pros and cons"], ["هر گزینه را با وزن‌دهی به مزایا و معایب بسنج.", "Weigh each option by its upsides and downsides."], 15, [
    ["برای هر گزینه دو ستون بکش: مزایا و معایب.", "For each option draw two columns: pros and cons."],
    ["به هر مورد از ۱ تا ۵ اهمیت بده.", "Rate each point from 1 to 5 for importance."],
    ["مجموع هر ستون را ببین؛ بعد بپرس: «دلم کدام نتیجه را می‌خواهد؟»", "Add up each column, then ask: \"which result is my gut hoping for?\""]]),
  m("decision-matrix", ["ماتریس تصمیم", "Decision matrix"], ["چند گزینه را با چند معیار وزن‌دار مقایسه کن.", "Compare several options against weighted criteria."], 20, [
    ["۳ تا ۵ معیار مهم را بنویس (مثلاً هزینه، آرامش، رشد).", "List 3–5 criteria that matter (cost, peace, growth…)."],
    ["به هر معیار وزن ۱ تا ۵ بده.", "Give each criterion a weight from 1 to 5."],
    ["هر گزینه را در هر معیار از ۱ تا ۵ نمره بده و در وزن ضرب کن.", "Score each option 1–5 per criterion and multiply by the weight."],
    ["مجموع را ببین؛ اگر نتیجه با دلت جور نبود، یک معیار نیامده را پیدا کن.", "Check the totals; if the result feels wrong, you probably missed a criterion."]]),
  m("scenarios", ["سه سناریو: بهترین، بدترین، محتمل", "Best, worst, most likely"], ["هر گزینه را با سه سناریوی واقع‌بینانه بسنج؛ ترس با برنامه کم‌تر می‌شود.", "Test an option against three realistic outcomes; fear shrinks with a plan."], 10, [
    ["بهترین نتیجهٔ ممکن را بنویس.", "Write the best realistic outcome."],
    ["بدترین نتیجه را بنویس و یک کار که می‌کنی اگر رخ داد.", "Write the worst outcome and what you would do if it happened."],
    ["محتمل‌ترین نتیجه را بنویس؛ معمولاً نزدیک به میانه است.", "Write the most likely outcome — usually somewhere in the middle."],
    ["بپرس: «بدترین حالت قابل تحمل است؟»", "Ask: \"Could I live with the worst case?\""]]),
  m("five-min-step", ["قدم ۵ دقیقه‌ای", "The 5-minute step"], ["کوچک‌ترین قدم را فقط ۵ دقیقه انجام بده.", "Do the smallest possible step for just five minutes."], 5, [
    ["بنویس کاری که کمتر از ۵ دقیقه طول می‌کشد.", "Write one action that takes under five minutes."],
    ["تایمر ۵ دقیقه را شروع کن.", "Start a 5-minute timer."],
    ["بعد از تایمر آزادی به‌جا بگذاری بایستی ادامه بدهی یا نه.", "When the timer ends you are free to stop or continue."]]),
  m("if-then", ["جمله‌های «اگر… آن‌گاه…»", "If–then plans"], ["قبل از موقعیت، رفتار مشخصِ آن را تعیین کن تا اجرا آسان شود.", "Decide the exact action in advance so it is easier to follow through."], 5, [
    ["موقعیت مشخصی را انتخاب کن («وقتی قهوهٔ صبح تمام شد»).", "Pick a specific cue (\"when my morning coffee is done\")."],
    ["رفتار مشخص را به آن وصل کن («… آن‌گاه ۱۰ دقیقه می‌نویسم»).", "Attach one concrete action (\"then I write for 10 minutes\")."],
    ["یک مانع محتمل هم بنویس و جملهٔ دوم بساز: «اگر … شد، آن‌گاه …».", "Add one likely obstacle: \"if X happens, then I will Y.\""]]),
  // ── Planning & goals ──
  m("brain-dump", ["خالی‌کردن ذهن", "Brain dump"], ["همهٔ آنچه در ذهن داری بیرون بریز تا ذهن سبک شود.", "Pour everything out of your head so your mind can rest."], 10, [
    ["یک تایمر ۱۰ دقیقه‌ای بگذار و هر چه به ذهنت می‌آید بنویس—بدون مرتب‌کردن.", "Set a 10-minute timer and write whatever comes up — no sorting."],
    ["دسته بندی کن: کاری، نگرانی، ایده، نه مربوط به من.", "Group items: actions, worries, ideas, not mine."],
    ["از هر گروه یک مورد را انتخاب کن و به تسک تبدیل کن.", "Pick one from each group and turn it into a task."]]),
  m("priority-matrix", ["ماتریس اولویت (فوری/مهم)", "Priority matrix (urgent/important)"], ["کارها را به چهار دستهٔ فوری/مهم تقسیم کن.", "Sort tasks into four boxes by urgency and importance."], 10, [
    ["همهٔ کارها را بنویس.", "List all tasks."],
    ["هر کار را در یکی از چهار جا بگذار: انجامش بده (مهم+فوری)، زمانش را ببند (مهم)، واگذار کن (فوری)، حذف کن (نه هیچ‌کدام).", "Place each: do now (both), schedule (important), delegate (urgent), drop (neither)."],
    ["فقط ۱ تا ۳ کار از جعبهٔ «انجام بده» را برای امروز بردار.", "Take only 1–3 items from \"do now\" for today."]]),
  m("woop", ["هدف‌گذاری با مانع‌یابی (WOOP)", "Goal with obstacles (WOOP)"], ["آرزو، نتیجه، مانع، برنامه: هدفی که مانع‌هایش را هم دیده.", "Wish, outcome, obstacle, plan — a goal that already expects the obstacles."], 15, [
    ["Wish: آرزویت را در یک جمله بنویس.", "Wish: write your wish in one sentence."],
    ["Outcome: بهترین نتیجه را تصویر کن و بنویس.", "Outcome: imagine the best result and write it."],
    ["Obstacle: مانع واقعی درونی (نه بیرونی) را پیدا کن.", "Obstacle: find the real inner obstacle."],
    ["Plan: بنویس «اگر آن مانع آمد، آن‌گاه …».", "Plan: write \"if that obstacle shows up, then I will …\"."]]),
  m("two-minute", ["قانون دو دقیقه", "The two-minute rule"], ["اگر کاری کمتر از ۲ دقیقه طول می‌کشد، همان لحظه انجامش بده.", "If it takes under two minutes, do it now."], 2, [
    ["کاری را که مدتی عقب انداخته‌ای انتخاب کن.", "Pick something you have been avoiding."],
    ["اگر زیر ۲ دقیقه است، همین الان انجام بده.", "If it is under two minutes, do it right now."],
    ["اگر بیشتر است، قدم اول دودقیقه‌ایش را پیدا کن و فقط آن را انجام بده.", "If longer, find its first two-minute step and do only that."]]),
  m("start-ritual", ["آیین شروع کار", "A start ritual"], ["یک روتین کوتاه که مغز را به حالت کار می‌برد.", "A short routine that signals your brain it is work time."], 5, [
    ["جای کار را جمع کن و گوشی را دور بگذار.", "Clear your spot and put the phone away."],
    ["یک نشانهٔ ثابت بساز (آب، چای، موزیک مشخص).", "Use a fixed cue (water, tea, a specific playlist)."],
    ["هدف همین جلسه را در یک جمله بنویس و شروع کن.", "Write this session's goal in one line and begin."]]),
  m("pomodoro-focus", ["کار متمرکز با پومودورو", "Focused work with Pomodoro"], ["۲۵ دقیقه کار بدون حواس‌پرتی، ۵ دقیقه استراحت.", "25 minutes of work without distraction, then a 5-minute break."], 30, [
    ["یک کار مشخص انتخاب کن.", "Choose one task."],
    ["تایمر پومودوروی ARSHNAZ را بزن و فقط همان کار را انجام بده.", "Start the ARSHNAZ Pomodoro timer and work only on that."],
    ["وقتی فکر یا کار دیگری آمد، در کاغذ یادداشت کن و برگرد.", "If another thought pops up, jot it down and return."]]),
  m("time-boxing", ["جایگاه‌دادن زمان به کارها", "Time-boxing"], ["به هر کار یک بازهٔ زمانی مشخص تخصیص بده.", "Give each task a fixed slot of time."], 10, [
    ["۳ کار مهم امروز را بنویس.", "List today's top 3 tasks."],
    ["برای هر کدام مدت و ساعت شروع مشخص کن (با کمی فاصله).", "Give each a duration and start time (with buffers)."],
    ["وقتی زمان تمام شد، متوقف شو و بگذار به بازهٔ بعدی.", "When time is up, stop and move to the next slot."]]),
  m("tiny-habit", ["عادت کوچک", "Tiny habit"], ["عادت را آنقدر کوچک کن که همیشه ممکن باشد و به یک روتین موجود بچسبان.", "Shrink a habit until it is always doable and attach it to an existing routine."], 10, [
    ["عادت مطلوب را به یک نسخهٔ ۳۰ ثانیه‌ای کوچک کن.", "Shrink the habit to a 30-second version."],
    ["آن را به کاری که هر روز می‌کنی بچسبان: «بعد از … می‌کنم …».", "Attach it to something you already do: \"after I … I will …\"."],
    ["هر بار که انجام شد به خودت آفرین بگو و در عادت‌های ARSHNAZ علامت بزن.", "Celebrate each time and tick it in ARSHNAZ habits."]]),
  m("weekly-review", ["بازبینی هفتگی", "Weekly review"], ["هر هفته ۱۵ دقیقه به آنچه گذشت و آنچه می‌آید نگاه کن.", "Spend 15 minutes a week on what happened and what is next."], 15, [
    ["نگاه به هفتهٔ گذشته: کدام اتفاق خوب بود؟ کدام نه؟", "Look back: what went well, what did not?"],
    ["کارهای ناتمام را تصمیم بگیر: ادامه، موکول، یا حذف.", "Decide on unfinished items: continue, postpone or drop."],
    ["۳ اولویت هفتهٔ آینده را در برنامه‌ریزی بنویس.", "Write the next week's top 3 in Planning."]]),
  // ── Mood & emotions ──
  m("behavioral-activation", ["فعال‌سازی رفتاری", "Behavioural activation"], ["به‌جای منتظر انگیزه ماندن، یک کار کوچک و معنادار انجام بده؛ انگیزه بعد می‌آید.", "Instead of waiting for motivation, do one small meaningful thing — motivation follows."], 15, [
    ["دو کار کوچک بنویس: یکی لذت‌بخش (پیاده‌روی، آهنگ) و یکی مفید (دوش، پیام).", "List two small activities: one pleasant (a walk, music) and one useful (shower, a message)."],
    ["یکی را برای امروز و ساعت مشخص تسک کن.", "Schedule one for today at a set time."],
    ["قبل و بعد از آن، حالت را از ۱ تا ۱۰ نمره بده و تفاوت را ببین.", "Rate your mood 1–10 before and after and notice the difference."]]),
  m("grounding", ["زمین‌گیری ۵-۴-۳-۲-۱", "5-4-3-2-1 grounding"], ["با حواس پنج‌گانه به همین لحظه برگرد.", "Come back to the present moment through your senses."], 3, [
    ["۵ چیز را که می‌بینی نام ببر.", "Name 5 things you can see."],
    ["۴ چیز که می‌توانی لمس کنی، ۳ صدایی که می‌شنوی.", "4 things you can touch, 3 you can hear."],
    ["۲ بویی که می‌شناسی و ۱ چیز که می‌توانی بچشی؛ بعد چند نفس آهسته بکش.", "2 smells and 1 taste; then take a few slow breaths."]]),
  m("thinking-traps", ["شناسایی خطاهای فکری", "Spotting thinking traps"], ["فکر را بنویس، نام خطایش را بگذار و جمله‌ای منصفانه‌تر بساز.", "Write the thought, name the trap, and craft a fairer one."], 10, [
    ["فکر دقیق را بنویس («همه‌چیز نابود می‌شه»).", "Write the exact thought (\"everything will fall apart\")."],
    ["ببین مشمول کدام دام است: سیاه و سفید، بزرگ‌نمایی، ذهن‌خوانی، بایدها…", "Check which trap it is: all-or-nothing, catastrophising, mind-reading, shoulds…"],
    ["بپرس: «شواهد موافق و مخالفش چیست؟» و یک جملهٔ متعادل‌تر بنویس.", "Ask: \"what is the evidence for and against?\" and write a more balanced sentence."]]),
  m("self-compassion", ["مهربانی با خود", "Self-compassion"], ["با خودت همان‌طور حرف بزن که با یک دوست نزدیک حرف می‌زنی.", "Talk to yourself the way you would to a close friend."], 8, [
    ["بنویس چه چیزی سخت است و چه می‌گویی به خودت.", "Write what is hard and what you tell yourself."],
    ["بنویس: «این لحظه سخت است؛ سختی بخشی از زندگی همهٔ آدم‌هاست.»", "Write: \"This is a hard moment; struggle is part of being human.\""],
    ["چه می‌گفتی اگر این را دوستت می‌گفت؟ همان را به خودت بگو.", "What would you say if a friend told you this? Say that to yourself."]]),
  m("expressive-writing", ["نوشتن هیجانی", "Expressive writing"], ["۱۵ دقیقه بدون ویرایش به آنچه می‌اندیشی و احساس می‌کنی بنویس.", "Write for 15 minutes, unedited, about what you think and feel."], 15, [
    ["دفتر خاطرات را باز کن و تایمر ۱۵ دقیقه بگذار.", "Open the diary and set a 15-minute timer."],
    ["بنویس بدون نگرانی از غلط یا نگارش؛ فقط ننویس برای قضاوت.", "Do not worry about spelling or style; do not write to be judged."],
    ["آخرش یک جمله بنویس: «الان چه احساسی دارم؟»", "End with one line: \"How do I feel now?\""]]),
  m("worry-time", ["زمان نگرانی", "Worry time"], ["نگرانی را به یک بازهٔ ۱۵ دقیقه‌ای مشخص موکول کن.", "Postpone worrying to a set 15-minute window."], 15, [
    ["یک ساعت ثابت برای نگرانی انتخاب کن (مثلاً ۶ عصر).", "Pick a fixed time (say 6 pm)."],
    ["تا آن موقع هر نگرانی را در یک فهرست کوتاه یادداشت کن و به کارت برگرد.", "Until then jot each worry on a list and return to what you were doing."],
    ["در زمان نگرانی فهرست را بخوان؛ برای قابل حل‌ها یک قدم بنویس (ابزار «مدیریت نگرانی» کمک می‌کند).", "At worry time read the list; for solvable ones write one step (the Worry tool helps)."]]),
  m("progressive-relaxation", ["آرام‌سازی تدریجی عضلات", "Progressive muscle relaxation"], ["عضله‌ها را یکی‌یکی سفت و رها کن.", "Tense and release muscle groups one at a time."], 10, [
    ["نشسته یا درازکش با چشم بسته؛ از پاها شروع کن.", "Sit or lie down, eyes closed; start from your feet."],
    ["هر گروه عضله را ۵ ثانیه سفت کن و بعد ۱۰ ثانیه کامل رها کن.", "Tense each group 5 seconds, then release fully for 10."],
    ["به ترتیب بالا برو: ساق‌ها، شکم، دست‌ها، شانه‌ها، صورت.", "Work upward: legs, stomach, hands, shoulders, face."]]),
  m("stop-pause", ["مکث قبل از واکنش", "Stop and pause"], ["قبل از واکنش، یک مکث کوتاه و نفس بگیر.", "Take a short pause and a breath before reacting."], 3, [
    ["متوقف شو و یک نفس عمیق بکش (با بازدم طولانی‌تر).", "Stop and take a deep breath (longer out-breath)."],
    ["نام احساس را بگو: «من عصبانی/آزرده هستم».", "Name the feeling: \"I'm angry/hurt.\""],
    ["اگر لازم است از موقعیت بیرون برو و بعد برگرد؛ گفت‌وگو را با ذهن آرام‌تر ادامه بده.", "Step away if needed and return to the conversation calmer."]]),
  // ── Relationships ──
  m("i-statements", ["جمله‌های «من احساس می‌کنم…»", "\"I feel…\" statements"], ["به‌جای سرزنش، احساس و نیاز خودت را بگو.", "Share your feeling and need instead of blaming."], 8, [
    ["بنویس: «وقتی … (رفتار مشخص) …»", "Write: \"When … (a specific behaviour) …\""],
    ["«من … (احساس) … احساس می‌کنم، چون … (نیاز) … برایم مهم است.»", "\"I feel … (feeling) because I need … (need).\""],
    ["با یک درخواست مشخص و قابل قبول تمام کن: «می‌شه …؟»", "Finish with a clear, doable request: \"Would you be willing to …?\""]]),
  m("set-boundary", ["تعیین مرز", "Setting a boundary"], ["حدّ خودت را مهربان و روشن اعلام کن.", "State your limit kindly and clearly."], 10, [
    ["مشخص کن دقیقاً چه چیزی برایت قابل تحمل نیست.", "Define exactly what is not OK for you."],
    ["یک جملهٔ کوتاه بنویس: «نمی‌تونم … ولی می‌تونم …»", "Write one short line: \"I can't … but I can …\""],
    ["نیازی به توضیح طولانی نیست؛ پایهٔ جمله را تکرار کن اگر لازم شد.", "You don't need a long justification; repeat the line if needed."]]),
  m("hard-conversation", ["آماده‌سازی گفت‌وگوی سخت", "Prepare a hard conversation"], ["قبل از گفت‌وگو، هدف، جملهٔ اول و مرز خود را مشخص کن.", "Before you talk, clarify your goal, opening line and limit."], 15, [
    ["هدف را بنویس: می‌خواهم چه چیزی بهتر شود؟", "Write your goal: what do you want to improve?"],
    ["جملهٔ اول نرم بساز و وقت مناسبی انتخاب کن.", "Craft a soft opening line and pick a good moment."],
    ["یک بار بلند تمرین کن و برای واکنش سخت پاسخی آماده بگذار.", "Rehearse once out loud and prepare for a tough reaction."]]),
  m("reach-out", ["دست دراز کردن به یک آدم", "Reach out to one person"], ["یک پیام کوچک به یک نفر که امن می‌کنید.", "A small message to one person who feels safe."], 5, [
    ["یک نفر را انتخاب کن که با او راحتی.", "Pick one person you feel comfortable with."],
    ["یک پیام ساده بنویس: «یادت بودم؛ اگر وقت داری صدایت را بشنوم».", "Write a simple message: \"Thinking of you — free for a chat?\""],
    ["بفرست و اگر جواب نگرفتی، نتیجه را شخصی نگیر.", "Send it, and don't take a slow reply personally."]]),
  m("forgiveness", ["بخشش به نیت آرامش خودت", "Forgiving for your own peace"], ["بخشش یعنی رها کردن باری که تو حمل می‌کنی؛ به معنای تایید رفتار دیگری نیست.", "Forgiveness releases a burden you carry; it does not excuse the other person."], 15, [
    ["بنویس چه اتفاقی افتاد و چه احساسی داشتی.", "Write what happened and what you felt."],
    ["بنویس نگه‌داشتن این دلخوری چه هزینه‌ای برای تو دارد.", "Write what holding on to this costs you."],
    ["یک جملهٔ رهایی بنویس؛ لازم نیست به آن شخص بگوی.", "Write a release sentence; you need not tell the other person."]]),
  // ── Work, body, growth, daily ──
  m("energy-audit", ["ممیزی انرژی", "Energy audit"], ["۳ روز ثبت کن کجا انرژی می‌گیری و کجا انرژی تخلیه می‌شود.", "For 3 days note what gives and what drains energy."], 10, [
    ["سه بازهٔ روز (صبح، میانه، شب) انرژی را از ۱ تا ۱۰ در ثبت حال ثبت کن.", "Rate energy 1–10 at three points in the day in the check-in."],
    ["هر شب بنویس کدام کار انرژی داد و کدام گرفت.", "Each night note what gave and what took energy."],
    ["بعد از ۳ روز یک مورد را کم کن و یک مورد را بیشتر.", "After 3 days reduce one drain and add one source."]]),
  m("active-recall", ["مرور فعال (بازگویی)", "Active recall"], ["به‌جای خواندن دوباره، از حافظه بگو و بعد چک کن.", "Instead of rereading, recall from memory then check."], 20, [
    ["یک بخش را بخوان و کتاب را ببند.", "Read a section, then close the book."],
    ["آنچه یادت مانده بنویس یا به کسی توضیح بده.", "Write down or explain what you remember."],
    ["با متن مقایسه کن و نقاط ضعیف را در کارت‌های مرور (بخش دانش) بگذار.", "Compare with the text and add weak spots to review cards (Knowledge)."]]),
  m("values-compass", ["قطب‌نمای ارزش‌ها", "Values compass"], ["ارزش‌های مهم را مشخص کن و تصمیم‌ها را با آن بسنج.", "Pinpoint your key values and test decisions against them."], 15, [
    ["از بین ارزش‌ها (مثلاً آرامش، رشد، خانواده، آزادی) ۳ تا ۵ تا انتخاب کن.", "From a list of values (peace, growth, family, freedom) choose 3–5."],
    ["برای هر کدام یک رفتار مشخص هفتهٔ آینده بنویس.", "For each, write one concrete behaviour for next week."],
    ["هنگام تردید بپرس: «کدام گزینه با ارزش‌هایم همانگ‌تر است؟»", "When unsure ask: \"which option fits my values better?\""]]),
  m("letter-letting-go", ["نامهٔ رهایی", "Letter of letting go"], ["به گذشته یا یک آدم نامه‌ای بنویس که قرار نیست بفرستی.", "Write an unsent letter to your past or to someone."], 20, [
    ["بنویس چه چیزی هنوز نگفته‌ای و چه احساسی داری.", "Write what you have not said and what you feel."],
    ["بنویس چه چیزی را از این ماجرا با خود می‌بری و چه چیزی را رها می‌کنی.", "Write what you will keep from this and what you will leave behind."],
    ["نامه را نگه دار یا به شکل نمادیک پاره کن؛ هر کدام که آرام‌تر می‌کند.", "Keep the letter or tear it up symbolically — whichever calms you."]]),
  m("grief-ritual", ["آیین یادبود", "A remembrance ritual"], ["یک کار کوچک و ثابت برای یادکردن آنچه از دست رفته و نگه‌داشتن پیوند.", "A small steady act to honour what was lost and keep the bond."], 15, [
    ["چیزی که آن کس/آن چیز را یادت می‌اندازد انتخاب کن (عکس، آهنگ، شمع).", "Choose something that reminds you (a photo, a song, a candle)."],
    ["۱۰ دقیقه یادش را زنده کن و به هر احساسی که آمد اجازه بده.", "Spend 10 minutes remembering and allow whatever feelings come."],
    ["بعد یک کار مراقبتی کوچک برای خودت (نوشیدنی، پیاده‌روی، تماس با یک آدم نزدیک).", "Follow with a small act of self-care (a drink, a walk, contacting someone close)."]]),
  m("sleep-hygiene", ["بهداشت خواب", "Sleep hygiene"], ["چند عادت ساده که کیفیت خواب را بهتر می‌کند.", "A few simple habits that tend to improve sleep."], 10, [
    ["ساعت خواب و بیداری را تا حد ممکن ثابت نگه دار.", "Keep sleep and wake times fairly regular."],
    ["یک تا دو ساعت قبل خواب صفحه و نور زیاد را کم کن؛ کافئین را از عصر کم کن.", "Cut screens and bright light 1–2 hours before bed; limit caffeine after midday."],
    ["اگر بیش از ۲۰ دقیقه نخوابیدی، بلند شو و کار آرام‌بخشی انجام بده.", "If awake over ~20 minutes, get up and do something calming."],
    ["اگر مشکل چند هفته ادامه داشت، با پزشک صحبت کن.", "If it lasts several weeks, talk to a doctor."]]),
  m("wind-down", ["روتین آرام‌شدن قبل خواب", "Evening wind-down"], ["۲۰ دقیقه روتین آرام که بدن را به خواب می‌برد.", "A calm 20-minute routine that leads your body toward sleep."], 20, [
    ["نور را کم کن و گوشی را دور از تخت بگذار.", "Dim the lights and park the phone away from bed."],
    ["فردا را روی کاغذ بیاور (۳ کار) تا ذهن رها شود.", "Write tomorrow's top 3 so your mind can let go."],
    ["۵ دقیقه تنفس هدایت‌شده یا صدای آرامش از ARSHNAZ.", "5 minutes of guided breathing or calming sound in ARSHNAZ."]]),
  m("declutter-10", ["نظم‌دادن ۱۰ دقیقه‌ای", "10-minute declutter"], ["فقط یک گوشه، ۱۰ دقیقه، هر روز.", "One corner, ten minutes, each day."], 10, [
    ["یک گوشهٔ کوچک (یک میز یا یک قفسه) انتخاب کن.", "Choose a small spot (a desk or one shelf)."],
    ["تایمر ۱۰ دقیقه: هر چیز را به سه دسته ببر: نگه دار، بده، بینداز.", "10-minute timer: sort into keep, give away, throw out."],
    ["همان روز بیندازیا ببر تحویل بده تا جلوی دید نماند.", "Remove the give-away/throw-out bags the same day."]]),
  m("simple-budget", ["بودجهٔ ساده (۵۰/۳۰/۲۰)", "Simple budget (50/30/20)"], ["درآمد را بین ضروری‌ها، خواسته‌ها و پس‌اندازِ تقسیم کن (قابل تنظیم برای شرایط خودت).", "Split income into needs, wants and savings (adjust to your situation)."], 20, [
    ["درآمد ماهانه و خرج‌های ثابت را بنویس.", "Write your monthly income and fixed costs."],
    ["۵۰٪ ضروری، ۳۰٪ خواسته، ۲۰٪ پس‌انداز یا بدهی را مبنا بگیر و متناسب با خودت اصلاح کن.", "Use 50% needs, 30% wants, 20% savings/debt as a base and adjust."],
    ["هر هفته ۵ دقیقه با بازبینی هفتگی خرج‌ها را ببین.", "Check spending for 5 minutes in your weekly review."]]),
];

export function getMethod(id?: string | null): MethodDef | undefined {
  return METHODS.find((x) => x.id === id);
}
