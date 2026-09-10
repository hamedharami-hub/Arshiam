import { parseNaturalDate } from "./nlDate";
import type { AIOperation } from "./aiSettings";
import { loadOfflineModelSettings, isGenerativeAssistantModel } from "./offlineModels";
import { generateOfflineLLM, isOfflineLLMCached } from "./offlineLLM";
import { scoreDistortions, DISTORTION_HINTS, DISTORTION_LABELS, type Distortion } from "./distortions";

export type OfflineResult = {
  text: string;
  data?: Record<string, unknown>;
  offline: true;
  tier?: 2 | 3;
};

const highPriority = /\b(urgent|asap|important|critical|vital|immediate|فوری|مهم|ضروری|اورژانسی|حیاتی|سریع|در اسرع وقت)\b/i;
const lowPriority = /\b(whenever|low priority|not urgent|someday|فرصت شد|اولویت پایین|سر فرصت|اگر شد)\b/i;

function textOf(input: unknown): string {
  if (typeof input === "string") return input.trim();
  if (input && typeof input === "object") {
    const value = input as Record<string, unknown>;
    return String(value.text || value.title || value.content || value.message || JSON.stringify(input)).trim();
  }
  return String(input || "").trim();
}

/** Detects task domain for generating realistic, context-specific subtasks offline */
function detectDomain(text: string): "study" | "coding" | "writing" | "call" | "clean" | "finance" | "health" | "shopping" | "general" {
  const t = text.toLowerCase();
  if (/(مطالع|کتاب|درس|فصل|جزوه|امتحان|کنکور|پادکست|آموزش|یادگیری|read|study|book|exam|learn)/i.test(t)) return "study";
  if (/(کد|برنامه|باگ|پروژه|ریکت|گیتهاب|دیتابیس|سرور|api|fix|bug|code|dev|git|feature)/i.test(t)) return "coding";
  if (/(نوشتن|نویس|نگارش|تدوین|تایپ|پایان‌?نامه|تز|گزارش|رزومه|نامه|ایمیل|متن|محتوا|write|article|report|thesis|essay)/i.test(t)) return "writing";
  if (/(تماس|زنگ|پیام|تلفن|هماهنگ|جلسه|صحبت|پیگیر|فیدبک|call|phone|message|meeting)/i.test(t)) return "call";
  if (/(تمیز|مرتب|نظافت|شستن|جارو|اتاق|کمد|وسایل|انباری|clean|organize|tidy)/i.test(t)) return "clean";
  if (/(پرداخت|قبض|بانک|بیمه|مالیات|قسط|ثبت‌?نام|فاکتور|واریز|پول|حساب|pay|bill|bank|finance|tax)/i.test(t)) return "finance";
  if (/(ورزش|دویدن|تمرین|باشگاه|پیاده‌?روی|شنا|حرکات|workout|gym|run|exercise)/i.test(t)) return "health";
  if (/(خرید|سفارش|فروشگاه|مارکت|سوپرمارکت|تهیه|buy|shop|purchase|store)/i.test(t)) return "shopping";
  return "general";
}

