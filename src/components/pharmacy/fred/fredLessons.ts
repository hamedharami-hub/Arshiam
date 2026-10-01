export type L = readonly [fa: string, en: string];
export type FredToolId = "visualizer" | "terminal" | "dispense" | "labeling" | "pbspos" | "safetynet" | "workflow" | "review" | "retention" | "odt";
export type FredLessonId = "journey" | "reading" | "dispense" | "label" | "pbs-payment" | "safety-check" | "records";

export interface FredQuestion { id: string; prompt: L; choices: readonly L[]; correct: number; explanation: L }
export interface FredKeyPoint { front: L; back: L }
export interface FredLesson {
  id: FredLessonId;
  title: L;
  goal: L;
  concept: readonly L[];
  terms: readonly L[];
  example: { title: L; steps: readonly L[] };
  guided: readonly FredQuestion[];
  independent: { prompt: L; tool?: FredToolId };
  tools: readonly FredToolId[];
  keyPoints: readonly [FredKeyPoint, FredKeyPoint, FredKeyPoint];
  /** Lessons that mention rules, amounts or limits; those values come only from repo sample data or a current source. */
  needsVerification: boolean;
}

/** Old module id -> lesson that now hosts it (as a practice tool or concept). */
export const LEGACY_MODULE_TO_LESSON: Record<string, FredLessonId> = {
  workflow: "journey", visualizer: "reading", dispense: "dispense", terminal: "dispense", labeling: "label",
  pbspos: "pbs-payment", safetynet: "pbs-payment", review: "safety-check", retention: "records", odt: "records",
};

