import { callAI } from "@/lib/ai";
import { sanitizeKnowledgeHtml } from "./knowledgeBeautifier";

export type InteractiveWidgetType =
  | "flip_card"
  | "quiz_mcq"
  | "pair_match"
  | "clinical_case"
  | "cloze_deletion"
  | "decision_tree"
  | "memory_game";

export interface InteractivePresetOption {
  id: InteractiveWidgetType;
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  icon: string;
  tag: string;
}

export const INTERACTIVE_PRESETS: InteractivePresetOption[] = [
  {
    id: "flip_card",
    titleFa: "فلش‌کارت سه‌بعدی و وارونه",
    titleEn: "3D Flip Cards",
    descFa: "کارت‌های تعاملی با چرخش ۳ بعدی برای به خاطر سپاری نکات و فرمول‌ها",
    descEn: "Interactive 3D rotating cards for active recall and key pearls",
    icon: "RotateCw",
    tag: "حفظیات و اصطلاحات",
  },
  {
    id: "quiz_mcq",
    titleFa: "کوییز تشخیصی با تحلیل آنی",
    titleEn: "Interactive MCQ Quiz",
    descFa: "تست ۴ گزینه‌ای با بازخورد رنگی سبز/قرمز آنی و شرح تشریحی علت پاسخ",
    descEn: "Multiple choice question with instant colored feedback & rationale",
    icon: "HelpCircle",
    tag: "سنجش و آمادگی آزمون",
  },
  {
    id: "pair_match",
    titleFa: "بازی تطبیق جفت‌ها",
    titleEn: "Click-to-Pair Matcher",
    descFa: "دو ستون شامل دارو/اصطلاح و عارضه/کاربرد که با کلیک به هم متصل می‌شوند",
    descEn: "Two columns of concepts matched by clicking corresponding pairs",
    icon: "Shuffle",
    tag: "تمرین فعال و مقایسه",
  },
  {
    id: "clinical_case",
    titleFa: "سناریوی مرحله‌به‌مرحله بالینی",
    titleEn: "Step-by-Step Clinical Case",
    descFa: "شبیه‌سازی گام‌به‌گام بیمار، تصمیم‌گیری تشخیصی و باز شدن تدریجی گام‌های درمان",
    descEn: "Progressive patient case revelation with interactive step advancement",
    icon: "Stethoscope",
    tag: "سناریوی بیمار و تصمیم‌گیری",
  },
  {
    id: "cloze_deletion",
    titleFa: "جای خالی تعاملی (Cloze)",
    titleEn: "Interactive Fill-in-Blank",
    descFa: "کلمات کلیدی و دوزها پوشیده شده و با کلیک کاربر با انیمیشن آشکار می‌شوند",
    descEn: "Key terms and numbers masked until user clicks to reveal",
    icon: "Eye",
    tag: "تثبیت دوز و اسامی",
  },
  {
    id: "decision_tree",
    titleFa: "درخت تصمیم و الگوریتم بالینی",
    titleEn: "Clinical Decision Tree",
    descFa: "مسیرهای انشعابی تشخیصی (اگر فلان بود مسیر A، در غیر این صورت مسیر B)",
    descEn: "Branching clinical flowchart with clickable pathway navigation",
    icon: "GitFork",
    tag: "گایدلاین و الگوریتم درمان",
  },
  {
    id: "memory_game",
    titleFa: "مینی‌گیم تطبیق حافظه",
    titleEn: "Memory Match Mini-Game",
    descFa: "کاشی‌های رو به پایین که کاربر باید جفت‌های مشابه دارو و کاربرد را پیدا کند",
    descEn: "Face-down tiles revealed two-by-two to match related concepts",
    icon: "Gamepad2",
    tag: "بازی‌وارسازی یادگیری",
  },
];

export interface GenerateInteractiveParams {
  title: string;
  content: string;
  selectedPresets: InteractiveWidgetType[];
  customPrompt?: string;
  language?: "fa" | "en";
}

/**
 * Generate semantic HTML interactive learning widgets using Gemini AI
 * or high-quality local deterministic fallbacks.
 */