/** Generates smart, domain-aware subtasks without generic hardcoded clichés */
function generateSmartSubtasks(title: string, fa: boolean): string[] {
  const domain = detectDomain(title);
  if (fa) {
    switch (domain) {
      case "study":
        return [
          `فهرست و منبع اصلی «${title}» را مشخص و باز کن (۵ دقیقه)`,
          "مطالعه بخش اول و یادداشت‌برداری از ۳ نکته کلیدی (۱۵ دقیقه)",
          "مرور اجمالی و ارزیابی درک مطالب با تکنیک یادآوری فعال (۱۰ دقیقه)",
        ];
      case "coding":
        return [
          `بررسی صورت مسئله و ایجاد برنچ مربوط به «${title}» (۵ دقیقه)`,
          "پیاده‌سازی لاجیک اصلی یا رفع باگ اولیه و تست محلی (۲۰ دقیقه)",
          "بررسی کد، کامیت و آماده‌سازی تغییرات (۱۰ دقیقه)",
        ];
      case "writing":
        return [
          `نوشتن ساختار و سرفصل‌های اصلی «${title}» (۵ دقیقه)`,
          "نگارش پیش‌نویس اولیه بخش اول بدون وسواس (۱۵ دقیقه)",
          "بازخوانی، ویرایش و ذخیره نسخه نهایی (۱۰ دقیقه)",
        ];
      case "call":
        return [
          `شماره یا کانال ارتباطی مخاطب «${title}» را مشخص کن (۲ دقیقه)`,
          "یادداشت کردن ۲ تا ۳ نکته اصلی گفتگو روی برگه (۳ دقیقه)",
          "برقراری ارتباط و ثبت نتیجه نهایی پیگیری (۵ دقیقه)",
        ];
      case "clean":
        return [
          `آماده‌سازی وسایل نظافت برای «${title}» (۲ دقیقه)`,
          "تفکیک و مرتب‌سازی بخش اصلی در یک تایمر ۱۰ دقیقه‌ای (۱۰ دقیقه)",
          "قرار دادن وسایل سر جای خود و اتمام کار (۵ دقیقه)",
        ];
      case "finance":
        return [
          `اطلاعات و مستندات لازم برای «${title}» را آماده کن (۳ دقیقه)`,
          "انجام فرآیند در سامانه یا درگاه مربوطه (۷ دقیقه)",
          "دریافت کد رهگیری یا رسید و ثبت نهایی (۲ دقیقه)",
        ];
      case "health":
        return [
          "آماده کردن لباس و تجهیزات ورزشی (۳ دقیقه)",
          "۵ دقیقه گرم کردن آرام و اجرای ست اول (۱۵ دقیقه)",
          "خنک کردن بدن و نوشیدن آب کافی (۵ دقیقه)",
        ];
      case "shopping":
        return [
          `بررسی اقلام مورد نیاز و نوشتن لیست قطعی «${title}» (۳ دقیقه)`,
          "انتخاب نزدیک‌ترین فروشگاه یا سفارش آنلاین (۱۰ دقیقه)",
          "چک کردن فاکتور و تحویل اقلام (۵ دقیقه)",
        ];
      default:
        return [
          `ورودی‌ها و هدف شفاف کار «${title}» را مشخص کن (۳ دقیقه)`,
          "اولین گام فیزیکی عینی و ساده را در ۱۰ دقیقه انجام بده (۱۰ دقیقه)",
          "نتیجه کار را بررسی و وضعیت تسک را به‌روز کن (۲ دقیقه)",
        ];
    }
  } else {
    switch (domain) {
      case "study":
        return [
          `Open the core material and identify goals for: ${title} (5m)`,
          "Read section 1 and highlight 3 key concepts (15m)",
          "Do a quick active recall recap (10m)",
        ];
      case "coding":
        return [
          `Inspect requirements and create branch for: ${title} (5m)`,
          "Implement core logic or bugfix and test locally (20m)",
          "Review code and commit changes (10m)",
        ];
      case "writing":
        return [
          `Outline key headers for: ${title} (5m)`,
          "Write the rough first draft of section 1 (15m)",
          "Review, edit, and finalize output (10m)",
        ];
      case "call":
        return [
          `Prepare contact details and notes for: ${title} (2m)`,
          "Make the call or send message (5m)",
          "Record outcomes and follow-up actions (3m)",
        ];
      default:
        return [
          `Clarify the concrete outcome for: ${title} (3m)`,
          "Execute the first low-resistance physical step (10m)",
          "Review result and check off completion (2m)",
        ];
    }
  }
}

