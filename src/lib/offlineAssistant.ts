import { parseNaturalDate } from "./nlDate";
import type { AIOperation } from "./aiSettings";
import { loadOfflineModelSettings, isGenerativeAssistantModel } from "./offlineModels";
import { generateOfflineLLM, isOfflineLLMCached } from "./offlineLLM";

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
function detectDomain(text: string): "study" | "coding" | "writing" | "call" | "clean" | "finance" | "health" | "general" {
  const t = text.toLowerCase();
  if (/(مطالع|کتاب|درس|فصل|جزوه|امتحان|کنکور|پادکست|آموزش|یادگیری|read|study|book|exam|learn)/i.test(t)) return "study";
  if (/(کد|برنامه|باگ|پروژه|ریکت|گیتهاب|دیتابیس|سرور|api|fix|bug|code|dev|git|feature)/i.test(t)) return "coding";
  if (/(نوشتن|نویس|نگارش|تدوین|تایپ|پایان‌?نامه|تز|گزارش|رزومه|نامه|ایمیل|متن|محتوا|write|article|report|thesis|essay)/i.test(t)) return "writing";
  if (/(تماس|زنگ|پیام|تلفن|هماهنگ|جلسه|صحبت|پیگیر|فیدبک|call|phone|message|meeting)/i.test(t)) return "call";
  if (/(تمیز|مرتب|نظافت|شستن|جارو|اتاق|کمد|وسایل|انباری|clean|organize|tidy)/i.test(t)) return "clean";
  if (/(پرداخت|قبض|بانک|بیمه|مالیات|قسط|ثبت‌?نام|فاکتور|واریز|پول|حساب|pay|bill|bank|finance|tax)/i.test(t)) return "finance";
  if (/(ورزش|دویدن|تمرین|باشگاه|پیاده‌?روی|شنا|حرکات|workout|gym|run|exercise)/i.test(t)) return "health";
  return "general";
}

/** Generates smart, domain-aware subtasks without generic hardcoded clichés */
function generateSmartSubtasks(title: string, fa: boolean): string[] {
  const domain = detectDomain(title);
  if (fa) {
    switch (domain) {
      case "study":
        return [
          `فهرست و منبع اصلی «${title}» را مشخص و باز کن`,
          "مطالعه بخش اول و یادداشت‌برداری از ۳ نکته کلیدی",
          "مرور اجمالی و ارزیابی درک مطالب",
        ];
      case "coding":
        return [
          `بررسی صورت مسئله و ایجاد برنچ مربوط به «${title}»`,
          "پیاده‌سازی حداقل لاجیک یا رفع باگ اولیه و تست محلی",
          "بررسی کد، کامیت و آماده‌سازی تغییرات",
        ];
      case "writing":
        return [
          `نوشتن ساختار و سرفصل‌های اصلی «${title}»`,
          "نگارش پیش‌نویس اولیه بخش اول بدون وسواس",
          "بازخوانی، ویرایش و ذخیره نسخه نهایی",
        ];
      case "call":
        return [
          `شماره یا کانال ارتباطی مخاطب «${title}» را مشخص کن`,
          "یادداشت کردن ۲ تا ۳ نکته اصلی گفتگو روی برگه",
          "برقراری ارتباط و ثبت نتیجه نهایی پیگیری",
        ];
      case "clean":
        return [
          `آماده‌سازی وسایل نظافت برای «${title}»`,
          "تفکیک و مرتب‌سازی بخش اصلی در یک تایمر ۱۰ دقیقه‌ای",
          "قرار دادن وسایل سر جای خود و اتمام کار",
        ];
      case "finance":
        return [
          `اطلاعات و مستندات لازم برای «${title}» را آماده کن`,
          "انجام فرآیند در سامانه یا درگاه مربوطه",
          "دریافت کد رهگیری یا رسید و ثبت نهایی",
        ];
      case "health":
        return [
          "آماده کردن لباس و تجهیزات ورزشی",
          "۵ دقیقه گرم کردن آرام و اجرای ست اول",
          "خنک کردن بدن و نوشیدن آب کافی",
        ];
      default:
        return [
          `ورودی‌ها و هدف شفاف کار «${title}» را مشخص کن`,
          "اولین گام فیزیکی عینی و ساده را در ۱۰ دقیقه انجام بده",
          "نتیجه کار را بررسی و وضعیت تسک را به‌روز کن",
        ];
    }
  } else {
    switch (domain) {
      case "study":
        return [
          `Open the core material and identify goals for: ${title}`,
          "Read section 1 and highlight 3 key concepts",
          "Do a quick active recall recap",
        ];
      case "coding":
        return [
          `Inspect requirements and create branch for: ${title}`,
          "Implement core logic or bugfix and test locally",
          "Review code and commit changes",
        ];
      case "writing":
        return [
          `Outline key headers for: ${title}`,
          "Write the rough first draft of section 1",
          "Review, edit, and finalize output",
        ];
      case "call":
        return [
          `Prepare contact details and notes for: ${title}`,
          "Make the call or send message",
          "Record outcomes and follow-up actions",
        ];
      default:
        return [
          `Clarify the concrete outcome for: ${title}`,
          "Execute the first low-resistance physical step",
          "Review result and check off completion",
        ];
    }
  }
}