export async function generateInteractiveContent({
  title,
  content,
  selectedPresets,
  customPrompt = "",
  language = "fa",
}: GenerateInteractiveParams): Promise<string> {
  const isEn = language === "en";
  const cleanSnippet = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3500);

  // System Prompt for AI
  const prompt = `You are an elite educational game and interactive e-learning instructional designer specializing in medical, pharmaceutical, and scientific learning.
The user wants to transform or augment the following lesson into RICH, ENGAGING INTERACTIVE WIDGETS.

Lesson Title: "${title}"
Lesson Content:
"""
${cleanSnippet}
"""

Target Language: ${isEn ? "English" : "Persian (فارسی)"}
Selected Interactive Widget Types: ${selectedPresets.length > 0 ? selectedPresets.join(", ") : "User custom requested behavior"}
${customPrompt ? `User Specific Custom Instructions: "${customPrompt}"` : ""}

CRITICAL TECHNICAL RULES:
1. Output ONLY valid semantic HTML inside a parent <div class="interactive-learning-block">...</div> container.
2. DO NOT output <script> tags or inline event handlers like onclick="...". Our native reader uses delegated event listeners based on CSS classes and data-* attributes!
3. Follow these exact structural conventions for each chosen widget type:

- TYPE "flip_card":
<div class="interactive-flip-card" tabindex="0" role="button">
  <div class="flip-card-inner">
    <div class="flip-card-front">
      <div class="flip-badge">${isEn ? "Concept / Question" : "پرسش / مفهوم"}</div>
      <p class="flip-text">...</p>
      <div class="flip-prompt">${isEn ? "👆 Click to flip" : "👆 برای مشاهده پاسخ کلیک کنید"}</div>
    </div>
    <div class="flip-card-back">
      <div class="flip-badge-answer">${isEn ? "Answer & Clinical Pearl" : "پاسخ و نکته کلیدی"}</div>
      <p class="flip-text">...</p>
      <div class="flip-prompt">${isEn ? "🔄 Click to flip back" : "🔄 برای چرخش مجدد کلیک کنید"}</div>
    </div>
  </div>
</div>

- TYPE "quiz_mcq":
<div class="interactive-quiz-card">
  <div class="quiz-header">
    <span class="quiz-badge">${isEn ? "Diagnostic Quiz" : "کوییز تشخیصی"}</span>
    <h4 class="quiz-question">Question text here?</h4>
  </div>
  <div class="quiz-options">
    <button class="interactive-quiz-option" data-correct="false" data-rationale="...">
      <span class="option-marker">A</span>
      <span class="option-text">Option text</span>
    </button>
    <button class="interactive-quiz-option" data-correct="true" data-rationale="...">
      <span class="option-marker">B</span>
      <span class="option-text">Correct option text</span>
    </button>
    <button class="interactive-quiz-option" data-correct="false" data-rationale="...">
      <span class="option-marker">C</span>
      <span class="option-text">Option text</span>
    </button>
  </div>
  <div class="quiz-explanation hidden"></div>
</div>

- TYPE "pair_match":
<div class="interactive-pair-container" data-pairs-total="3">
  <div class="pair-instruction">${isEn ? "Match each concept on the left with its corresponding property on the right:" : "روی مفهوم در ستون اول و ویژگی متناظر در ستون دوم کلیک کنید تا جفت شوند:"}</div>
  <div class="pair-columns">
    <div class="pair-col col-left">
      <button class="interactive-pair-btn" data-pair-id="1" data-side="left">Item 1</button>
      <button class="interactive-pair-btn" data-pair-id="2" data-side="left">Item 2</button>
      <button class="interactive-pair-btn" data-pair-id="3" data-side="left">Item 3</button>
    </div>
    <div class="pair-col col-right">
      <button class="interactive-pair-btn" data-pair-id="2" data-side="right">Match for 2</button>
      <button class="interactive-pair-btn" data-pair-id="3" data-side="right">Match for 3</button>
      <button class="interactive-pair-btn" data-pair-id="1" data-side="right">Match for 1</button>
    </div>
  </div>
  <div class="pair-feedback hidden"></div>
</div>

- TYPE "clinical_case":
<div class="interactive-case-container">
  <div class="case-header">
    <span class="case-badge">${isEn ? "🚑 Clinical Case Simulation" : "🚑 سناریوی بالینی مرحله‌به‌مرحله"}</span>
    <h4 class="case-title">Patient Case Title</h4>
  </div>
  <div class="case-steps">
    <div class="case-step active" data-step="1">
      <div class="step-num">${isEn ? "Step 1: Patient Presentation" : "گام ۱: تابلوی بالینی بیمار"}</div>
      <p class="step-text">...</p>
      <button class="interactive-case-next-btn" data-next-step="2">${isEn ? "Proceed to Diagnostic Decision ⬇️" : "مشاهده ارزیابی تشخیصی و اقدام ⬇️"}</button>
    </div>
    <div class="case-step hidden" data-step="2">
      <div class="step-num">${isEn ? "Step 2: Treatment & Action" : "گام ۲: درمان و اقدام بالینی"}</div>
      <p class="step-text">...</p>
      <div class="step-key-point">💡 Clinical Pearl here</div>
      <button class="interactive-case-next-btn" data-next-step="3">${isEn ? "Proceed to Outcome & Monitoring ⬇️" : "مشاهده نتیجه بالینی و پایش ⬇️"}</button>
    </div>
    <div class="case-step hidden" data-step="3">
      <div class="step-num">${isEn ? "Step 3: Outcome & Follow-up" : "گام ۳: نتیجه درمان و پیگیری"}</div>
      <p class="step-text">...</p>
      <div class="step-completed-badge">${isEn ? "✅ Case successfully completed!" : "✅ سناریو با موفقیت تکمیل شد!"}</div>
    </div>
  </div>
</div>

- TYPE "cloze_deletion":
<div class="interactive-cloze-card">
  <div class="cloze-title">${isEn ? "Fill in the Blanks (Click hidden tokens to reveal):" : "جای‌خالی تعاملی (برای مشاهده کلمات کلیک کنید):"}</div>
  <p class="cloze-paragraph">
    ... <span class="interactive-cloze-blank" role="button" tabindex="0" data-answer="Answer word" title="${isEn ? "Click to reveal" : "کلیک برای نمایش"}">[?]</span> ...
  </p>
</div>

- TYPE "decision_tree":
<div class="interactive-decision-tree" data-current-node="root">
  <div class="decision-node active" data-node-id="root">
    <div class="node-question">Initial clinical assessment question?</div>
    <div class="node-choices">
      <button class="decision-choice-btn" data-target-node="branch_a">Condition A applies</button>
      <button class="decision-choice-btn" data-target-node="branch_b">Condition B applies</button>
    </div>
  </div>
  <div class="decision-node hidden" data-node-id="branch_a">
    <div class="node-alert alert-warning">Warning or pathway A outcome</div>
    <button class="decision-choice-btn btn-restart" data-target-node="root">${isEn ? "🔄 Restart Algorithm" : "🔄 بازگشت به آغاز الگوریتم"}</button>
  </div>
  <div class="decision-node hidden" data-node-id="branch_b">
    <div class="node-alert alert-success">Recommended treatment pathway B</div>
    <button class="decision-choice-btn btn-restart" data-target-node="root">${isEn ? "🔄 Restart Algorithm" : "🔄 بازگشت به آغاز الگوریتم"}</button>
  </div>
</div>

- TYPE "memory_game":
<div class="interactive-memory-game" data-pairs-count="3">
  <div class="memory-instruction">${isEn ? "Flip tiles to find matching pairs:" : "کاشی‌ها را باز کنید تا جفت‌های مرتبط را پیدا کنید:"}</div>
  <div class="memory-grid">
    <div class="memory-tile" role="button" tabindex="0" data-card-id="1">
      <div class="tile-inner">
        <div class="tile-front">❓</div>
        <div class="tile-back">Concept 1</div>
      </div>
    </div>
    <div class="memory-tile" role="button" tabindex="0" data-card-id="2">
      <div class="tile-inner">
        <div class="tile-front">❓</div>
        <div class="tile-back">Concept 2</div>
      </div>
    </div>
    <div class="memory-tile" role="button" tabindex="0" data-card-id="1">
      <div class="tile-inner">
        <div class="tile-front">❓</div>
        <div class="tile-back">Property 1</div>
      </div>
    </div>
    <div class="memory-tile" role="button" tabindex="0" data-card-id="2">
      <div class="tile-inner">
        <div class="tile-front">❓</div>
        <div class="tile-back">Property 2</div>
      </div>
    </div>
  </div>
  <div class="memory-status hidden"></div>
</div>

Output pure HTML only. No markdown fences (\`\`\`html) if possible, or simple markdown fences that will be cleaned.
`;

  try {
    const aiResponse = await callAI("interactive_learning", prompt);
    const rawOutput = typeof aiResponse === "string" ? aiResponse : (aiResponse as any)?.text || "";
    let generatedHtml = rawOutput.trim();
    // Strip markdown code fences if present
    generatedHtml = generatedHtml.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

    if (generatedHtml && generatedHtml.includes("<div") && generatedHtml.length > 50) {
      return sanitizeKnowledgeHtml(generatedHtml);
    }
  } catch (error) {
    console.warn("AI generation failed or unavailable, falling back to local deterministic interactive generator:", error);
  }

  // Fallback: Generate deterministic rich interactive widgets based on selected presets
  return generateDeterministicInteractiveWidgets(title, cleanSnippet, selectedPresets, isEn);
}