/** Generates rich structured Markdown note */
function generateSmartNote(title: string, fa: boolean): string {
  if (fa) {
    return `# ${title}

## 📌 خلاصه و هدف
این یادداشت چارچوب، نکات کلیدی و الزامات مربوط به «${title}» را پوشش می‌دهد.

## 🎯 سرفصل‌های اصلی
- **هدف اولیه:** شفاف‌سازی خروجی مورد انتظار و کاهش ابهام
- **ملاحظات اجرایی:** اولویت‌بندی فعالیت‌ها و تعیین شاخص‌های موفقیت
- **منابع و ابزارها:** چک‌لیست اقلام و اطلاعات پیش‌نیاز

## ✅ اقدامات اجرایی (Checklist)
- [ ] گام اول: تدوین برنامه اولیه و مشخص کردن نیازمندی‌ها
- [ ] گام دوم: پیاده‌سازی و اجرای بخش اصلی کار
- [ ] گام سوم: ارزیابی کیفیت و ثبت بازخورد نهایی

## 💡 نکات و ایده‌های جانبی
برای پیشرفت روان، کار را به بلوک‌های زمانی ۲۰ الی ۲۵ دقیقه‌ای تقسیم کنید و پس از هر مرحله وضعیت را به‌روزرسانی کنید.
`;
  }
  return `# ${title}

## 📌 Overview & Objective
This note outlines the core requirements, milestones, and deliverables for "${title}".

## 🎯 Key Topics
- **Primary Goal:** Clear definition of success and scope.
- **Action Strategy:** High-leverage steps and dependency tracking.
- **Resources:** Reference docs and required inputs.

## ✅ Action Checklist
- [ ] Step 1: Clarify prerequisites and assemble key inputs
- [ ] Step 2: Execute the core deliverable
- [ ] Step 3: Review output and log final takeaways

## 💡 Insights & Notes
Tackle the highest friction subtasks during peak energy blocks.
`;
}