/** Generates intelligent, contextual offline chat responses */
function generateSmartChatResponse(raw: string, fa: boolean): string {
  const text = raw.toLowerCase();

  // 1. Procrastination / Overwhelm / Stress / CBT inquiry
  if (/(اهمال|تعلل|حوصله ندارم|خسته‌?ام|استرس|گیجم|سخته|نمی‌?تونم|procrastinat|overwhelm|tired|stressed|hard)/i.test(text)) {
    return fa
      ? "کاملاً قابل درکه؛ مغز در برابر کارهای مبهم یا بزرگ مقاومت می‌کنه. پیشنهاد من:\n" +
        "۱. کار را به یک قدم بسیار کوچک ۵ دقیقه‌ای تقسیم کن.\n" +
        "۲. هدف را روی کیفیت ۴۰٪ بگذار تا سد کمال‌گرایی بشکند.\n" +
        "۳. اگر می‌خواهی، عنوان کارت را بفرست تا همین الان به ۳ ریزگام تبدیلش کنم!"
      : "That's completely natural—brains resist vague or high-stakes tasks. My advice:\n" +
        "1. Break the task into an absurdly small 5-minute step.\n" +
        "2. Aim for 40% quality first to break perfectionism.\n" +
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
    ? `دستیار هوشمند آفلاین فعال است. می‌توانم متن‌های شما را به تسک با تاریخ و اولویت تبدیل کنم، برای هر کار زیرتسک‌های اختصاصی بسازم، یا یادداشت‌ها را خلاصه کنم. چه کمکی از دستم برمی‌آید؟`
    : `Offline Assistant is active. I can convert natural language into tasks with dates and priorities, generate domain-aware subtasks, or summarize notes. How can I assist you?`;
}

/**
 * Tier 3: Deterministic & Smart NLP Engine (0 MB, instantaneous, 100% offline).
 * Always available, zero latency, no download required.
 */
export function offlineAssistant(
  mode: AIOperation,
  input: unknown,
  language: "fa" | "en" | "auto" = "fa"
): OfflineResult | null {
  if (!loadOfflineModelSettings().assistantEnabled) return null;
  const raw = textOf(input);
  const parsed = parseNaturalDate(raw);
  const isHigh = highPriority.test(raw);
  const isLow = lowPriority.test(raw);
  const priority = isHigh ? "high" : isLow ? "low" : "none";
  const fa = language !== "en";

  if (mode === "parse_task" || mode === "task_metadata_suggest") {
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

  if (mode === "task_subtasks") {
    const title = parsed.cleanedTitle || raw;
    const steps = generateSmartSubtasks(title, fa);
    return {
      offline: true,
      tier: 3,
      data: { subtasks: steps, source: "offline-deterministic" },
      text: steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
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

  if (mode === "chat") {
    const responseText = generateSmartChatResponse(raw, fa);
    return {
      offline: true,
      tier: 3,
      data: { source: "offline-deterministic" },
      text: responseText,
    };
  }

  return null;
}

/**
 * 3-Tier Hybrid AI Runner:
 * Tier 2: Tries on-device generative LLM (Qwen 2.5 / SmolLM2) if selected and cached.
 * Tier 3: Seamlessly falls back to Smart NLP Engine if LLM not downloaded or on error.
 */
export async function runHybridOfflineAI(
  mode: AIOperation,
  input: unknown,
  language: "fa" | "en" | "auto" = "fa"
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
      } else if (mode === "task_subtasks") {
        userPrompt = fa
          ? `برای تسک «${raw}»، ۳ الی ۴ زیرتسک عملیاتی و کوتاه به صورت شماره‌دار بنویس.`
          : `Generate 3 to 4 actionable numbered subtasks for: "${raw}".`;
      } else if (mode === "summarize_note") {
        userPrompt = fa
          ? `این یادداشت را در چند بولت خلاصه کن:\n${raw}`
          : `Summarize this note in bullet points:\n${raw}`;
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
  return offlineAssistant(mode, input, language);
}