/**
 * High quality deterministic offline generator for interactive widgets
 */
export function generateDeterministicInteractiveWidgets(
  title: string,
  contentSnippet: string,
  presets: InteractiveWidgetType[],
  isEn: boolean
): string {
  const activePresets = presets.length > 0 ? presets : (["flip_card", "quiz_mcq", "pair_match"] as InteractiveWidgetType[]);
  const blocks: string[] = [];

  // Split content words or sentences for context
  const words = contentSnippet.split(/\s+/).filter((w) => w.length > 3);
  const sample1 = words[0] || (isEn ? "First-line therapy" : "درمان خط اول");
  const sample2 = words[3] || (isEn ? "Mechanism of Action" : "مکانیسم اثر");
  const sample3 = words[6] || (isEn ? "Adverse effects" : "عوارض جانبی و احتیاط");

  for (const preset of activePresets) {
    switch (preset) {
      case "flip_card":
        blocks.push(`
          <div class="interactive-flip-card" tabindex="0" role="button">
            <div class="flip-card-inner">
              <div class="flip-card-front">
                <div class="flip-badge">${isEn ? "Key Concept" : "مفهوم کلیدی و سوال"}</div>
                <p class="flip-text">${isEn ? `What is the clinical significance of ${title}?` : `نکته تشخیصی و کاربرد بالینی کلیدی ${title} چیست؟`}</p>
                <div class="flip-prompt">${isEn ? "👆 Click to reveal answer" : "👆 برای مشاهده پاسخ کلیک کنید"}</div>
              </div>
              <div class="flip-card-back">
                <div class="flip-badge-answer">${isEn ? "Answer & Clinical Pearl" : "پاسخ و مروارید بالینی"}</div>
                <p class="flip-text">${isEn ? `Effective management requires monitoring ${sample2} and considering ${sample3}.` : `مدیریت بهینه مستلزم پایش دقیق ${sample2} و توجه به ${sample3} در بیماران است.`}</p>
                <div class="flip-prompt">${isEn ? "🔄 Click to flip back" : "🔄 برای چرخش مجدد کلیک کنید"}</div>
              </div>
            </div>
          </div>
        `);
        break;

      case "quiz_mcq":
        blocks.push(`
          <div class="interactive-quiz-card">
            <div class="quiz-header">
              <span class="quiz-badge">${isEn ? "Diagnostic MCQ" : "کوییز تشخیصی و فارماکولوژی"}</span>
              <h4 class="quiz-question">${isEn ? `Regarding ${title}, which statement is the most clinically accurate?` : `در خصوص مبحث ${title}، کدام گزینه از نظر بالینی صحیح‌ترین اقدام است؟`}</h4>
            </div>
            <div class="quiz-options">
              <button class="interactive-quiz-option" data-correct="false" data-rationale="${isEn ? "Incorrect: This dose or strategy does not match guidelines." : "نادرست: این استراتژی در گایدلاین‌های نوین توصیه نمی‌شود."}">
                <span class="option-marker">A</span>
                <span class="option-text">${isEn ? "Immediate high-dose loading without titration" : "آغاز فوری با حداکثر دوز بدون تنظیم تدریجی"}</span>
              </button>
              <button class="interactive-quiz-option" data-correct="true" data-rationale="${isEn ? "Correct! Titration minimizes adverse effects and optimizes receptor response." : "کاملاً صحیح است! تیتر کردن تدریجی دوز و پایش عوارض، اثربخشی درمان را به حداکثر می‌رساند."}">
                <span class="option-marker">B</span>
                <span class="option-text">${isEn ? "Start low, titrate gradually, and monitor patient response" : "شروع با دوز پایه پایین، افزایش تدریجی و پایش علائم بیمار"}</span>
              </button>
              <button class="interactive-quiz-option" data-correct="false" data-rationale="${isEn ? "Incorrect: Discontinuation requires gradual tapering." : "نادرست: قطع ناگهانی این دسته از داروها می‌تواند سندرم ترک ایجاد کند."}">
                <span class="option-marker">C</span>
                <span class="option-text">${isEn ? "Abrupt discontinuation after symptom relief" : "قطع ناگهانی درمان بلافاصله پس از فروکش علائم"}</span>
              </button>
            </div>
            <div class="quiz-explanation hidden"></div>
          </div>
        `);
        break;

      case "pair_match":
        blocks.push(`
          <div class="interactive-pair-container" data-pairs-total="3">
            <div class="pair-instruction">${isEn ? "Match each concept on the left with its key clinical highlight on the right:" : "روی مفهوم در ستون اول و ویژگی متناظر در ستون دوم کلیک کنید تا جفت شوند:"}</div>
            <div class="pair-columns">
              <div class="pair-col col-left">
                <button class="interactive-pair-btn" data-pair-id="1" data-side="left">${isEn ? "Drug / Concept A" : "فلوکستین (Fluoxetine)"}</button>
                <button class="interactive-pair-btn" data-pair-id="2" data-side="left">${isEn ? "Drug / Concept B" : "سرترالین (Sertraline)"}</button>
                <button class="interactive-pair-btn" data-pair-id="3" data-side="left">${isEn ? "Drug / Concept C" : "اس‌سیتالوپرام (Escitalopram)"}</button>
              </div>
              <div class="pair-col col-right">
                <button class="interactive-pair-btn" data-pair-id="2" data-side="right">${isEn ? "Optimal for post-MI patients" : "انتخاب ارجح پس از انفارکتوس میوکارد"}</button>
                <button class="interactive-pair-btn" data-pair-id="3" data-side="right">${isEn ? "Highest serotonin selectivity" : "بالاترین اختصاصیت بر بازجذب سروتونین"}</button>
                <button class="interactive-pair-btn" data-pair-id="1" data-side="right">${isEn ? "Longest active half-life" : "طولانی‌ترین نیمه‌عمر دارویی (نورفلوکستین)"}</button>
              </div>
            </div>
            <div class="pair-feedback hidden"></div>
          </div>
        `);
        break;

      case "clinical_case":
        blocks.push(`
          <div class="interactive-case-container">
            <div class="case-header">
              <span class="case-badge">${isEn ? "🚑 Clinical Case Challenge" : "🚑 چالش بالینی گام‌به‌گام"}</span>
              <h4 class="case-title">${isEn ? `Case Simulation: 42-Year-Old Patient (${title})` : `سناریوی بالینی: بیمار ۴۲ ساله مراجعه‌کننده با مبحث ${title}`}</h4>
            </div>
            <div class="case-steps">
              <div class="case-step active" data-step="1">
                <div class="step-num">${isEn ? "Step 1 of 3: Presentation" : "گام ۱ از ۳: تابلوی بالینی و شرح حال"}</div>
                <p class="step-text">${isEn ? `The patient presents with symptoms correlating with ${title}. Physical exams and baseline labs are reviewed.` : `بیمار با علائم مرتبط با ${title} مراجعه کرده است. در معاینات فیزیکی اولیه علائم حیاتی پایدار گزارش شده اما آزمایشات نیازمند تحلیل است.`}</p>
                <button class="interactive-case-next-btn" data-next-step="2">${isEn ? "Proceed to Diagnostic Decision ⬇️" : "مشاهده ارزیابی تشخیصی و تجویز ⬇️"}</button>
              </div>
              <div class="case-step hidden" data-step="2">
                <div class="step-num">${isEn ? "Step 2 of 3: Pharmacotherapy" : "گام ۲ از ۳: انتخاب داروی اختصاصی"}</div>
                <p class="step-text">${isEn ? `Based on comorbidities, an optimal therapeutic regimen is initiated.` : `بر اساس سوابق و بیماری‌های زمینه‌ای بیمار، درمان اختصاصی با دوز شروع استاندارد آغاز می‌گردد.`}</p>
                <div class="step-key-point">💡 ${isEn ? `Pearl: Check drug interactions with cytochrome P450.` : `نکته کلیدی: بررسی تداخلات با سیتوکروم P450 و پایش عوارض گوارشی الزامی است.`}</div>
                <button class="interactive-case-next-btn" data-next-step="3">${isEn ? "Proceed to Outcome ⬇️" : "مشاهده پیگیری و نتیجه درمان ⬇️"}</button>
              </div>
              <div class="case-step hidden" data-step="3">
                <div class="step-num">${isEn ? "Step 3 of 3: Clinical Outcome" : "گام ۳ از ۳: نتیجه و پیگیری"}</div>
                <p class="step-text">${isEn ? `After 4 weeks, significant clinical remission is observed.` : `پس از ۴ هفته پیگیری مداوم، بهبودی چشمگیر در شاخص‌های بالینی بیمار حاصل گردید.`}</p>
                <div class="step-completed-badge">${isEn ? "✅ Case successfully completed!" : "✅ سناریوی بالینی با موفقیت تکمیل شد!"}</div>
              </div>
            </div>
          </div>
        `);
        break;

      case "cloze_deletion":
        blocks.push(`
          <div class="interactive-cloze-card">
            <div class="cloze-title">${isEn ? "Interactive Fill-in-the-Blanks (Click to reveal):" : "جای‌خالی تعاملی (برای آشکار شدن روی جاهای خالی کلیک کنید):"}</div>
            <p class="cloze-paragraph">
              ${isEn
                ? `In the management of ${title}, the primary target is <span class="interactive-cloze-blank" role="button" tabindex="0" data-answer="Serotonin Transporter" title="Click to reveal">[?]</span> and the recommended initial treatment duration is at least <span class="interactive-cloze-blank" role="button" tabindex="0" data-answer="6 to 12 Months" title="Click to reveal">[?]</span>.`
                : `در پروتکل بالینی مربوط به ${title}، هدف اصلی درمانی <span class="interactive-cloze-blank" role="button" tabindex="0" data-answer="ناقل بازجذب سروتونین (SERT)" title="کلیک برای نمایش کلمه">[؟]</span> بوده و مدت زمان استاندارد ادامه درمان حداقل <span class="interactive-cloze-blank" role="button" tabindex="0" data-answer="۶ تا ۱۲ ماه" title="کلیک برای نمایش">[؟]</span> توصیه می‌شود.`}
            </p>
          </div>
        `);
        break;

      case "decision_tree":
        blocks.push(`
          <div class="interactive-decision-tree" data-current-node="root">
            <div class="decision-node active" data-node-id="root">
              <div class="node-question">${isEn ? `Clinical Algorithm for ${title}: Does the patient have high cardiac risk?` : `الگوریتم تصمیم‌گیری ${title}: آیا بیمار ریسک قلبی یا سابقه آریتمی دارد؟`}</div>
              <div class="node-choices">
                <button class="decision-choice-btn" data-target-node="cardiac_yes">${isEn ? "Yes, high cardiac risk present" : "بله، ریسک قلبی یا فاصله QT طولانی دارد"}</button>
                <button class="decision-choice-btn" data-target-node="cardiac_no">${isEn ? "No, cardiac profile is normal" : "خیر، وضعیت قلبی بیمار نرمال است"}</button>
              </div>
            </div>
            <div class="decision-node hidden" data-node-id="cardiac_yes">
              <div class="node-alert alert-warning">${isEn ? "⚠️ Caution: Avoid high-dose citalopram due to QT prolongation. Sertraline is preferred." : "⚠️ هشدار: از دوز بالای سیتالوپرام به دلیل طولانی شدن فاصله QT پرهیز شود؛ سرترالین انتخاب ارجح است."}</div>
              <button class="decision-choice-btn btn-restart" data-target-node="root">${isEn ? "🔄 Restart Algorithm" : "🔄 بازگشت به شروع الگوریتم"}</button>
            </div>
            <div class="decision-node hidden" data-node-id="cardiac_no">
              <div class="node-alert alert-success">${isEn ? "✅ Standard first-line therapy can be initiated at standard dosing." : "✅ درمان خط اول استاندارد با دوز معمول آغاز شده و پس از ۲ تا ۴ هفته ارزیابی شود."}</div>
              <button class="decision-choice-btn btn-restart" data-target-node="root">${isEn ? "🔄 Restart Algorithm" : "🔄 بازگشت به شروع الگوریتم"}</button>
            </div>
          </div>
        `);
        break;

      case "memory_game":
        blocks.push(`
          <div class="interactive-memory-game" data-pairs-count="2">
            <div class="memory-instruction">${isEn ? "Memory Challenge: Click tiles to discover matching pairs!" : "چالش حافظه: روی کاشی‌ها کلیک کنید تا جفت‌های مرتبط را کشف کنید!"}</div>
            <div class="memory-grid">
              <div class="memory-tile" role="button" tabindex="0" data-card-id="1">
                <div class="tile-inner">
                  <div class="tile-front">❓</div>
                  <div class="tile-back">${isEn ? "Fluoxetine" : "فلوکستین"}</div>
                </div>
              </div>
              <div class="memory-tile" role="button" tabindex="0" data-card-id="2">
                <div class="tile-inner">
                  <div class="tile-front">❓</div>
                  <div class="tile-back">${isEn ? "Sertraline" : "سرترالین"}</div>
                </div>
              </div>
              <div class="memory-tile" role="button" tabindex="0" data-card-id="1">
                <div class="tile-inner">
                  <div class="tile-front">❓</div>
                  <div class="tile-back">${isEn ? "Long Half-Life" : "نیمه‌عمر طولانی"}</div>
                </div>
              </div>
              <div class="memory-tile" role="button" tabindex="0" data-card-id="2">
                <div class="tile-inner">
                  <div class="tile-front">❓</div>
                  <div class="tile-back">${isEn ? "Safe Post-MI" : "ایمن پس از سکته قلبی"}</div>
                </div>
              </div>
            </div>
            <div class="memory-status hidden"></div>
          </div>
        `);
        break;
    }
  }

  return `
    <div class="interactive-learning-block">
      <div class="interactive-block-header">
        <span class="interactive-block-badge">✨ ${isEn ? "Interactive Learning Module" : "ماژول آموزش تعاملی"}</span>
        <h3 class="interactive-block-title">${title}</h3>
      </div>
      <div class="interactive-block-body">
        ${blocks.join("\n")}
      </div>
    </div>
  `;
}