/** Handles inline text editing, polishing, shortening, and restructuring */
function handleInlineEdit(text: string, action: string = "improve", fa: boolean): string {
  const clean = text.trim();
  const act = action.toLowerCase();

  if (act.includes("shorten") || act.includes("کوتاه") || act.includes("خلاصه")) {
    const sentences = clean.split(/(?<=[.!؟?\n])\s+/).filter(Boolean);
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ").trim();
  }

  if (act.includes("bullet") || act.includes("بولت") || act.includes("لیست")) {
    const lines = clean.split(/\n+/).flatMap((l) => l.split(/(?<=[.!؟?])\s+/)).map((s) => s.trim()).filter(Boolean);
    return lines.map((l) => `• ${l.replace(/^[•\-\*\d\.]+\s*/, "")}`).join("\n");
  }

  if (act.includes("action") || act.includes("چک‌?لیست") || act.includes("task")) {
    const lines = clean.split(/\n+/).flatMap((l) => l.split(/(?<=[.!؟?])\s+/)).map((s) => s.trim()).filter(Boolean);
    return lines.map((l) => `- [ ] ${l.replace(/^[•\-\*\d\.]+\s*/, "")}`).join("\n");
  }

  if (act.includes("fix_grammar") || act.includes("گرامر") || act.includes("ویرایش")) {
    if (fa) {
      // Fix common Persian punctuation and prefixes
      return clean
        .replace(/\bمی\s+/g, "می‌")
        .replace(/\s+ها\b/g, "‌ها")
        .replace(/\s+تر\b/g, "‌تر")
        .replace(/\s+ترین\b/g, "‌ترین")
        .replace(/ , /g, "، ")
        .replace(/\s*؛\s*/g, "؛ ")
        .replace(/\s*:\s*/g, ": ");
    }
    return clean.replace(/\s+/g, " ").replace(/\s+([,\.!\?])/g, "$1").trim();
  }

  // Default improve / polish
  if (fa) {
    return clean
      .replace(/\bمی\s+/g, "می‌")
      .replace(/\s+ها\b/g, "‌ها")
      .replace(/ , /g, "، ")
      .trim();
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Generates intelligent, contextual offline chat responses */
function generateSmartChatResponse(raw: string, fa: boolean, mode: AIOperation = "chat", context?: string): string {
  const text = raw.toLowerCase();

  // Task-specific chat
  if (mode === "task_chat") {
    return fa
      ? `درباره این تسک (${context ? `زمینه: ${context}` : "فعال"}):\n` +
        "• اگر برای شروع مقاومت داری، قانون ۵ دقیقه را اجرا کن: فقط محیط کار را آماده کن و ۵ دقیقه ادامه بده.\n" +
        "• برای تسهیل کار، می‌توانی از من بخواهی این تسک را به مراحل ریزتر یا چک‌لیست تبدیل کنم.\n" +
        "• سوال یا مانع خاصی در این تسک داری؟"
      : `Regarding this task (${context ? `Context: ${context}` : "active"}):\n` +
        "• If you're facing resistance, commit to just 5 minutes of focused work.\n" +
        "• You can ask me to break this down into micro-steps or generate an action note.\n" +
        "• What specific blocker are you encountering?";
  }

  // Folder-specific chat
  if (mode === "folder_chat") {
    return fa
      ? `تحلیل پروژه و فولدر:\n` +
        "۱. کارهای با اولویت بالا و سنگین را به بخش اول روز اختصاص بده.\n" +
        "۲. تسک‌های مرتبط را دسته‌بندی کن تا از پرش مداوم تمرکز (Context Switching) جلوگیری شود.\n" +
        "۳. هدف اصلی این فولدر را مشخص کن تا تسک‌های متناسب با آن پیشنهاد دهم."
      : `Folder & Project Strategy:\n` +
        "1. Schedule high-leverage tasks during your peak cognitive hours.\n" +
        "2. Batch related subtasks to minimize context-switching penalties.\n" +
        "3. Let me know the primary milestone to generate tailored items.";
  }

  // Socratic guide (reflective questions only)
  if (mode === "socratic") {
    return fa
      ? "سه پرسش برای وضوح بیشتر ذهن شما:\n" +
        "۱. چه عاملی باعث شده این موضوع در این لحظه بیشترین اهمیت یا درگیری ذهنی را داشته باشد؟\n" +
        "۲. اگر مطمئن بودید که شکست نمی‌خورید، اولین اقدام فیزیکی شما در ۳۰ ثانیه آینده چه بود؟\n" +
        "۳. بدترین نتیجه احتمالی که ذهن از آن واهمه دارد چیست، و در عمل چقدر احتمال وقوع دارد؟"
      : "Three reflective questions for clarity:\n" +
        "1. What makes this issue feel most significant or pressing to you right now?\n" +
        "2. If success were guaranteed, what exact 30-second action would you take first?\n" +
        "3. What is the catastrophic worst-case your mind fears, and how realistically manageable is it?";
  }

  // 1. Procrastination / Overwhelm / Stress / CBT inquiry
  if (/(اهمال|تعلل|حوصله ندارم|خسته‌?ام|استرس|گیجم|سخته|نمی‌?تونم|procrastinat|overwhelm|tired|stressed|hard)/i.test(text)) {
    return fa
      ? "کاملاً قابل درکه؛ مغز در برابر کارهای مبهم یا بزرگ مقاومت می‌کنه. پیشنهاد من:\n" +
        "۱. کار را به یک قدم بسیار کوچک ۵ دقیقه‌ای تقسیم کن.\n" +
        "۲. هدف را روی کیفیت ۴۰٪ بگذار تا سد کمال‌گرایی بشکند (نسخه اول داغون).\n" +
        "۳. اگر می‌خواهی، عنوان کارت را بفرست تا همین الان به ۳ ریزگام تبدیلش کنم!"
      : "That's completely natural—brains resist vague or high-stakes tasks. My advice:\n" +
        "1. Break the task into an absurdly small 5-minute step.\n" +
        "2. Aim for 40% quality first to break perfectionism (Shitty First Draft).\n" +
        "3. Send me the task title and I'll break it into instant actionable micro-steps!";
  }

  // 2. Planning or goal setting inquiry
  if (/(برنامه‌?ریزی|هدف|پروژه|چیکار کنم|راهنمایی|plan|goal|project|what should i do)/i.test(text)) {
    return fa
      ? "برای یک برنامه‌ریزی موثر:\n" +
        "• هدف مشخص و خروجی نهایی را در یک خط بنویس.\n" +
        "• تسک‌های وابسته را دسته‌بندی کن (کارهای اول صبح = پرانرژی).\n" +
        "• می‌توانی جملات طبیعی مثل «فردا ساعت ۱۰ با احمد جلسه بگذار» را بنویسی تا خودکار ثبت کنم."
      : "For effective planning:\n" +
        "• Write down the tangible end result in one sentence.\n" +
        "• Group dependent tasks (tackle highest friction in the morning).\n" +
        "• You can type phrases like 'Call Ahmed tomorrow at 10am' and I will automatically extract the task and due date!";
  }

  // 3. Default smart assistant response
  return fa
    ? `دستیار هوشمند آفلاین فعال است. می‌توانم متن‌های شما را به تسک با تاریخ و اولویت تبدیل کنم، برای هر کار زیرتسک‌های اختصاصی بسازم، یادداشت‌های ساختاریافته تولید کنم یا خطاهای شناختی را تحلیل کنم. چه کمکی از دستم برمی‌آید؟`
    : `Offline Assistant is active. I can convert natural language into tasks with dates and priorities, generate domain-aware subtasks, create structured notes, or analyze CBT distortions. How can I assist you?`;
}

/** Generates topic suggestions */
function generateSuggestions(topic: string, fa: boolean): string {
  const domain = detectDomain(topic);
  if (fa) {
    return `پیشنهادهای موضوعی برای «${topic}»:\n` +
      `۱. تعیین هدف و خروجی مشخص در یک پاراگراف\n` +
      `۲. آماده‌سازی چک‌لیست پیش‌نیازها و ملزومات\n` +
      `۳. اختصاص یک بازه تمرکز ۲۵ دقیقه‌ای (Pomodoro)\n` +
      `۴. اجرای نسخه اولیه و ارزیابی موانع\n` +
      `۵. ثبت یادداشت خلاصه و تعیین گام‌های جلسه بعدی`;
  }
  return `Actionable suggestions for "${topic}":\n` +
    `1. Define the tangible definition of done\n` +
    `2. Outline prerequisite inputs and checklist\n` +
    `3. Schedule a 25-minute Pomodoro sprint\n` +
    `4. Ship a minimal viable draft\n` +
    `5. Log notes and record next steps`;
}

/** Detects CBT distortions using rich pattern scoring */
function detectCBTDistortions(text: string): {
  distortions: { key: string; explanation: string }[];
  alternative_thought: string;
} {
  const scores = scoreDistortions(text);
  const detected: { key: string; explanation: string }[] = [];

  for (const [key, score] of Object.entries(scores)) {
    if (score > 0) {
      const d = key as Distortion;
      detected.push({
        key: d,
        explanation: `${DISTORTION_LABELS[d]}: ${DISTORTION_HINTS[d]}`,
      });
    }
  }

  // If no specific distortion detected with high threshold, look for common negativity
  let altThought = "یک فکر واقعی‌تر و کارآمدتر: این فقط یک احساس گذراست، نه واقعیت قطعی. با برداشتن یک قدم کوچک می‌توانم وضعیت را بهتر کنم.";
  if (scores.all_or_nothing > 0) {
    altThought = "دنیا صفر و صد نیست. حتی یک کار نسبتاً خوب یا ناقص هم ارزش زیادی دارد و قدم مهمی رو به جلو است.";
  } else if (scores.overgeneralization > 0) {
    altThought = "یک اتفاق یا تجربه منفی به معنای تکرار همیشگی آن نیست. هر موقعیت شرایط خاص خودش را دارد.";
  } else if (scores.shoulds > 0) {
    altThought = "«باید»ها فقط فشار بی‌مورد ایجاد می‌کنند. ترجیح می‌دهم با آرامش و سرعت خودم پیش بروم.";
  } else if (scores.magnification > 0) {
    altThought = "بدترین حالت ممکن بسیار نامحتمل است و حتی اگر اتفاق بیفتد، راه‌حل‌های عملی برایش وجود دارد.";
  }

  return {
    distortions: detected.slice(0, 3),
    alternative_thought: altThought,
  };
}

/**
 * Tier 3: Deterministic & Smart NLP Engine (0 MB, instantaneous, 100% offline).
 * Fully covers all 14 AIOperations with zero latency and no download required.
 */
export function offlineAssistant(
  mode: AIOperation | string,
  input: unknown,
  language: "fa" | "en" | "auto" = "fa",
  action?: string,
  context?: string
): OfflineResult | null {
  if (!loadOfflineModelSettings().assistantEnabled) return null;
  const raw = textOf(input);
  const parsed = parseNaturalDate(raw);
  const isHigh = highPriority.test(raw);
  const isLow = lowPriority.test(raw);
  const priority = isHigh ? "high" : isLow ? "low" : "none";
  const fa = language !== "en";

  if (mode === "parse_task") {
    const title = parsed.cleanedTitle || raw;
    const domain = detectDomain(title);
    const data = {
      title,
      due_date: parsed.dueDate || null,
      priority,
      category: domain !== "general" ? domain : undefined,
      source: "offline-deterministic",
    };
    return { offline: true, tier: 3, data, text: JSON.stringify(data) };
  }

  if (mode === "task_metadata_suggest") {
    const domain = detectDomain(raw);
    const reason = fa
      ? isHigh
        ? "تشخیص فوریت و حساسیت زمانی در متن"
        : "اولویت استاندارد بر اساس تحلیل موضوعی"
      : isHigh
      ? "Urgency keywords detected"
      : "Standard priority based on context";
    const data = {
      priority,
      reason,
      due_date: parsed.dueDate || null,
      category: domain !== "general" ? domain : undefined,
      source: "offline-deterministic",
    };
    return { offline: true, tier: 3, data, text: JSON.stringify(data) };
  }

  if (mode === "task_subtasks" || mode === "breakdown") {
    const title = parsed.cleanedTitle || raw;
    const steps = generateSmartSubtasks(title, fa);
    return {
      offline: true,
      tier: 3,
      data: { subtasks: steps, source: "offline-deterministic" },
      text: steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    };
  }

  if (mode === "generate_note") {
    const title = parsed.cleanedTitle || raw;
    const noteContent = generateSmartNote(title, fa);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: noteContent,
    };
  }

  if (mode === "summarize_note") {
    const sentences = raw.split(/(?<=[.!؟?\n])\s+/).map((s) => s.trim()).filter(Boolean);
    const topSentences = sentences.slice(0, 4);
    const summary = fa
      ? `• نکات کلیدی یادداشت:\n` + topSentences.map((s) => `- ${s}`).join("\n")
      : `• Key Takeaways:\n` + topSentences.map((s) => `- ${s}`).join("\n");
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: summary || raw,
    };
  }

  if (mode === "improve_note" || mode === "inline_edit") {
    const result = handleInlineEdit(raw, action || "improve", fa);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: result,
    };
  }

  if (mode === "suggest") {
    const suggestions = generateSuggestions(raw, fa);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: suggestions,
    };
  }

  if (mode === "distortion_detect") {
    const result = detectCBTDistortions(raw);
    return {
      offline: true,
      tier: 3,
      data: {
        distortions: result.distortions,
        alternative_thought: result.alternative_thought,
        source: "offline-deterministic",
      },
      text: JSON.stringify(result),
    };
  }

  if (mode === "socratic") {
    const responseText = generateSmartChatResponse(raw, fa, "socratic", context);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: responseText,
    };
  }

  if (mode === "task_chat") {
    const responseText = generateSmartChatResponse(raw, fa, "task_chat", context);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: responseText,
    };
  }

  if (mode === "folder_chat") {
    const responseText = generateSmartChatResponse(raw, fa, "folder_chat", context);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: responseText,
    };
  }

  // chat, general, or any other query
  const responseText = generateSmartChatResponse(raw, fa, "chat", context);
  return {
    offline: true,
    tier: 3,
    data: { source: "offline-deterministic" },
    text: responseText,
  };
}

