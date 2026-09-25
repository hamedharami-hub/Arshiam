import type { KnowledgeDocument } from "./knowledgeTypes";

const UTI_DOCUMENT_ID = "doc-disease-uti_cystitis";
const UTI_EDITORIAL_MARKER = 'data-editorial-override="uti-cystitis-safety-2026-09-25"';

const UTI_SOURCES = [
  {
    url: "https://www.health.nsw.gov.au/pharmaceutical/pharmacists/Documents/practice-standards-uti.pdf",
    fa: "استاندارد NSW Health برای UTI در داروخانه‌ها (۱۵ ژوئن ۲۰۲۶)",
    en: "NSW Health UTI Practice Standards (15 June 2026)",
  },
  {
    url: "https://www.health.qld.gov.au/__data/assets/pdf_file/0022/1447051/PCCM_full.pdf",
    fa: "Queensland Primary Clinical Care Manual، ویرایش ۱۲ (۲۰۲۵)، صفحات ۲۸۳–۲۸۴",
    en: "Queensland Primary Clinical Care Manual, 12th edition (2025), pp. 283–284",
  },
  {
    url: "https://www.ural-australia.com/ural-product-range/ural-effervescent-powders/",
    fa: "دستور مصرف سازندهٔ Ural",
    en: "Ural manufacturer directions",
  },
  {
    url: "https://www.health.vic.gov.au/sites/default/files/2026-02/protocol-for-management-of-urinary-tract-infections.pdf",
    fa: "پروتکل مدیریت UTI در برنامهٔ داروسازان ویکتوریا (ژانویهٔ ۲۰۲۶)",
    en: "Victorian Community Pharmacist UTI Protocol (January 2026)",
  },
  {
    url: "https://hiprex.com.au/product/hiprex-urinary-tract-antibacterial-tab/",
    fa: "دستور جاری سازندهٔ Hiprex (کد استرالیا AU-2025-09-0065)",
    en: "Hiprex manufacturer product directions (Australian code AU-2025-09-0065)",
  },
  {
    url: "https://www.healthdirect.gov.au/medicines/medinfo_Information/10558/CMI/iachipre11117.pdf",
    fa: "برگهٔ اطلاعات مصرف‌کنندهٔ Hiprex در Healthdirect (تهیه‌شده در نوامبر ۲۰۱۷)",
    en: "Healthdirect Hiprex Consumer Medicine Information (prepared November 2017)",
  },
  {
    url: "https://www.healthdirect.gov.au/medicines/brand/amt%2C2978011000036104/hiprex",
    fa: "اطلاعات دارویی Hiprex در Healthdirect و داده‌های ARTG",
    en: "Healthdirect Hiprex medicine information and ARTG data",
  },
];