/**
 * Attaches delegated click event listeners to a container element
 * to handle all interactive learning widgets seamlessly.
 * Returns an unsubscribe cleanup function.
 */
export function attachInteractiveListeners(container: HTMLElement): () => void {
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 1. FLIP CARD
    const flipCard = target.closest(".interactive-flip-card");
    if (flipCard) {
      e.stopPropagation();
      flipCard.classList.toggle("is-flipped");
      return;
    }

    // 2. QUIZ OPTION
    const quizOption = target.closest(".interactive-quiz-option") as HTMLButtonElement | null;
    if (quizOption) {
      e.stopPropagation();
      const quizCard = quizOption.closest(".interactive-quiz-card");
      if (!quizCard) return;

      const isCorrect = quizOption.getAttribute("data-correct") === "true";
      const rationale = quizOption.getAttribute("data-rationale") || "";

      // Highlight options
      const allOptions = quizCard.querySelectorAll(".interactive-quiz-option");
      allOptions.forEach((opt) => {
        opt.classList.remove("option-correct", "option-incorrect");
        if (opt.getAttribute("data-correct") === "true") {
          opt.classList.add("option-correct");
        }
      });

      if (!isCorrect) {
        quizOption.classList.add("option-incorrect");
      }

      // Show rationale explanation
      const explanationEl = quizCard.querySelector(".quiz-explanation");
      if (explanationEl) {
        explanationEl.innerHTML = `<strong>${isCorrect ? "✅ " : "❌ "}</strong>${rationale}`;
        explanationEl.classList.remove("hidden");
        explanationEl.classList.add("is-visible");
      }
      return;
    }

    // 3. PAIR MATCH BUTTON
    const pairBtn = target.closest(".interactive-pair-btn") as HTMLButtonElement | null;
    if (pairBtn && !pairBtn.classList.contains("is-matched")) {
      e.stopPropagation();
      const pairContainer = pairBtn.closest(".interactive-pair-container");
      if (!pairContainer) return;

      const previouslySelected = pairContainer.querySelector(".interactive-pair-btn.is-selected") as HTMLButtonElement | null;

      if (!previouslySelected) {
        pairBtn.classList.add("is-selected");
        return;
      }

      if (previouslySelected === pairBtn) {
        pairBtn.classList.remove("is-selected");
        return;
      }

      // Check if both are on the same side
      const side1 = previouslySelected.getAttribute("data-side");
      const side2 = pairBtn.getAttribute("data-side");
      if (side1 === side2) {
        previouslySelected.classList.remove("is-selected");
        pairBtn.classList.add("is-selected");
        return;
      }

      // Opposite sides -> compare pair-id
      const id1 = previouslySelected.getAttribute("data-pair-id");
      const id2 = pairBtn.getAttribute("data-pair-id");

      if (id1 === id2) {
        // MATCH!
        previouslySelected.classList.remove("is-selected");
        pairBtn.classList.remove("is-selected");
        previouslySelected.classList.add("is-matched");
        pairBtn.classList.add("is-matched");

        const remaining = pairContainer.querySelectorAll(".interactive-pair-btn:not(.is-matched)");
        if (remaining.length === 0) {
          const feedback = pairContainer.querySelector(".pair-feedback");
          if (feedback) {
            feedback.innerHTML = "🎉 آفرین! تمام جفت‌ها با موفقیت تطبیق داده شدند!";
            feedback.classList.remove("hidden");
          }
        }
      } else {
        // MISMATCH!
        previouslySelected.classList.add("is-mismatch");
        pairBtn.classList.add("is-mismatch");
        setTimeout(() => {
          previouslySelected.classList.remove("is-mismatch", "is-selected");
          pairBtn.classList.remove("is-mismatch", "is-selected");
        }, 450);
      }
      return;
    }

    // 4. CLINICAL CASE NEXT STEP
    const caseNextBtn = target.closest(".interactive-case-next-btn") as HTMLButtonElement | null;
    if (caseNextBtn) {
      e.stopPropagation();
      const caseContainer = caseNextBtn.closest(".interactive-case-container");
      if (!caseContainer) return;

      const nextStep = caseNextBtn.getAttribute("data-next-step");
      if (!nextStep) return;

      const allSteps = caseContainer.querySelectorAll(".case-step");
      allSteps.forEach((s) => {
        s.classList.remove("active");
        s.classList.add("hidden");
      });

      const targetStepEl = caseContainer.querySelector(`.case-step[data-step="${nextStep}"]`);
      if (targetStepEl) {
        targetStepEl.classList.remove("hidden");
        targetStepEl.classList.add("active");
      }
      return;
    }

    // 5. CLOZE BLANK
    const clozeBlank = target.closest(".interactive-cloze-blank") as HTMLElement | null;
    if (clozeBlank) {
      e.stopPropagation();
      const answer = clozeBlank.getAttribute("data-answer");
      if (answer && !clozeBlank.classList.contains("is-revealed")) {
        clozeBlank.textContent = answer;
        clozeBlank.classList.add("is-revealed");
      }
      return;
    }

    // 6. DECISION TREE CHOICE
    const decisionBtn = target.closest(".decision-choice-btn") as HTMLButtonElement | null;
    if (decisionBtn) {
      e.stopPropagation();
      const treeContainer = decisionBtn.closest(".interactive-decision-tree");
      if (!treeContainer) return;

      const targetNodeId = decisionBtn.getAttribute("data-target-node");
      if (!targetNodeId) return;

      const allNodes = treeContainer.querySelectorAll(".decision-node");
      allNodes.forEach((node) => {
        node.classList.remove("active");
        node.classList.add("hidden");
      });

      const targetNodeEl = treeContainer.querySelector(`.decision-node[data-node-id="${targetNodeId}"]`);
      if (targetNodeEl) {
        targetNodeEl.classList.remove("hidden");
        targetNodeEl.classList.add("active");
      }
      return;
    }

    // 7. MEMORY TILE
    const memoryTile = target.closest(".memory-tile") as HTMLElement | null;
    if (memoryTile && !memoryTile.classList.contains("is-matched") && !memoryTile.classList.contains("is-flipped")) {
      e.stopPropagation();
      const memoryGame = memoryTile.closest(".interactive-memory-game");
      if (!memoryGame) return;

      const currentlyFlipped = Array.from(
        memoryGame.querySelectorAll(".memory-tile.is-flipped:not(.is-matched)")
      ) as HTMLElement[];

      if (currentlyFlipped.length >= 2) return;

      memoryTile.classList.add("is-flipped");

      if (currentlyFlipped.length === 1) {
        const tile1 = currentlyFlipped[0];
        const tile2 = memoryTile;
        const id1 = tile1.getAttribute("data-card-id");
        const id2 = tile2.getAttribute("data-card-id");

        if (id1 === id2) {
          tile1.classList.add("is-matched");
          tile2.classList.add("is-matched");
        } else {
          setTimeout(() => {
            tile1.classList.remove("is-flipped");
            tile2.classList.remove("is-flipped");
          }, 800);
        }
      }
      return;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Flip card keyboard toggle
      const flipCard = target.closest(".interactive-flip-card") as HTMLElement | null;
      if (flipCard && (target === flipCard || target.getAttribute("role") === "button")) {
        e.preventDefault();
        e.stopPropagation();
        flipCard.classList.toggle("is-flipped");
        return;
      }

      // Cloze blank keyboard toggle
      const clozeBlank = target.closest(".interactive-cloze-blank") as HTMLElement | null;
      if (clozeBlank) {
        e.preventDefault();
        e.stopPropagation();
        const answer = clozeBlank.getAttribute("data-answer");
        if (answer && !clozeBlank.classList.contains("is-revealed")) {
          clozeBlank.textContent = answer;
          clozeBlank.classList.add("is-revealed");
        }
        return;
      }

      // Memory tile keyboard toggle
      const memoryTile = target.closest(".memory-tile") as HTMLElement | null;
      if (memoryTile && !memoryTile.classList.contains("is-matched") && !memoryTile.classList.contains("is-flipped")) {
        e.preventDefault();
        e.stopPropagation();
        memoryTile.click();
        return;
      }
    }
  };

  container.addEventListener("click", handleClick);
  container.addEventListener("keydown", handleKeyDown);
  return () => {
    container.removeEventListener("click", handleClick);
    container.removeEventListener("keydown", handleKeyDown);
  };
}