/**
 * 3-Tier Hybrid AI Runner:
 * Tier 2: Tries on-device generative LLM (Qwen 2.5 / SmolLM2) if selected and cached.
 * Tier 3: Seamlessly falls back to Smart NLP Engine if LLM not downloaded or on error.
 */
export async function runHybridOfflineAI(
  mode: AIOperation | string,
  input: unknown,
  language: "fa" | "en" | "auto" = "fa",
  action?: string,
  context?: string
): Promise<OfflineResult | null> {
  const settings = loadOfflineModelSettings();
  if (!settings.assistantEnabled) return null;

  const raw = textOf(input);
  const fa = language !== "en";

  // Tier 2: Check if an on-device generative LLM is chosen and ready
  if (isGenerativeAssistantModel(settings.assistantModel) && isOfflineLLMCached(settings.assistantModel)) {
    try {
      const systemPrompt = fa
        ? "شما دستیار هوشمند، دانا و همدل ARSHNAZ هستید که به صورت کاملاً آفلاین روی دستگاه کاربر اجرا می‌شوید. پاسخ‌های دقیق، مفید و به زبان فارسی شیوا ارائه دهید."
        : "You are the smart, on-device AI assistant for ARSHNAZ. Provide concise, helpful, and thoughtful responses.";

      let userPrompt = raw;
      if (mode === "parse_task") {
        userPrompt = fa
          ? `این متن را به تسک تبدیل کن و خروجی JSON با فیلدهای title, priority, due_date بده: "${raw}"`
          : `Parse this task into JSON with keys title, priority, due_date: "${raw}"`;
      } else if (mode === "task_subtasks" || mode === "breakdown") {
        userPrompt = fa
          ? `برای تسک «${raw}»، ۳ الی ۴ زیرتسک عملیاتی و کوتاه به صورت شماره‌دار بنویس.`
          : `Generate 3 to 4 actionable numbered subtasks for: "${raw}".`;
      } else if (mode === "generate_note") {
        userPrompt = fa
          ? `یک یادداشت کامل و ساختاریافته به فرمت مارک‌داون درباره این موضوع بنویس: "${raw}"`
          : `Write a complete structured Markdown note about: "${raw}".`;
      } else if (mode === "summarize_note") {
        userPrompt = fa
          ? `این یادداشت را در چند بولت خلاصه کن:\n${raw}`
          : `Summarize this note in bullet points:\n${raw}`;
      } else if (mode === "inline_edit") {
        userPrompt = fa
          ? `متن زیر را طبق دستور «${action || "بهبود"}» ویرایش کن و فقط متن نهایی را برگردان:\n${raw}`
          : `Edit this text according to action "${action || "improve"}":\n${raw}`;
      } else if (mode === "suggest") {
        userPrompt = fa
          ? `۵ پیشنهاد عملی و مفید درباره این موضوع ارائه بده: "${raw}"`
          : `Provide 5 actionable suggestions for: "${raw}".`;
      } else if (mode === "socratic") {
        userPrompt = fa
          ? `به عنوان یک راهنمای سقراطی، فقط ۲ تا ۳ سوال تفکربرانگیز بپرس تا کاربر خودش به پاسخ برسد:\n${raw}`
          : `As a Socratic guide, ask 2 to 3 reflective questions:\n${raw}`;
      }

      const generated = await generateOfflineLLM(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        settings.assistantModel,
        { maxNewTokens: 256, temperature: 0.3 }
      );

      if (generated && generated.trim().length > 0) {
        return {
          offline: true,
          tier: 2,
          text: generated.trim(),
          data: { source: "offline-llm", model: settings.assistantModel },
        };
      }
    } catch (llmErr) {
      console.warn("[OfflineAI] Generative on-device LLM error, falling back to Smart NLP Engine:", llmErr);
    }
  }

  // Tier 3: Instant Smart NLP Engine
  return offlineAssistant(mode, input, language, action, context);
}