export const FRED_LESSONS: readonly FredLesson[] = [
  {
    id: "journey",
    title: ["سفر نسخه: از رسیدن تا تحویل", "The prescription journey: arrival to hand-over"],
    goal: ["ترتیب هفت مرحلهٔ کار روی یک نسخه را بشناس و بدان هر مرحله چه خطایی را می‌گیرد.", "Know the seven stages of handling a prescription and which error each stage catches."],
    concept: [
      ["هر نسخه از یک مسیر ثابت می‌گذرد: دریافت، خواندن و اعتبارسنجی، Dispense، برچسب، پرداخت (PBS)، بررسی ایمنی و Final Check، و در پایان ثبت سوابق و تحویل.", "Every prescription follows a fixed path: receive, read and validate, dispense, label, payment (PBS), safety and final check, then records and hand-over."],
      ["ترتیب مهم است؛ برچسب از داده‌ای ساخته می‌شود که در Dispense وارد کرده‌ای، پس خطای مرحلهٔ قبل به مراحل بعد منتقل می‌شود.", "Order matters: the label is built from what you entered at dispense, so an early error travels into every later stage."],
    ],
    terms: [["Script = نسخه", "Script = prescription"], ["Dispense = آماده‌سازی و تأمین دارو", "Dispense = prepare and supply the medicine"], ["Final Check = بررسی نهایی داروساز", "Final Check = the pharmacist's last verification"]],
    example: { title: ["نمونه: بیمار فرضی «الف» با یک نسخهٔ الکترونیک", "Example: fictional Patient A with an electronic script"], steps: [
      ["نسخه می‌رسد (token یا کاغذ).", "The script arrives (token or paper)."], ["اجزای نسخه خوانده و اعتبار آن بررسی می‌شود.", "Its components are read and validity is checked."], ["بیمار و دارو انتخاب و تعداد و Repeats وارد می‌شود.", "Patient and medicine are chosen; quantity and repeats are entered."], ["برچسب و CAL تولید می‌شود.", "The label and CAL are produced."], ["پرداخت و PBS ثبت می‌شود.", "Payment and PBS are recorded."], ["داروساز Final Check را انجام می‌دهد.", "The pharmacist performs the Final Check."], ["سوابق ثبت و دارو تحویل می‌شود.", "Records are kept and the medicine is handed over."]] },
    guided: [
      { id: "j1", prompt: ["کدام مرحله باید قبل از Dispense انجام شود؟", "Which stage must come before dispensing?"], choices: [["خواندن و اعتبارسنجی نسخه", "Reading and validating the script"], ["تحویل دارو", "Hand-over"], ["ثبت سوابق", "Record keeping"]], correct: 0, explanation: ["تا نسخه معتبر و کامل نباشد، ورود اطلاعات بی‌معنی است.", "Entering data is pointless until the script is valid and complete."] },
      { id: "j2", prompt: ["چرا خطای ورود دارو باید پیش از برچسب پیدا شود؟", "Why should a data-entry error be caught before labelling?"], choices: [["چون برچسب از همان داده ساخته می‌شود", "Because the label is built from that data"], ["چون برچسب اهمیتی ندارد", "Because the label does not matter"], ["چون چاپگر کند است", "Because the printer is slow"]], correct: 0, explanation: ["اگر داده غلط باشد، برچسب هم غلط می‌شود و باید دوباره ساخته شود.", "Wrong data yields a wrong label that must then be redone."] },
      { id: "j3", prompt: ["Final Check را چه کسی و کِی انجام می‌دهد؟", "Who performs the Final Check, and when?"], choices: [["داروساز، پیش از تحویل", "The pharmacist, before hand-over"], ["بیمار، بعد از خانه رفتن", "The patient, after getting home"], ["هیچ‌کس؛ اختیاری است", "No one; it is optional"]], correct: 0, explanation: ["Final Check آخرین بررسی ایمنی قبل از تأمین دارو است.", "It is the last safety verification before supply."] },
    ],
    independent: { prompt: ["هفت مرحله را از حفظ، به ترتیب برای یک نسخهٔ دلخواه بنویس و کنار هر مرحله یک خطای ممکن را یادداشت کن.", "Write the seven stages in order from memory for any script and note one possible error beside each."] },
    tools: [],
    keyPoints: [
      { front: ["ترتیب مراحل نسخه چیست؟", "What is the order of prescription stages?"], back: ["دریافت، خواندن/اعتبارسنجی، Dispense، برچسب، پرداخت، ایمنی/Final Check، سوابق/تحویل.", "Receive, read/validate, dispense, label, payment, safety/final check, records/hand-over."] },
      { front: ["چرا خطای اولیه خطرناک‌تر است؟", "Why is an early error more dangerous?"], back: ["چون به برچسب و مراحل بعدی منتقل می‌شود.", "It propagates into the label and every later stage."] },
      { front: ["Final Check برای چیست؟", "What is the Final Check for?"], back: ["آخرین بررسی ایمنی داروساز پیش از تأمین دارو.", "The pharmacist's last safety verification before supply."] },
    ],
    needsVerification: false,
  },
  {
    id: "reading",
    title: ["خواندن نسخه: اجزا، eScript، PBS/RPBS و Authority", "Reading a script: components, eScript, PBS/RPBS and Authority"],
    goal: ["اجزای یک نسخهٔ معتبر را پیدا کن و تفاوت token، PBS، RPBS و Authority را بدان.", "Find the components of a valid script and tell token, PBS, RPBS and Authority apart."],
    concept: [
      ["یک نسخهٔ معتبر معمولاً نام و اطلاعات تجویزکننده، نام بیمار، تاریخ، دارو با قدرت و شکل دارویی، تعداد، دستور مصرف، Repeats و امضا (کاغذی یا الکترونیک) دارد. اگر بخشی ناقص یا مبهم است، پیش از ادامه باید روشن شود.", "A valid script normally has prescriber details, patient name, date, medicine with strength and form, quantity, directions, repeats and a signature (paper or electronic). If a part is missing or unclear, resolve it before continuing."],
      ["در eScript، token مرجعی برای نسخهٔ الکترونیک است، نه خود دارو. PBS برنامهٔ یارانهٔ دارویی است و RPBS نسخهٔ مشابه برای افراد واجد شرایط خاص. بعضی داروهای PBS پیش از تأمین به تأیید (Authority) نیاز دارند.", "In an eScript the token is a reference to the electronic prescription, not the medicine itself. PBS is the medicine subsidy scheme and RPBS its counterpart for specific eligible people. Some PBS medicines need approval (Authority) before supply."],
    ],
    terms: [["Token = شناسهٔ نسخهٔ الکترونیک", "Token = electronic script reference"], ["Authority = تأیید پیش از تأمین برای برخی داروها", "Authority = approval before supply for some medicines"], ["PBS / RPBS", "PBS / RPBS"]],
    example: { title: ["نمونه: بازرسی یک نسخهٔ ساختگی در نمایشگر", "Example: inspecting a synthetic script in the visualizer"], steps: [["یک نسخهٔ نمونه را در ابزار پایین انتخاب کن.", "Choose a sample script in the tool below."], ["هر بخش را انتخاب و توضیح آن را بخوان.", "Select each section and read its explanation."], ["بخش‌هایی که ناقص‌اند را فهرست کن.", "List any section that is incomplete."]] },
    guided: [
      { id: "r1", prompt: ["نسخه‌ای بدون نام بیمار رسیده است. چه می‌کنی؟", "A script arrives with no patient name. What do you do?"], choices: [["پیش از ادامه آن را روشن می‌کنم", "Resolve it before continuing"], ["اسم را خودم حدس می‌زنم", "Guess the name myself"], ["فقط برچسب را چاپ می‌کنم", "Just print the label"]], correct: 0, explanation: ["اجزای ناقص حدس زده نمی‌شوند؛ باید از منبع معتبر روشن شوند.", "Missing components are never guessed; clarify them from a reliable source."] },
      { id: "r2", prompt: ["token در eScript چیست؟", "What is a token in an eScript?"], choices: [["مرجعی برای دسترسی به نسخهٔ الکترونیک", "A reference to reach the electronic script"], ["خود دارو", "The medicine itself"], ["رسید پرداخت", "A payment receipt"]], correct: 0, explanation: ["token نسخه را پیدا می‌کند و جای بررسی محتوای آن را نمی‌گیرد.", "The token locates the script; it does not replace checking its content."] },
      { id: "r3", prompt: ["Authority یعنی چه؟", "What does Authority mean?"], choices: [["برای برخی داروهای PBS پیش از تأمین تأیید لازم است", "Some PBS medicines need approval before supply"], ["دارو همیشه رایگان است", "The medicine is always free"], ["نسخه منقضی شده", "The script has expired"]], correct: 0, explanation: ["اینکه کدام دارو Authority می‌خواهد را از منبع جاری PBS بررسی کن؛ این درس فهرست نمی‌دهد.", "Check which medicine needs Authority in the current PBS source; this lesson lists none."] },
    ],
    independent: { prompt: ["در نمایشگر، دو نسخهٔ نمونه را مقایسه کن و تفاوت اجزایشان را بنویس.", "In the visualizer compare two sample scripts and write down how their components differ."], tool: "visualizer" },
    tools: ["visualizer"],
    keyPoints: [
      { front: ["اگر بخشی از نسخه ناقص است چه کنیم؟", "What if a script component is missing?"], back: ["قبل از ادامه از منبع معتبر روشن می‌شود؛ حدس زده نمی‌شود.", "Clarify it from a reliable source before continuing; never guess."] },
      { front: ["token چیست؟", "What is a token?"], back: ["مرجع نسخهٔ الکترونیک، نه خود دارو.", "A reference to the electronic script, not the medicine."] },
      { front: ["Authority چیست؟", "What is Authority?"], back: ["تأیید لازم پیش از تأمین برخی داروهای PBS؛ فهرست آن را از منبع جاری بخوان.", "Approval needed before supplying some PBS medicines; read the list from the current source."] },
    ],
    needsVerification: true,
  },
  {
    id: "dispense",
    title: ["Dispense: بیمار، دارو، تعداد، Repeats و جایگزینی برند", "Dispense: patient, medicine, quantity, repeats and brand substitution"],
    goal: ["بیمار و دارو را درست انتخاب کن و معنی تعداد، Repeats و جایگزینی برند را بفهم.", "Select the right patient and medicine and understand quantity, repeats and brand substitution."],
    concept: [
      ["اول بیمار درست را با دو شناسهٔ مستقل (مثلاً نام و تاریخ تولد) تأیید کن. بعد دارو، قدرت و شکل دارویی را مطابق نسخه انتخاب کن و تعداد را وارد کن.", "First confirm the right patient with two independent identifiers (for example name and date of birth). Then select the medicine, strength and form as written and enter the quantity."],
      ["Repeats یعنی تعداد دفعات تأمین مجازِ بعد از تأمین اول؛ با هر تأمین باید شمارش به‌روز شود. جایگزینی برند فقط وقتی مجاز است که قوانین جاری و نظر تجویزکننده اجازه بدهند.", "Repeats are the permitted further supplies after the first; the count must update on every supply. Brand substitution is allowed only where current rules and the prescriber's instruction permit it."],
    ],
    terms: [["Repeats = تأمین‌های مجاز بعدی", "Repeats = permitted further supplies"], ["Brand substitution = جایگزینی برند", "Brand substitution = swapping brand"], ["Shortcut = میان‌بر ورود دستور مصرف", "Shortcut = quick entry for directions"]],
    example: { title: ["نمونه: دو بیمار فرضی با نام خانوادگی یکسان", "Example: two fictional patients with the same surname"], steps: [["هر دو پروفایل را در ابزار پایین ببین.", "Look at both profiles in the tool below."], ["با تاریخ تولد، بیمار درست را تأیید کن.", "Confirm the right patient using date of birth."], ["تعداد و Repeats را وارد و در شبیه‌ساز نتیجه را بررسی کن.", "Enter quantity and repeats and check the result in the simulator."]] },
    guided: [
      { id: "d1", prompt: ["دو بیمار نام خانوادگی یکسان دارند. چه می‌کنی؟", "Two patients share a surname. What do you do?"], choices: [["با یک شناسهٔ دوم مثل تاریخ تولد تأیید می‌کنم", "Confirm with a second identifier such as date of birth"], ["اولین پروفایل را برمی‌دارم", "Take the first profile"], ["از بیمار نمی‌پرسم", "Do not ask the patient"]], correct: 0, explanation: ["شناسهٔ دوم از اشتباه در پروفایل جلوگیری می‌کند.", "A second identifier prevents wrong-profile errors."] },
      { id: "d2", prompt: ["پس از یک تأمین، شمارش Repeats چه می‌شود؟", "After a supply, what happens to the repeats count?"], choices: [["یکی از Repeats باقی‌مانده کم می‌شود", "One remaining repeat is used up"], ["تغییری نمی‌کند", "It does not change"], ["دو برابر می‌شود", "It doubles"]], correct: 0, explanation: ["هر تأمین یک Repeat مصرف می‌کند؛ مقدار دقیق از خود نسخه می‌آید.", "Each supply consumes one repeat; the exact figure comes from the script itself."] },
      { id: "d3", prompt: ["تجویزکننده جایگزینی برند را ممنوع کرده است. چه می‌کنی؟", "The prescriber has not permitted brand substitution. What do you do?"], choices: [["همان برند نوشته‌شده را تأمین می‌کنم", "Supply the brand as written"], ["برند ارزان‌تر را می‌دهم", "Give a cheaper brand"], ["نسخه را نادیده می‌گیرم", "Ignore the script"]], correct: 0, explanation: ["دستور صریح تجویزکننده بر ترجیح دیگر مقدم است؛ قوانین جاری را هم بررسی کن.", "An explicit prescriber instruction takes priority; also check current rules."] },
    ],
    independent: { prompt: ["در شبیه‌ساز، یک سناریو را کامل Dispense کن و تأیید بدهی (owing) را هم امتحان کن.", "Complete one scenario in the simulator and also try the owing reconciliation."], tool: "dispense" },
    tools: ["dispense", "terminal"],
    keyPoints: [
      { front: ["تأیید بیمار چگونه است؟", "How do you confirm the patient?"], back: ["با دو شناسهٔ مستقل مثل نام و تاریخ تولد.", "With two independent identifiers such as name and date of birth."] },
      { front: ["Repeats چیست؟", "What are repeats?"], back: ["تأمین‌های مجاز بعد از اولین تأمین؛ با هر تأمین شمارش به‌روز می‌شود.", "Permitted further supplies after the first; the count updates each supply."] },
      { front: ["اگر جایگزینی برند ممنوع است؟", "If brand substitution is not permitted?"], back: ["همان برند نوشته‌شده تأمین می‌شود.", "Supply the brand as written."] },
    ],
    needsVerification: true,
  },
  {
    id: "label",
    title: ["برچسب: دستور مصرف و CAL", "Label: directions and CAL"],
    goal: ["دستور مصرف را روشن بنویس و بدان CAL چه نقشی دارد.", "Write clear directions and know what CAL does."],
    concept: [
      ["برچسب باید همان چیزی را نشان دهد که واقعاً تأمین می‌شود: نام بیمار، دارو و قدرت، تعداد، دستور مصرف و تاریخ. دستور مصرف به زبان ساده و بدون ابهام نوشته می‌شود.", "The label must show exactly what is supplied: patient name, medicine and strength, quantity, directions and date. Directions are written in plain, unambiguous language."],
      ["CAL (Cautionary Advisory Labels) برچسب‌های هشدار کوتاه‌اند که بر اساس ویژگی دارو انتخاب می‌شوند. متن و شمارهٔ هر CAL از دادهٔ مرجع برنامه می‌آید و نیاز به تأیید دارد.", "CAL (Cautionary Advisory Labels) are short warning labels chosen by the medicine's properties. Each CAL's text and number come from the app's reference data and need verification."],
    ],
    terms: [["CAL = برچسب هشدار کمکی", "CAL = cautionary advisory label"], ["Directions = دستور مصرف", "Directions = instructions for use"]],
    example: { title: ["نمونه: ساخت یک برچسب تمرینی", "Example: building a practice label"], steps: [["دستور مصرف نمونه را بخوان.", "Read the sample directions."], ["یک CAL اضافه یا حذف کن و پیش‌نمایش را ببین.", "Add or remove a CAL and watch the preview."], ["برچسب را با نسخه تطبیق بده.", "Compare the label with the script."]] },
    guided: [
      { id: "l1", prompt: ["کدام دستور مصرف روشن‌تر است؟", "Which direction is clearer?"], choices: [["«یک قرص دو بار در روز»", "“Take one tablet twice a day”"], ["«طبق معمول»", "“As usual”"], ["«هر وقت لازم شد»", "“Whenever”"]], correct: 0, explanation: ["دستور باید مقدار و دفعات را صریح بگوید.", "Directions must state the amount and frequency explicitly."] },
      { id: "l2", prompt: ["CAL برای چیست؟", "What is CAL for?"], choices: [["هشدار کوتاه و مرتبط با دارو به بیمار", "A short, medicine-relevant warning to the patient"], ["تبلیغ داروخانه", "Advertising the pharmacy"], ["جایگزین دستور مصرف", "A replacement for directions"]], correct: 0, explanation: ["CAL مکمل دستور مصرف است، نه جایگزین آن.", "CAL complements directions; it does not replace them."] },
      { id: "l3", prompt: ["تعداد تأمین‌شده عوض شد. با برچسب چه می‌کنی؟", "The quantity supplied changed. What about the label?"], choices: [["برچسب را دوباره می‌سازم", "Regenerate the label"], ["همان را می‌چسبانم", "Stick the old one on"], ["با دست خط می‌زنم", "Hand-edit it"]], correct: 0, explanation: ["برچسب باید با آنچه تأمین می‌شود یکی باشد.", "The label must match what is supplied."] },
    ],
    independent: { prompt: ["در ابزار، فیلدها و CAL را تغییر بده و ببین پیش‌نمایش چه می‌شود؛ تفاوت‌ها را یادداشت کن.", "In the tool change the fields and CAL and note how the preview changes."], tool: "labeling" },
    tools: ["labeling"],
    keyPoints: [
      { front: ["برچسب باید چه چیزی را نشان دهد؟", "What must the label show?"], back: ["دقیقاً آنچه تأمین می‌شود: بیمار، دارو/قدرت، تعداد، دستور مصرف، تاریخ.", "Exactly what is supplied: patient, medicine/strength, quantity, directions, date."] },
      { front: ["دستور مصرف خوب چیست؟", "What makes good directions?"], back: ["ساده، صریح، با مقدار و دفعات.", "Plain, explicit, with amount and frequency."] },
      { front: ["CAL چیست؟", "What is CAL?"], back: ["برچسب هشدار کوتاه مکمل دستور مصرف؛ متنش از مرجع و با تأیید.", "A short warning label complementing directions; text from reference data, verified."] },
    ],
    needsVerification: true,
  },
  {
    id: "pbs-payment",
    title: ["PBS و پرداخت: Concession، co-payment، Safety Net و POS", "PBS and payment: concession, co-payment, Safety Net and POS"],
    goal: ["مفهوم co-payment، Concession و Safety Net را بفهم؛ هیچ مبلغی را بدون منبع جاری به‌کار نبر.", "Understand co-payment, concession and Safety Net; never use an amount without a current source."],
    concept: [
      ["co-payment سهم پرداختیِ بیمار برای داروی PBS است. وضعیت بیمار (مثلاً Concession یا عمومی) بر سهم او اثر می‌گذارد. POS یعنی ثبت فروش و ارسال اطلاعات پرداخت در سیستم داروخانه.", "Co-payment is the patient's share for a PBS medicine. The patient's category (for example concession or general) affects that share. POS is recording the sale and payment data in the pharmacy system."],
      ["Safety Net سازوکاری است که پرداخت‌های بیمار را در طول زمان جمع می‌زند و پس از رسیدن به سقف، سهم او کاهش می‌یابد. مبلغ‌ها و سقف‌ها هر سال تغییر می‌کنند؛ فقط از منبع رسمی جاری بخوان.", "Safety Net accumulates the patient's payments over time and reduces their share after a threshold is reached. Amounts and thresholds change yearly; read them only from the current official source."],
    ],
    terms: [["Concession = وضعیت ارفاقی", "Concession = concessional status"], ["Co-payment = سهم بیمار", "Co-payment = patient share"], ["Safety Net", "Safety Net"], ["POS = ثبت فروش", "POS = point of sale"]],
    example: { title: ["نمونه: دسته‌بندی اقلام و محاسبهٔ تمرینی", "Example: categorising items and a practice calculation"], steps: [["در ابزار PBS/POS هر قلم نمونه را به گروهش اختصاص بده.", "In the PBS/POS tool assign each sample item to its group."], ["در ابزار Safety Net سناریو را بخوان و محاسبه کن.", "In the Safety Net tool read the scenario and calculate."], ["ارقام نمونه را مرجع واقعی ندان.", "Do not treat sample figures as real references."]] },
    guided: [
      { id: "p1", prompt: ["co-payment یعنی چه؟", "What does co-payment mean?"], choices: [["سهم پرداختیِ بیمار", "The patient's share"], ["کل قیمت دارو برای دولت", "The government's full cost"], ["هزینهٔ برچسب", "The label cost"]], correct: 0, explanation: ["بخشی از هزینه را بیمار می‌پردازد؛ مقدارش از منبع جاری می‌آید.", "The patient pays part of the cost; the amount comes from a current source."] },
      { id: "p2", prompt: ["مبلغ سقف Safety Net را از کجا بخوانی؟", "Where do you read the Safety Net threshold from?"], choices: [["منبع رسمی جاری", "The current official source"], ["حافظه یا این درس", "Memory or this lesson"], ["از بیمار", "From the patient"]], correct: 0, explanation: ["این مبلغ‌ها هر سال عوض می‌شوند و در این درس عمداً نیامده‌اند.", "These amounts change yearly and are deliberately absent from this lesson."] },
      { id: "p3", prompt: ["POS چیست؟", "What is POS?"], choices: [["ثبت فروش و اطلاعات پرداخت", "Recording the sale and payment data"], ["بررسی تداخل دارویی", "A drug-interaction check"], ["نوعی برچسب", "A kind of label"]], correct: 0, explanation: ["POS مرحلهٔ پرداخت را در سیستم ثبت می‌کند.", "POS records the payment stage in the system."] },
    ],
    independent: { prompt: ["دسته‌بندی PBS/POS را کامل کن و سپس یک سناریوی Safety Net را حل کن.", "Complete the PBS/POS categorisation, then solve one Safety Net scenario."], tool: "pbspos" },
    tools: ["pbspos", "safetynet"],
    keyPoints: [
      { front: ["co-payment چیست؟", "What is co-payment?"], back: ["سهم پرداختی بیمار برای داروی PBS.", "The patient's share for a PBS medicine."] },
      { front: ["Safety Net چه می‌کند؟", "What does Safety Net do?"], back: ["پرداخت‌ها را جمع می‌زند و پس از سقف، سهم بیمار را کم می‌کند.", "Accumulates payments and lowers the patient's share after a threshold."] },
      { front: ["مبالغ و سقف‌ها از کجا؟", "Where do amounts and thresholds come from?"], back: ["فقط از منبع رسمی جاری؛ نیاز به تأیید.", "Only from the current official source; verify them."] },
    ],
    needsVerification: true,
  },
  {
    id: "safety-check",
    title: ["بررسی ایمنی و Final Check", "Safety review and Final Check"],
    goal: ["فهرست بررسی ایمنی را بشناس و Final Check را سه‌سویه انجام بده: نسخه، برچسب و محصول.", "Know the safety checklist and do the Final Check three ways: script, label and product."],
    concept: [
      ["بررسی ایمنی شامل حساسیت‌ها، تداخل‌ها، داروی تکراری، مناسب‌بودن مصرف برای بیمار و نیاز به مشاوره است. هر نگرانی باید پیش از تأمین به داروساز برسد.", "Safety review covers allergies, interactions, duplicate therapy, suitability for the patient and counselling needs. Any concern must reach the pharmacist before supply."],
      ["Final Check سه‌سویه است: نسخه ⇄ برچسب ⇄ محصول فیزیکی. اگر هرکدام نخواند، به مرحلهٔ مربوط برمی‌گردی، اصلاح می‌کنی و دوباره بررسی می‌کنی.", "The Final Check is three-way: script ⇄ label ⇄ physical product. If any pair disagrees, go back to the relevant stage, correct it and check again."],
    ],
    terms: [["Final Check", "Final Check"], ["Interaction = تداخل", "Interaction = drug interaction"], ["Counselling = مشاورهٔ مصرف", "Counselling = advice on use"]],
    example: { title: ["نمونه: چک‌لیست بازبینی نمونه", "Example: a sample review checklist"], steps: [["نمونه را در ابزار انتخاب کن.", "Choose an entry in the tool."], ["هر مورد چک‌لیست را با اطلاعات نمونه مقایسه کن.", "Compare each checklist item with the sample."], ["پس از تکمیل شرایط، پیش‌نمایش آموزشی را باز کن.", "After completing the requirements open the educational preview."]] },
    guided: [
      { id: "s1", prompt: ["برچسب با نسخه نمی‌خواند. چه می‌کنی؟", "The label does not match the script. What do you do?"], choices: [["به مرحلهٔ برچسب برمی‌گردم، اصلاح و دوباره بررسی می‌کنم", "Return to labelling, correct and re-check"], ["نادیده می‌گیرم", "Ignore it"], ["نسخه را عوض می‌کنم", "Alter the script"]], correct: 0, explanation: ["اصلاح همیشه در مرحلهٔ منشأ خطا انجام و دوباره بررسی می‌شود.", "Correct at the stage where the error began, then check again."] },
      { id: "s2", prompt: ["سه سوی Final Check کدامند؟", "What are the three sides of the Final Check?"], choices: [["نسخه، برچسب، محصول", "Script, label, product"], ["قیمت، رنگ، اندازه", "Price, colour, size"], ["بیمار، ماشین، بیمه", "Patient, car, insurance"]], correct: 0, explanation: ["سه‌سویه‌بودن خطاهای تک‌سویه را می‌گیرد.", "Three-way checking catches one-sided errors."] },
      { id: "s3", prompt: ["نگرانی دربارهٔ تداخل دارویی پیدا کردی. اولین کار؟", "You spot a possible interaction. First action?"], choices: [["آن را به داروساز گزارش می‌دهم", "Report it to the pharmacist"], ["دارو را تحویل می‌دهم و بعداً می‌گویم", "Hand over now and tell later"], ["بیمار را نادیده می‌گیرم", "Ignore it"]], correct: 0, explanation: ["قضاوت بالینی با داروساز است؛ نگرانی باید پیش از تأمین گزارش شود.", "Clinical judgement rests with the pharmacist; report concerns before supply."] },
    ],
    independent: { prompt: ["بازبینی نمونه را کامل کن و گردش کار کامل (برچسب، بازبینی، Safety Net، ODT) را یک‌بار از ابتدا تا انتها برو.", "Complete a sample review and walk the full workflow (label, check, Safety Net, ODT) once end to end."], tool: "review" },
    tools: ["review", "workflow"],
    keyPoints: [
      { front: ["Final Check چه چیزهایی را مقایسه می‌کند؟", "What does the Final Check compare?"], back: ["نسخه، برچسب و محصول فیزیکی.", "Script, label and physical product."] },
      { front: ["اگر چیزی نخواند؟", "If something does not match?"], back: ["به مرحلهٔ خطا برمی‌گردیم، اصلاح و دوباره بررسی می‌کنیم.", "Go back to the stage of the error, correct and re-check."] },
      { front: ["نگرانی ایمنی را به چه کسی می‌گوییم؟", "Who gets safety concerns?"], back: ["داروساز، پیش از تأمین.", "The pharmacist, before supply."] },
    ],
    needsVerification: false,
  },
  {
    id: "records",
    title: ["ثبت سوابق و نگهداری", "Records and retention"],
    goal: ["بدان چرا سوابق نگه داشته می‌شود و مدت نگهداری را هرگز حدس نزن.", "Know why records are kept and never guess a retention period."],
    concept: [
      ["سوابق نسخه، توضیح بدهی (owing) و ثبت‌های ویژه مثل ODT برای پاسخ‌گویی، پیگیری و بازرسی نگه داشته می‌شوند. نوع مدرک تعیین می‌کند کجا و چگونه نگهداری شود.", "Script records, owing notices and special logs such as ODT are kept for accountability, follow-up and audit. The type of document decides where and how it is kept."],
      ["مدت نگهداری به قانون ایالت یا قلمرو و نوع مدرک بستگی دارد و در این درس عدد داده نمی‌شود؛ از منبع جاری بخوان و نیاز به تأیید دارد.", "Retention periods depend on the state or territory and document type; no figure is given in this lesson. Read the current source and verify."],
    ],
    terms: [["Retention = نگهداری مدارک", "Retention = keeping documents"], ["ODT = ثبت جلسهٔ درمان جایگزین", "ODT = opioid dependence treatment session record"]],
    example: { title: ["نمونه: دسته‌بندی مدارک نمونه", "Example: sorting sample documents"], steps: [["هر مدرک نمونه را بخوان.", "Read each sample document."], ["برای هر مدرک یک دسته انتخاب کن.", "Choose a category for each."], ["پاسخ‌ها را بررسی و موارد اشتباه را با توضیح مقایسه کن.", "Check answers and compare mistakes with the explanation."]] },
    guided: [
      { id: "rc1", prompt: ["مدت نگهداری یک مدرک را نمی‌دانی. چه می‌کنی؟", "You do not know a document's retention period. What do you do?"], choices: [["از منبع جاری بررسی می‌کنم", "Check the current source"], ["حدس می‌زنم", "Guess"], ["دور می‌ریزم", "Throw it away"]], correct: 0, explanation: ["مدت‌ها طبق قانون تغییر می‌کنند و حدس‌زدن خطرناک است.", "Periods follow the law and change; guessing is risky."] },
      { id: "rc2", prompt: ["چرا ثبت سوابق مهم است؟", "Why do records matter?"], choices: [["پاسخ‌گویی و پیگیری", "Accountability and follow-up"], ["فقط برای شلوغی میز", "Just to fill the desk"], ["برای تبلیغ", "For advertising"]], correct: 0, explanation: ["سوابق نشان می‌دهد چه تأمین شد و چه کسی چه کرد.", "Records show what was supplied and who did what."] },
      { id: "rc3", prompt: ["ابزار ODT در این برنامه چه می‌کند؟", "What does the ODT tool in this app do?"], choices: [["قالب و چک‌لیست ثبت را آموزش می‌دهد", "Teaches the recording format and checklist"], ["دوز واقعی بیمار را ثبت می‌کند", "Records a real patient's dose"], ["نسخه را تغییر می‌دهد", "Changes the script"]], correct: 0, explanation: ["ابزار آموزشی است و به سیستم واقعی وصل نیست.", "It is educational and not connected to a real system."] },
    ],
    independent: { prompt: ["دسته‌بندی مدارک را کامل کن و یک جلسهٔ نمونهٔ ODT را مرور کن.", "Complete the document sorting and review a sample ODT session."], tool: "retention" },
    tools: ["retention", "odt"],
    keyPoints: [
      { front: ["چرا سوابق نگه داشته می‌شود؟", "Why keep records?"], back: ["برای پاسخ‌گویی، پیگیری و بازرسی.", "For accountability, follow-up and audit."] },
      { front: ["مدت نگهداری را از کجا بدانیم؟", "Where do you learn a retention period?"], back: ["از منبع جاری قانون ایالت/قلمرو؛ حدس زده نمی‌شود.", "From the current state/territory source; never guessed."] },
      { front: ["ابزار ODT چیست؟", "What is the ODT tool?"], back: ["تمرین قالب و چک‌لیست؛ دوز واقعی ثبت نمی‌کند.", "A format and checklist exercise; records no real doses."] },
    ],
    needsVerification: true,
  },
];

export const FRED_LESSON_IDS = FRED_LESSONS.map(l => l.id);
export const getLesson = (id: string): FredLesson | undefined => FRED_LESSONS.find(l => l.id === id);
export const isFredLessonId = (v: string | null | undefined): v is FredLessonId => !!v && FRED_LESSON_IDS.includes(v as FredLessonId);
/** Section order of a lesson; stepIndex is an index into it. */
export const LESSON_SECTIONS = ["goal", "concept", "example", "guided", "independent", "keypoints"] as const;
export type LessonSection = (typeof LESSON_SECTIONS)[number];