function renderUtiEditorialNote(language: "fa" | "en"): string {
  const isPersian = language === "fa";
  const direction = isPersian ? "rtl" : "ltr";
  const heading = isPersian
    ? "یادداشت ایمنی و حوزه‌ای — ۲۵ سپتامبر ۲۰۲۶"
    : "Safety and jurisdiction note — 25 September 2026";
  const body = isPersian
    ? "این سند وارداتی هنوز بازبینی بالینی واجدصلاحیت نشده است. قلیایی‌کننده‌های ادرار عفونت باکتریایی را درمان نمی‌کنند. NSW Health می‌گوید اثربخشی آن‌ها برای تسکین علامتی UTI ثابت نشده، هرچند برخی افراد آن‌ها را مفید می‌دانند؛ همچنین اثر ضدمیکروبی نیتروفورانتوئین را به‌طور قابل‌توجهی کاهش می‌دهند، پس همراه نیتروفورانتوئین مصرف نشوند. راهنمای Queensland ایمنی و اثربخشی این فرآورده‌ها را نامعلوم می‌داند و برای cystitis نوشیدن مایعات به‌اندازهٔ رفع تشنگی را توصیه می‌کند؛ مقدار ثابت ۲ تا ۲٫۵ لیتر برای همه را تعمیم ندهید و محدودیت مایعات فردی را رعایت کنید. دستور سازندهٔ Ural برای افراد ۱۲ سال به بالا ۱ تا ۲ ساشه، حداکثر ۴ بار در روز است؛ برچسب همان فرآورده را دنبال کنید. ارزیابی یا درمان UTI به‌وسیلهٔ داروساز نیز فقط در حوزه‌های قضایی و برنامه‌های مجاز، با آموزش و طبق پروتکل جاری همان محل انجام می‌شود. این یادداشت جایگزین ارزیابی بیمار یا راهنمای محلی نیست."
    : "This imported document has not had qualified clinical review. Urinary alkalinisers do not treat bacterial infection. NSW Health says their efficacy for symptomatic UTI relief has not been established, although some people find them useful; they also significantly reduce nitrofurantoin's antimicrobial effect, so do not use them with nitrofurantoin. The Queensland manual describes their safety and efficacy as unknown and advises enough fluids to avoid thirst for cystitis; do not generalise a fixed 2–2.5 L target to everyone, and follow individual fluid restrictions. Ural's manufacturer directions for people aged 12 years and over are 1–2 sachets, up to 4 times daily; follow the specific product label. Pharmacist assessment or treatment of UTI is available only under authorised jurisdiction-specific programs, training and current local protocols. This note is not a substitute for patient assessment or local guidance.";
  const hiprexBody = isPersian
    ? "Hiprex (methenamine hippurate) را با Ural یکی نگیرید. سازنده مصرف آن را برای پیشگیری یا سرکوب باکتری ادرارِ مرتبط با UTI مزمن یا عودکننده معرفی می‌کند؛ از این اندیکاسیون به‌تنهایی نمی‌توان مصرف برای درمان حاد سیستیت یا خط اول بودن را نتیجه گرفت. دستور فعلی سازنده برای بزرگسالان و افراد ۱۲ سال به بالا ۱ قرص ۱ گرمی، دو بار در روز است و مصرف زیر ۱۲ سال را توصیه نمی‌کند؛ یک CMI عمومیِ قدیمی‌تر (نوامبر ۲۰۱۷) دوز متفاوتی برای برخی کودکان دارد، بنابراین هیچ دوز کودکان را از این سند نقل نکنید و بسته/CMI جاری را با داروساز تطبیق دهید. CMI دربارهٔ پایین‌بودن pH ادرار، تداخل احتمالی داروهای قلیایی‌کننده و داروهای سولفا، و لزوم اطلاع‌دادن سابقهٔ مشکلات کلیه یا کبد توضیح می‌دهد؛ اما در منابع پیوندشده هدف ثابت pH برابر با ۵٫۵ یا کمتر ذکر نشده است. در بارداری با پزشک/داروساز مشورت شود؛ CMI می‌گوید عبور دارو به شیر مادر معلوم نیست و دربارهٔ شیردهی نیز باید مشورت شود. ویتامین C را درمان الزامی و همگانی معرفی نکنید؛ CMI مصرف آن را بر اساس pH یا پاسخ بالینی مطرح می‌کند."
    : "Do not treat Hiprex (methenamine hippurate) as interchangeable with Ural. The manufacturer describes it for prevention or suppression of urinary bacteria associated with chronic or recurrent UTIs; that indication alone does not establish it as treatment for acute cystitis or as a first-line option. Current manufacturer directions are 1 g twice daily for adults and people aged 12 years or older, and say it is not recommended under 12; an older public CMI (November 2017) contains different directions for some children, so do not reproduce a paediatric dose from this document and verify the current pack/CMI with a pharmacist. The CMI discusses low urine pH, possible interactions with urine-alkalising and sulphonamide medicines, and the need to disclose kidney or liver problems; the linked sources do not state a fixed urine-pH target of 5.5 or lower. During pregnancy, discuss use with a doctor or pharmacist; the CMI says breast-milk transfer is unknown and also advises professional discussion about breastfeeding. Do not present vitamin C as universally required; the CMI makes it conditional on urinary pH or clinical response.";
  const refs = UTI_SOURCES.map((source) =>
    `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${isPersian ? source.fa : source.en}</a></li>`,
  ).join("");

  return `<section ${UTI_EDITORIAL_MARKER} dir="${direction}" class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-2"><h3 class="text-sm font-bold">${heading}</h3><p class="text-xs leading-relaxed">${body}</p><p class="text-xs leading-relaxed">${hiprexBody}</p><ul class="list-disc list-inside text-xs space-y-1">${refs}</ul></section>`;
}

function replaceRequiredOnce(value: string, before: string, after: string, field: string): string {
  const start = value.indexOf(before);
  if (start < 0 || value.indexOf(before, start + before.length) >= 0) {
    throw new Error(`Expected one reviewed UTI source phrase in ${field}; refresh the editorial override before importing.`);
  }
  return `${value.slice(0, start)}${after}${value.slice(start + before.length)}`;
}

