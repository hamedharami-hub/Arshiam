export type FredModuleId = "workflow" | "dispense" | "visualizer" | "labeling" | "review" | "safetynet" | "retention" | "terminal" | "odt" | "pbspos";
type Localized = readonly [fa: string, en: string];
export interface FredLesson {
  id: FredModuleId;
  group: "prescription" | "workflow" | "operations";
  title: Localized;
  goal: Localized;
  steps: readonly Localized[];
  question: Localized;
  answers: readonly Localized[];
  correct: number;
  explanation: Localized;
}

/** Teaching instructions describe the simulator. Clinical fixtures remain in their source modules. */
export const FRED_CURRICULUM: readonly FredLesson[] = [
  {
    id: "visualizer", group: "prescription", title: ["نمایشگر و بازرس نسخه", "Script Visualizer"],
    goal: ["اجزای نسخهٔ نمونه را پیدا کن و توضیح هر بخش را بخوان.", "Identify the parts of a sample prescription and read each section's explanation."],
    steps: [["یک نسخهٔ نمونه انتخاب کن.", "Choose a sample prescription."], ["بخش‌های نسخه را یکی‌یکی انتخاب و با توضیح کنار آن مقایسه کن.", "Select each prescription section and compare it with the accompanying explanation."], ["قبل از تمرین ورود اطلاعات، موارد مبهم را در نمونه مشخص کن.", "Identify ambiguous fields in the sample before practising data entry."]],
    question: ["برای بررسی یک بخش نسخه در نمایشگر چه می‌کنی؟", "How do you inspect a prescription field in the visualizer?"],
    answers: [["همان بخش را انتخاب می‌کنم و توضیحش را می‌خوانم.", "Select the field and read its explanation."], ["نام بخش را در ترمینال می‌نویسم.", "Type its name in the terminal."], ["پیش‌نمایش را تأیید می‌کنم.", "Confirm the preview."]], correct: 0,
    explanation: ["نمایشگر برای شناخت اجزای نسخه است؛ انتخاب بخش، توضیح آن را باز می‌کند.", "The visualizer teaches prescription structure; selecting a field opens its explanation."],
  },
  {
    id: "dispense", group: "prescription", title: ["نسخه‌پیچی و شرت‌کات‌ها (FRED)", "FRED Dispense"],
    goal: ["سه مرحلهٔ بررسی نسخه، تفسیر شرت‌کات و تطبیق بدهی را در محیط تمرینی طی کن.", "Work through script review, shortcut interpretation and owing reconciliation in the training environment."],
    steps: [["سناریو را انتخاب کن و اطلاعات و هشدارهای همان نسخه را بخوان.", "Select a scenario and read its script information and warnings."], ["در مرحلهٔ شرت‌کات، ورودی را تغییر بده و نتیجهٔ تفسیر را مقایسه کن.", "Change the shortcut input and compare the parsed result."], ["در مرحلهٔ بدهی، بارکد تمرینی را تطبیق بده و پیش‌نمایش را بررسی کن.", "Reconcile the training barcode in the owing step and inspect the preview."]],
    question: ["پیش‌نمایش برگهٔ بدهی در این تمرین چه اثری دارد؟", "What does the owing notice preview do in this exercise?"],
    answers: [["نسخهٔ واقعی را ثبت می‌کند.", "Records a real prescription."], ["یک برگهٔ شبیه‌سازی‌شده داخل برنامه نشان می‌دهد.", "Displays a simulated notice inside the app."], ["برگه را به چاپگر ارسال می‌کند.", "Sends the notice to a printer."]], correct: 1,
    explanation: ["پیش‌نمایش داخل برنامه است؛ اطلاعات به چاپگر یا سرویس خارجی ارسال نمی‌شود.", "The preview stays inside the app; it sends nothing to printers or external services."],
  },
  {
    id: "labeling", group: "prescription", title: ["طراحی برچسب دارو", "Dispensing Label"],
    goal: ["تغییر اطلاعات و برچسب‌های کمکی را در پیش‌نمایش تمرینی مشاهده کن.", "Observe how label fields and auxiliary labels affect the training preview."],
    steps: [["اطلاعات نمونه و دستور مصرف درج‌شده را بخوان.", "Read the sample details and supplied directions."], ["فیلدها و برچسب‌های کمکی را تغییر بده و پیش‌نمایش را مقایسه کن.", "Change fields and auxiliary labels, then compare the preview."], ["تفاوت دادهٔ واردشده و نمونه را بررسی کن؛ این پیش‌نمایش تأیید بالینی نیست.", "Check differences between your entry and the sample; this preview is not clinical approval."]],
    question: ["پیش‌نمایش برچسب چه چیزی را نشان می‌دهد؟", "What does the label preview show?"],
    answers: [["اطلاعاتی که در تمرین وارد کرده‌ام.", "The information entered in the exercise."], ["تأیید داروساز واقعی.", "A real pharmacist's approval."], ["اطلاعات یک بیمار واقعی.", "A real patient's information."]], correct: 0,
    explanation: ["پیش‌نمایش بازتاب ورودی توست؛ جایگزین بررسی نسخه یا تأیید داروساز نیست.", "The preview reflects your input; it does not replace script review or pharmacist approval."],
  },
  {
    id: "review", group: "workflow", title: ["پیش‌نمایش بازبینی پایانی", "Final Review Preview"],
    goal: ["چک‌لیست بازبینی نمونه را کامل کن و شرایط فعال‌شدن پیش‌نمایش را بفهم.", "Complete the sample review checklist and understand when its preview becomes available."],
    steps: [["نمونهٔ مورد بازبینی را انتخاب کن.", "Choose an entry to review."], ["هر مورد چک‌لیست را با اطلاعات نمونه مقایسه کن.", "Compare each checklist item with the sample information."], ["پس از تکمیل شرایط، پیش‌نمایش آموزشی را باز کن.", "Open the educational preview after completing its requirements."]],
    question: ["برای فعال‌شدن پیش‌نمایش چه باید کرد؟", "What makes the preview available?"],
    answers: [["فقط نام نمونه را انتخاب کرد.", "Only select an entry."], ["شرایط و چک‌لیست همان تمرین را کامل کرد.", "Complete the exercise's requirements and checklist."], ["از صفحه خارج شد.", "Leave the page."]], correct: 1,
    explanation: ["فعال‌شدن پیش‌نمایش به شرایط تمرین وابسته است؛ تأیید واقعی نسخه نیست.", "Preview availability depends on exercise requirements; it is not a real dispensing approval."],
  },
  {
    id: "workflow", group: "workflow", title: ["گردش کار کامل", "Full workflow (label, check, Safety Net, ODT)"],
    goal: ["ابزارهای برچسب، بازبینی، Safety Net و دفتر ODT را در یک فضای تمرینی به هم وصل کن.", "Use the label, final-check, Safety Net and ODT tools in one practice workspace."],
    steps: [["نسخهٔ نمونه را انتخاب و برچسب تمرینی را تکمیل کن.", "Choose a sample script and complete its practice label."], ["در بازبینی نهایی، ورودی برچسب را با نسخه مقایسه کن.", "Compare the label input with the script in the final-check step."], ["تب‌های Safety Net و ODT ابزارهای جداگانهٔ همان فضای تمرینی‌اند؛ شرایط و توضیح هرکدام را بخوان.", "Safety Net and ODT are separate tools in the workspace; read each tool's conditions and guidance."]],
    question: ["اگر در بازبینی نهایی ورودی برچسب نیاز به اصلاح داشته باشد چه می‌کنی؟", "If final checking reveals a label entry needs correction, what do you do?"],
    answers: [["به برچسب برمی‌گردم، اصلاح می‌کنم و دوباره بررسی می‌کنم.", "Return to the label, correct it and check again."], ["دادهٔ نمونه را تغییر می‌دهم.", "Change the sample source data."], ["آن مورد را نادیده می‌گیرم.", "Ignore the item."]], correct: 0,
    explanation: ["برچسب و بررسی به هم متصل‌اند؛ اصلاح ورودی باید دوباره بررسی شود.", "Label entry and final checking are connected; corrected input needs another check."],
  },
  {
    id: "safetynet", group: "workflow", title: ["محاسبه‌گر Safety Net", "Safety Net Practice"],
    goal: ["داده‌های سناریو را بخوان، محاسبهٔ نمونه را انجام بده و پاسخ خود را با نتیجه مقایسه کن.", "Read the scenario values, perform the sample calculation and compare your answer with its result."],
    steps: [["سناریو و مقدارهای درج‌شده در نمونه را بخوان.", "Read the scenario and its supplied values."], ["مراحل محاسبه و پرسش وضعیت را پاسخ بده.", "Complete the calculation and status questions."], ["بازخورد را با مقدارهای همان سناریو مقایسه کن؛ ارقام نمونه مرجع جاری نیستند.", "Compare feedback with that scenario's values; sample figures are not a current reference."]],
    question: ["در این تمرین محاسبه را بر اساس چه داده‌ای انجام می‌دهی؟", "Which values should you use for this exercise?"],
    answers: [["عددهای سناریوی انتخاب‌شده.", "The selected scenario's supplied values."], ["عددهای یک سناریوی دیگر.", "Values from another scenario."], ["عددهای حدسی.", "Guessed values."]], correct: 0,
    explanation: ["هدف تمرین فهم محاسبه با دادهٔ نمونه است؛ کاربرد واقعی نیاز به منبع جاری دارد.", "This exercise teaches the calculation using sample data; real use requires a current source."],
  },
  {
    id: "terminal", group: "operations", title: ["ترمینال تمرینی", "Practice Terminal"],
    goal: ["فرمان‌های پشتیبانی‌شدهٔ شبیه‌ساز را وارد کن و بازخوردشان را بخوان.", "Enter supported simulator commands and read their feedback."],
    steps: [["راهنمای فرمان‌ها و نمونه‌های پیشنهادی را ببین.", "Read the command guide and suggested examples."], ["یک فرمان را وارد کن و تغییر وضعیت و پیام نتیجه را بررسی کن.", "Enter a command and inspect its state change and result message."], ["ورودی نامعتبر را هم امتحان کن و با راهنما اصلاحش کن.", "Try an invalid input and use the guide to correct it."]],
    question: ["این ترمینال فرمان‌ها را کجا اجرا می‌کند؟", "Where does this terminal execute commands?"],
    answers: [["روی سیستم داروخانهٔ واقعی.", "On a real pharmacy system."], ["در شبیه‌ساز آموزشی داخل برنامه.", "In the app's educational simulator."], ["روی سیستم‌عامل گوشی.", "On the phone's operating system."]], correct: 1,
    explanation: ["فرمان‌ها فقط وضعیت تمرین را تغییر می‌دهند و به سیستم واقعی متصل نیستند.", "Commands only change the exercise state; they are not connected to a real system."],
  },
  {
    id: "retention", group: "operations", title: ["بایگانی و نگهداری مدارک", "Document Retention"],
    goal: ["مدارک نمونه را در دسته‌های تمرین قرار بده و پاسخ‌ها را بررسی کن.", "Assign sample documents to the exercise's categories and check your answers."],
    steps: [["هر مدرک و گزینه‌های نگهداری تمرین را بخوان.", "Read each document and the exercise's retention options."], ["برای هر مدرک یک دسته انتخاب کن.", "Choose a category for each document."], ["پاسخ‌ها را بررسی و موارد اشتباه را با توضیح منبع مقایسه کن.", "Check the answers and compare mistakes with the source explanation."]],
    question: ["قبل از بررسی پاسخ‌ها چه باید تکمیل شود؟", "What must be completed before checking answers?"],
    answers: [["انتخاب دسته برای همهٔ مدارک تمرین.", "A category selection for every exercise document."], ["فقط انتخاب اولین مدرک.", "Only a selection for the first document."], ["نوشتن نام بیمار.", "Entering a patient's name."]], correct: 0,
    explanation: ["بررسی این تمرین پس از انتخاب دسته‌های مدارک فعال می‌شود؛ قوانین واقعی را از مرجع جاری بخوان.", "Answer checking becomes available after document categories are selected; consult current sources for real rules."],
  },
  {
    id: "odt", group: "operations", title: ["تمرین ثبت جلسه ODT", "ODT Session Practice"],
    goal: ["فرم و چک‌لیست ثبت جلسهٔ نمونه را بشناس و پیش‌نمایش آموزشی را بررسی کن.", "Explore the sample session form and checklist, then inspect the educational preview."],
    steps: [["نمونه و قالب ثبت را انتخاب کن.", "Choose a sample entry and recording format."], ["موارد چک‌لیست را با توضیح تمرین مرور کن.", "Review the checklist alongside the exercise guidance."], ["پیش‌نمایش را باز کن؛ این ابزار دوز یا جلسهٔ واقعی ثبت نمی‌کند.", "Open the preview; this tool does not record real doses or sessions."]],
    question: ["پیش‌نمایش ODT در این بخش چه کاربردی دارد؟", "What is the ODT preview for?"],
    answers: [["ثبت دوز واقعی بیمار.", "Recording a real patient's dose."], ["تمرین شناخت قالب و چک‌لیست ثبت.", "Learning the recording format and checklist."], ["تغییر نسخهٔ اصلی.", "Changing the original prescription."]], correct: 1,
    explanation: ["این پیش‌نمایش آموزشی است و مجوز یا ثبت درمان واقعی محسوب نمی‌شود.", "This educational preview is not authorization or a record of real treatment."],
  },
  {
    id: "pbspos", group: "operations", title: ["پیش‌نمایش دسته‌بندی PBS/POS", "PBS/POS Categorization Practice"],
    goal: ["اقلام نمونه را دسته‌بندی کن و تفاوت گروه‌های تمرینی را ببین.", "Categorize the sample items and explore the exercise's groups."],
    steps: [["شرح اقلام و گروه‌های تمرین را بخوان.", "Read the exercise's item and group descriptions."], ["هر قلم را به یک گروه اختصاص بده.", "Assign each item to a group."], ["پیش‌نمایش را بررسی و انتخاب‌های خود را با توضیح نمونه مقایسه کن.", "Inspect the preview and compare your choices with the sample guidance."]],
    question: ["برای کامل‌کردن دسته‌بندی چه کاری لازم است؟", "What completes the categorization exercise?"],
    answers: [["قرار دادن همهٔ اقلام تمرین در گروه‌ها.", "Assigning all exercise items to groups."], ["ارسال claim واقعی.", "Submitting a real claim."], ["فقط انتخاب نام یک گروه.", "Only choosing a group name."]], correct: 0,
    explanation: ["تمرین با اختصاص اقلام به گروه‌ها کامل می‌شود و claim یا فروش واقعی انجام نمی‌دهد.", "The exercise uses item assignments; it does not submit claims or process real sales."],
  },
];
export const FRED_LESSON_GROUPS = [
  { id: "prescription", title: ["شناخت نسخه و ورود اطلاعات", "Prescription and data entry"] },
  { id: "workflow", title: ["بررسی و گردش کار", "Checking and workflow"] },
  { id: "operations", title: ["ابزارها و عملیات", "Tools and operations"] },
] as const;
export function isFredModule(value: string | null): value is FredModuleId {
  return FRED_CURRICULUM.some(lesson => lesson.id === value);
}
