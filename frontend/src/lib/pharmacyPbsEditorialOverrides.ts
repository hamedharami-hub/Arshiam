import type { KnowledgeDocument } from "./knowledgeTypes";

const COPAYMENT_DOCUMENT_ID = "doc-scenario-admin-admin-medicare-copayment-safetynet";
const COPAYMENT_EDITORIAL_MARKER = 'data-editorial-override="pbs-copayment-2026-09-27"';
const PBS_SAFETY_NET_URL = "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016";
const PBS_FEES_URL = "https://www.pbs.gov.au/info/healthpro/explanatory-notes/front/fee";

function replaceRequiredOnce(value: string, before: string, after: string, field: string): string {
  const start = value.indexOf(before);
  if (start < 0 || value.indexOf(before, start + before.length) >= 0) {
    throw new Error(`Expected one reviewed PBS phrase in ${field}; refresh the editorial override before importing.`);
  }
  return `${value.slice(0, start)}${after}${value.slice(start + before.length)}`;
}

function replaceAllRequired(value: string, before: string, after: string, field: string): string {
  if (!value.includes(before)) {
    throw new Error(`Expected outdated PBS rate in ${field}; refresh the editorial override before importing.`);
  }
  return value.split(before).join(after);
}

function renderPbsCopaymentNote(language: "fa" | "en"): string {
  const isPersian = language === "fa";
  const direction = isPersian ? "rtl" : "ltr";
  const heading = isPersian
    ? "مرجع رسمی سهم پرداخت و Safety Net — snapshot سال ۲۰۲۶ (بازبینی ۲۷ سپتامبر ۲۰۲۶)"
    : "Official co-payment and Safety Net reference — 2026 snapshot (checked 27 September 2026)";
  const body = isPersian
    ? "از ۱ ژانویهٔ ۲۰۲۶، حداکثر سهم پرداخت PBS برای بیمار عمومی ۲۵ دلار و برای بیمار دارای کارت تخفیف ۷٫۷۰ دلار است. آستانهٔ Safety Net به‌ترتیب ۱٬۷۴۸٫۲۰ و ۲۷۷٫۲۰ دلار است. پس از رسیدن یا عبور از آستانه، نرخ نسخه‌های بعدی برای بیمار عمومی حداکثر ۷٫۷۰ دلار و برای دارندهٔ کارت تخفیف صفر دلار است؛ برای استفاده از نرخ Safety Net باید سوابق هزینه و کارت مربوط طبق راهنمای رسمی مدیریت شود. این سناریوی آموزشی شرایط واقعی بیمار، واجدشرایط‌بودن، هزینهٔ نهایی یا صدور کارت را محاسبه نمی‌کند. قیمت برند، premiumها، هزینه‌های مجاز، مبلغ واقعی ثبت‌شده و قواعد اختصاصی بیمار می‌توانند نتیجه را تغییر دهند. مثال «۳۶ پرداختِ کاملِ ۷٫۷۰ دلاری» فقط از نظر حسابی برابر ۲۷۷٫۲۰ دلار است و تعداد نسخهٔ واقعی تا آستانه را تضمین نمی‌کند. نرخ‌ها هر سال ممکن است تغییر کنند؛ پیش از استفاده، منبع رسمی همان تاریخ را بررسی کنید."
    : "From 1 January 2026, the maximum PBS co-payment is $25.00 for general patients and $7.70 for concessional patients. The respective Safety Net thresholds are $1,748.20 and $277.20. After reaching or exceeding the threshold, subsequent prescriptions cost up to $7.70 for general patients and $0 for concession-card holders; official record-keeping and the relevant card are required to access Safety Net rates. This educational scenario does not calculate a real patient's circumstances, eligibility, final cost, or card issue. Brand choice, premiums, permitted fees, the amount actually recorded, and patient-specific rules can change the outcome. The arithmetic example of 36 full $7.70 payments equals $277.20 only; it does not guarantee the actual number of prescriptions needed to reach the threshold. Rates can change each year; check the official source for the relevant date before use.";
  const refs = isPersian
    ? `<li><a href="${PBS_SAFETY_NET_URL}" target="_blank" rel="noopener noreferrer">Services Australia — آستانهٔ PBS Safety Net در سال ۲۰۲۶</a></li><li><a href="${PBS_FEES_URL}" target="_blank" rel="noopener noreferrer">PBS — سهم پرداخت و آستانه‌های رسمی از ۱ ژانویهٔ ۲۰۲۶</a></li>`
    : `<li><a href="${PBS_SAFETY_NET_URL}" target="_blank" rel="noopener noreferrer">Services Australia — PBS Safety Net thresholds for 2026</a></li><li><a href="${PBS_FEES_URL}" target="_blank" rel="noopener noreferrer">PBS — official co-payments and thresholds from 1 January 2026</a></li>`;

  return `<section ${COPAYMENT_EDITORIAL_MARKER} dir="${direction}" class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-2"><h3 class="text-sm font-bold">${heading}</h3><p class="text-xs leading-relaxed">${body}</p><ul class="list-disc list-inside text-xs space-y-1">${refs}</ul></section>`;
}

function insertIntoKnowledgeRoot(value: string, note: string, field: string): string {
  const root = value.indexOf('<div class="knowledge-card');
  const rootEnd = value.indexOf(">", root);
  if (root < 0 || rootEnd < 0) throw new Error(`Could not locate ${field} content root for the PBS reference note.`);
  return `${value.slice(0, rootEnd + 1)}${note}${value.slice(rootEnd + 1)}`;
}

function correctCopaymentDocument(document: KnowledgeDocument): KnowledgeDocument {
  const hasFaNote = document.content_html.includes(COPAYMENT_EDITORIAL_MARKER);
  const hasEnNote = Boolean(document.content_en?.includes(COPAYMENT_EDITORIAL_MARKER));
  if (hasFaNote && hasEnNote) {
    const copy = `${document.title}\n${document.title_en}\n${document.content_html}\n${document.content_en || ""}`;
    if (copy.includes("$31.60")) {
      throw new Error("The PBS co-payment note is present but outdated rate text remains.");
    }
    return document;
  }
  if (hasFaNote !== hasEnNote) throw new Error("The Persian and English PBS co-payment notes are inconsistent.");

  const title = replaceRequiredOnce(document.title, "General $31.60", "General $25.00", "Persian title");
  const titleEn = replaceRequiredOnce(
    document.title_en || "",
    "Administrative Script Case: A3.",
    "Administrative PBS Script Case (2026): A3.",
    "English title",
  );
  const contentHtml = replaceAllRequired(document.content_html, "$31.60", "$25.00", "Persian content");
  const contentEn = replaceAllRequired(document.content_en || "", "$31.60", "$25.00", "English content");

  return {
    ...document,
    title,
    title_en: titleEn,
    content_html: insertIntoKnowledgeRoot(contentHtml, renderPbsCopaymentNote("fa"), "Persian"),
    content_en: insertIntoKnowledgeRoot(contentEn, renderPbsCopaymentNote("en"), "English"),
  };
}

export function applyPharmacyPbsEditorialOverrides<T extends { PHARMACY_SEED_DOCUMENTS: KnowledgeDocument[] }>(
  seed: T,
): T {
  return {
    ...seed,
    PHARMACY_SEED_DOCUMENTS: seed.PHARMACY_SEED_DOCUMENTS.map((document) =>
      document.id === COPAYMENT_DOCUMENT_ID ? correctCopaymentDocument(document) : document,
    ),
  };
}