function correctUtiDocument(document: KnowledgeDocument): KnowledgeDocument {
  const hasFaNote = document.content_html.includes(UTI_EDITORIAL_MARKER);
  const hasEnNote = Boolean(document.content_en?.includes(UTI_EDITORIAL_MARKER));
  if (hasFaNote && hasEnNote) return document;
  if (hasFaNote !== hasEnNote) throw new Error("The Persian and English UTI editorial notes are inconsistent.");

  let contentHtml = document.content_html;
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "Ural Sachets / Hiprex / Ural Effervescent",
    "Ural Effervescent Granules (تسکین علامتی)",
    "content_html condition/brand label",
  );
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "درمان دارویی خط اول (First-line OTC Pharmacotherapy)",
    "تسکین علامتی (درمان خط اول عفونت نیست)",
    "content_html heading",
  );
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "۱ تا ۲ ساشه اورال حل‌شده در یک لیوان آب سرد ۳ تا ۴ بار در روز به مدت حداکثر ۴۸ ساعت. در صورت همراهی با آنتی‌بیوتیک نیتروفورانتوئین مصرف نشود چون اثر آنتی‌بیوتیک در ادرار اسیدی است.",
    "برای بزرگسالان و افراد ۱۲ سال به بالا: ۱ تا ۲ ساشه در یک لیوان آب سرد حل شود؛ حداکثر ۴ بار در روز طبق برچسب محصول. همراه نیتروفورانتوئین مصرف نشود؛ پیش از مصرف هم‌زمان با آنتی‌بیوتیک دیگر از داروساز یا پزشک بپرسید.",
    "content_html dose instructions",
  );
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "تسکین احساس سوزش و درد مثانه ظرف ۳۰ دقیقه پس از قلیایی شدن ادرار.",
    "اثربخشی این فرآورده‌ها برای تسکین علامتی UTI ثابت نشده است؛ برخی افراد ممکن است آن‌ها را مفید بدانند.",
    "content_html onset claim",
  );
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "نوشیدن مقادیر فراوان آب (حداقل ۲ تا ۲.۵ لیتر در روز) جهت شستشوی مکانیکی مجاری ادرار.",
    "نوشیدن مایعات به‌اندازه‌ای که تشنه نمانید؛ مقدار ثابت ۲ تا ۲.۵ لیتر برای همه توصیه نمی‌شود. محدودیت مایعات فردی را رعایت کنید؛ آب جای درمان عفونت را نمی‌گیرد.",
    "content_html hydration advice",
  );
  contentHtml = replaceRequiredOnce(
    contentHtml,
    "در استرالیا، پروتکل‌های تجویز آنتی‌بیوتیک توسط داروساز (UTI Prescribing) برای زنان غیرباردار ۱۸ تا ۶۵ سال با تری‌متوپریم ۳۰۰ میلی‌گرم یا نیتروفورانتوئین در برخی ایالت‌ها (QLD, NSW, VIC, WA) اجرایی است.",
    "اختیار ارزیابی یا درمان UTI به‌وسیلهٔ داروساز به ایالت/قلمرو، مجوز، آموزش و پروتکل جاری همان برنامه بستگی دارد؛ داروها و معیارهای واجدشرایط‌بودن را نباید به همهٔ حوزه‌ها تعمیم داد.",
    "content_html jurisdiction claim",
  );

  let contentEn = document.content_en || "";
  contentEn = replaceRequiredOnce(
    contentEn,
    "Ural Sachets / Hiprex / Ural Effervescent",
    "Ural Effervescent Granules (symptom relief)",
    "content_en condition/brand label",
  );
  contentEn = replaceRequiredOnce(
    contentEn,
    "First-line Pharmacotherapy:",
    "Symptomatic relief only (not first-line UTI treatment):",
    "content_en heading",
  );
  contentEn = replaceRequiredOnce(
    contentEn,
    "Dissolve 1-2 sachets in a glass of water 3-4 times daily for max 48h. Do NOT combine with Nitrofurantoin.",
    "For adults and people aged 12 years and over: dissolve 1–2 sachets in a glass of cold water, up to 4 times daily as directed on the product label. Do not use with nitrofurantoin; ask a pharmacist or doctor before combining with other antibiotics.",
    "content_en dose instructions",
  );
  contentEn = replaceRequiredOnce(
    contentEn,
    "Relief of burning dysuria within 30-60 mins as urine pH increases.",
    "Efficacy for symptomatic UTI relief has not been established; some people may find urinary alkalinisers useful.",
    "content_en onset claim",
  );

  const htmlRoot = contentHtml.indexOf(">", contentHtml.indexOf('<div class="knowledge-card'));
  const enRoot = contentEn.indexOf(">", contentEn.indexOf('<div class="knowledge-card'));
  if (htmlRoot < 0 || enRoot < 0) throw new Error("Could not locate both UTI content roots for the safety note.");

  return {
    ...document,
    content_html: `${contentHtml.slice(0, htmlRoot + 1)}${renderUtiEditorialNote("fa")}${contentHtml.slice(htmlRoot + 1)}`,
    content_en: `${contentEn.slice(0, enRoot + 1)}${renderUtiEditorialNote("en")}${contentEn.slice(enRoot + 1)}`,
  };
}

export function applyPharmacyClinicalEditorialOverrides<T extends { PHARMACY_SEED_DOCUMENTS: KnowledgeDocument[] }>(
  seed: T,
): T {
  return {
    ...seed,
    PHARMACY_SEED_DOCUMENTS: seed.PHARMACY_SEED_DOCUMENTS.map((document) =>
      document.id === UTI_DOCUMENT_ID ? correctUtiDocument(document) : document,
    ),
  };
}
