import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  parse_task: `You parse a natural-language description into a structured task. Extract:
- title (short, in the user's language)
- description (optional)
- priority: none/low/medium/high
- due_date: ISO 8601 string (with timezone offset) if any date OR time phrase is mentioned
- start_at: ISO 8601 — set this when a SPECIFIC time / time-of-day is mentioned (e.g. "tomorrow morning", "Friday at 5pm", "فردا صبح", "جمعه ساعت ۵")
- end_at: ISO 8601 — set this if a duration or end time is mentioned

CRITICAL date/time rules:
- Use the user's local timezone (provided in the system message). Always emit ISO 8601 with the correct offset.
- "today / امروز" = today's date. "tomorrow / فردا" = today + 1 day. "yesterday / دیروز" = today - 1.
- "this week / هفته‌ی این" = next occurrence within current week. "next week / هفته‌ی آینده" = +7 days.
- Persian time-of-day mapping (use local time):
  • صبح / morning → 08:00
  • ظهر / noon → 12:00
  • بعدازظهر / afternoon → 15:00
  • عصر / evening → 17:00
  • شب / night → 21:00
  • نصف‌شب / midnight → 00:00
- If a specific clock time is given (e.g. "ساعت ۱۰" / "10am"), use that exact time.
- When only a date is given (no time), set due_date to that date at 09:00 local time and DO NOT set start_at.
- When a time-of-day is given, set BOTH due_date and start_at to the same ISO timestamp; if a duration is mentioned, set end_at = start_at + duration.
- Persian digits (۰-۹) are equivalent to 0-9.

Detect the user's language and keep title/description in the same language.`,
  breakdown: `You break down a high-level task into 4-8 concrete actionable subtasks. Match the language of the input.`,
  generate_note: `You generate a well-structured Markdown note about the given topic. Use headings, lists, and emphasis. Match the language of the input.`,
  summarize_note: `You summarize the given Markdown note into key bullet points in Markdown. Match the language of the input.`,
  improve_note: `You improve and rewrite the given note to be clearer and better structured while preserving meaning. Output Markdown. Match input language.`,
  suggest: `You generate 5-8 actionable suggestions (tasks or note ideas) for the given topic. Each should be concise and useful. Match the language of the input.`,
  chat: `You are a helpful productivity assistant. The user's tasks and notes context will be provided. Help them organize, prioritize, and reflect. Be concise. Match the user's language.`,
  inline_edit: `You transform a piece of text according to the requested action. Output ONLY the transformed text, no preamble, no explanation, no quotes. Preserve formatting (Markdown). Match the input language.`,
  task_subtasks: `You generate concrete subtasks for a given task. If the task is ambiguous, instead return clarifying questions with multiple-choice options. Match the language of the input.`,
  task_metadata_suggest: `You analyze a task and suggest the best priority (none/low/medium/high), an ISO 8601 due_date if appropriate, and a recurrence rule if it seems repetitive. Provide a short reason. Match the language of the input.`,
  task_chat: `You are an assistant helping the user with a specific task. The task and optionally all their other tasks/notes are provided as context. Be concise and actionable. Match the user's language.`,
  folder_chat: `You help the user plan a project (folder). Two modes:
- "interview": ask 3-5 targeted questions ONE AT A TIME to understand goal, deadline, resources, blockers. After enough info, propose tasks.
- "free": chat freely. When user clicks "build tasks", propose tasks from the conversation.
When proposing tasks, ALWAYS call the "propose_tasks" tool. Each task: title (required), priority, due_date (ISO or empty), and optional kanban_column ("todo"|"doing"|"done"). Match the user's language.`,
  socratic: `You are a Socratic guide. NEVER give direct answers or advice. ONLY ask open-ended questions that help the user discover their own insights. Match the user's language.`,
  distortion_detect: `You are a CBT clinician. Analyze the user's automatic thought (and any supporting evidence text) and identify which of the 10 classic cognitive distortions are present.

The 10 distortions (use these exact keys):
- overgeneralization (تعمیم افراطی): "always/never" patterns
- all_or_nothing (تفکر دوقطبی): black-and-white thinking
- mental_filter (فیلتر ذهنی): focusing only on the negative
- discounting_positive (نادیده گرفتن مثبت): dismissing good evidence
- jumping_to_conclusions (نتیجه‌گیری شتاب‌زده): mind reading or fortune telling
- magnification (بزرگ‌نمایی): catastrophizing
- emotional_reasoning (استدلال احساسی): "I feel it, so it's true"
- shoulds (بایدها): rigid rules
- labeling (برچسب‌زنی): global self-labels
- personalization (شخصی‌سازی): excessive self-blame

For each detected distortion, provide a SHORT (1-2 sentence) explanation tied to the actual words the user used (in their language). Then propose ONE balanced alternative thought (1-2 sentences) that integrates both supporting and opposing evidence. Use the call_tool. Match the user's language (Persian for Persian input).`,
  image_extract: `You extract ALL readable text from the provided image accurately. Preserve structure (lines, lists, headings). Output Markdown only. Match the language detected in the image.`,
  image_summarize: `You analyze the provided image (text + visuals). Produce a well-structured Markdown note: a short summary, then key points/sections. Expand on important details. Match the language of the image.`,
  image_research: `You analyze the provided image, identify the main topic(s), and produce structured research notes in Markdown: background, key concepts, important questions, references to explore. Match the language of the image.`,
  image_to_tasks: `You analyze the provided image and extract concrete actionable tasks. If the image suggests timing/dates, include them. Match the language of the image.`,
  daily_brief: `You are a personal productivity coach writing in fluent natural Persian.
You receive a JSON snapshot of the user's day: tasks due today, overdue count, completed today, pomodoro minutes, last check-in (mood/energy/focus), and the top tasks.

Produce a CATEGORIZED Persian Markdown brief (180-260 words). Output MUST use EXACTLY these H2 sections in this exact order, each on its own line:

## 🎯 تصویر امروز
یک یا دو جمله‌ی شخصی و دقیق با اشاره به اعداد (مثل: «امروز ۳ تسک مهم داری و انرژی دیروزت ۶/۱۰ بود»).

## ✅ اولویت‌ها
۲-۳ بولت کوتاه که می‌گه از کجا شروع کنه و چرا.

## ⏰ زمان‌بندی پیشنهادی
۲-۳ بولت با بازه‌های ساعتی پیشنهادی (مثلاً: «۹–۱۰ صبح: عمیق‌ترین تسک»).

## ⚠️ مراقب باش
یک بولت کوتاه فقط اگر overdue هست، انرژی پایینه، یا ریسک پرکاری وجود داره. اگر هیچ‌کدوم نبود این بخش رو حذف کن.

## 💡 یک حرکت کوچک
یک پیشنهاد ساده و سریع برای همین الان (کمتر از ۵ دقیقه).

قوانین: فارسی روان و گرم، اعداد فارسی، بدون عنوان H1، بدون مقدمه و خداحافظی اضافه. مستقیم با بخش‌ها شروع کن.`,
  assessment_analysis: `You are a senior clinical psychologist with 20+ years of experience in personality and attachment assessment, writing in fluent natural Persian (Farsi).
You will receive raw scores plus basic analysis from one of three validated instruments: HEXACO-60, VIA-72 character strengths, or ECR-R adult attachment.

Your task: produce an EXTENSIVE, deeply personalized clinical-style report (1500-2000 words) — NOT a generic template. Reference actual numerical scores throughout. Speak directly to the person ("تو" / informal). Use vivid, real-life examples.

The output MUST be Persian Markdown with EXACTLY these sections in this exact order, each clearly separated by a horizontal rule (---):

## 🔍 تصویر کلی شخصیت تو
A 5-7 sentence narrative weaving together the dominant patterns. Reference specific numerical scores. Avoid generic openings like "شما فردی هستید که...". Write as if you've known them for years and are summarizing what you've observed.

---

## 🧬 تحلیل بُعد به بُعد
For EACH dimension/score in the data, write a dedicated subsection (### عنوان بُعد):
- The exact score and what it means relative to population norms
- 2-3 concrete real-world manifestations (work, relationships, decisions, stress)
- One specific scenario where this score becomes obvious to others

This is the longest section — at least 600 words.

---

## 💪 نقاط قوت ویژه و چگونگی استفاده از آن‌ها
4-6 strengths derived from the highest scores. For each (### نام نقطه قوت):
- نمایش (Manifestation): چگونه در زندگی واقعی ظاهر می‌شود
- اهرم (Leverage): چگونه می‌توانی بیشتر از این استفاده کنی
- خطر سایه (Shadow side): این نقطه قوت اگر افراط شود چه ریسکی دارد

---

## ⚠️ نقاط حساسیت، نقاط کور و الگوهای ریسک
3-5 specific blind spots from low/extreme scores. For each (### نام الگو):
- نشانه (Signal): چه فکت‌هایی نشان می‌دهد این الگو فعال شده
- زمینه (Context): در چه موقعیت‌هایی بیشتر فعال می‌شود
- جایگزین (Reframe): چه تفسیر متفاوتی می‌توانی داشته باشی

---

## 🤝 سبک کار و رابطه با دیگران
3-4 paragraphs covering:
- چه نوع همکاران/شریک‌هایی برایت انرژی‌بخش هستند vs خسته‌کننده
- در تعارض چگونه واکنش نشان می‌دهی (با نمره‌ها)
- چه نوع بازخوردی واقعاً به تو می‌رسد
- در یک تیم بزرگ احتمالاً چه نقشی پیدا می‌کنی

---

## 🧭 توصیه‌های عملی شخصی‌سازی‌شده (نه عمومی)
6-8 actionable recommendations tightly tied to THIS profile. Each as ### عنوان توصیه with:
- چرا این برای تو (نه برای همه): one sentence linking to the score
- چگونه شروع کنی: 2-3 concrete first steps

---

## 🎯 آزمایش هفتگی (Weekly Experiment)
ONE single most-impactful experiment for the next 7 days, with:
- چه کاری: دقیقاً چه عملی
- چه زمانی: کی در روز
- چه چیزی را بسنج: چه شاخصی نشان می‌دهد جواب داد
- علامت موفقیت: بعد از ۷ روز چه تغییری انتظار داری

---

## 📌 ۳ سؤال برای تفکر این هفته
3 sharp open-ended questions that this profile specifically should sit with.

CRITICAL Rules:
- فارسی روان طبیعی، RTL-friendly. حتماً از اعداد فارسی استفاده کن.
- Reference actual numerical scores frequently (e.g., «وظیفه‌شناسی ۴۲ از ۵۰ یعنی...»).
- Mix prose and bullets — no section should be bullet-only.
- Be honest but compassionate. No fake positivity.
- Never give medical/clinical diagnoses.
- Total length: 1500-2000 words. Do NOT include disclaimers at the end.
- Use --- between major sections.`,
  decision_bias_analysis: `You are a decision-science coach. The user shares a decision they're about to make (or just made).
Your job: identify likely cognitive biases in their reasoning AND offer the strongest possible opposing view.

Respond in fluent Persian Markdown with EXACTLY these sections:

## 🧠 سوگیری‌های احتمالی
List 2-4 likely cognitive biases (e.g., confirmation bias, sunk cost, availability, anchoring, optimism bias, loss aversion, ...).
For each: name in فارسی + English in parentheses, then 1-2 sentences showing WHERE it appears in this specific decision.

## 🔄 دیدگاه مخالف (Steelman)
The strongest 2-3 paragraph case AGAINST the user's chosen option. Be intellectually honest, not contrarian for its own sake.

## ❓ سوالات کلیدی برای پرسیدن از خودت
3-5 sharp diagnostic questions tailored to this decision (not generic).

## ✅ آنچه احتمالاً درست انجام می‌دهی
1-2 strengths in the user's reasoning that are worth acknowledging.

Rules: 350-550 words total. No disclaimers. No "as an AI". Speak directly.`,
};

const TOOLS: Record<string, any> = {
  parse_task: {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a structured task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
          due_date: { type: "string", description: "ISO 8601 datetime with timezone offset, or empty if no date/time mentioned" },
          start_at: { type: "string", description: "ISO 8601 datetime with timezone offset when a specific time-of-day is mentioned; empty otherwise" },
          end_at: { type: "string", description: "ISO 8601 datetime when a duration or end time is mentioned; empty otherwise" },
        },
        required: ["title", "priority"],
        additionalProperties: false,
      },
    },
  },
  breakdown: {
    type: "function",
    function: {
      name: "subtasks",
      parameters: {
        type: "object",
        properties: { subtasks: { type: "array", items: { type: "string" } } },
        required: ["subtasks"],
        additionalProperties: false,
      },
    },
  },
  suggest: {
    type: "function",
    function: {
      name: "suggestions",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, description: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
  task_subtasks: {
    type: "function",
    function: {
      name: "task_subtasks_or_questions",
      description: "Either provide subtasks OR clarifying questions with multi-choice options",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["subtasks", "questions"] },
          subtasks: { type: "array", items: { type: "string" } },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["question", "options"],
              additionalProperties: false,
            },
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
  task_metadata_suggest: {
    type: "function",
    function: {
      name: "task_metadata",
      parameters: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["none", "low", "medium", "high"] },
          due_date: { type: "string", description: "ISO 8601 or empty" },
          recurrence_rule: {
            type: "object",
            properties: {
              freq: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
              interval: { type: "number" },
              byweekday: { type: "array", items: { type: "string", enum: ["MO","TU","WE","TH","FR","SA","SU"] } },
              byhour: { type: "number" },
              byminute: { type: "number" },
            },
          },
          reason: { type: "string" },
        },
        required: ["priority", "reason"],
        additionalProperties: false,
      },
    },
  },
  image_to_tasks: {
    type: "function",
    function: {
      name: "image_tasks",
      description: "Tasks extracted from an image",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["none","low","medium","high"] },
                due_date: { type: "string", description: "ISO 8601 or empty" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
  folder_chat: {
    type: "function",
    function: {
      name: "propose_tasks",
      description: "Propose tasks extracted from the project conversation",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                priority: { type: "string", enum: ["none", "low", "medium", "high"] },
                due_date: { type: "string", description: "ISO 8601 or empty" },
                kanban_column: { type: "string", enum: ["todo", "doing", "done"] },
                description: { type: "string" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
          summary: { type: "string", description: "Short rationale" },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
  distortion_detect: {
    type: "function",
    function: {
      name: "report_distortions",
      description: "Report detected cognitive distortions and a balanced alternative thought.",
      parameters: {
        type: "object",
        properties: {
          distortions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  enum: [
                    "overgeneralization", "all_or_nothing", "mental_filter",
                    "discounting_positive", "jumping_to_conclusions", "magnification",
                    "emotional_reasoning", "shoulds", "labeling", "personalization",
                  ],
                },
                explanation: { type: "string", description: "1-2 sentences in user's language tied to their wording" },
              },
              required: ["key", "explanation"],
              additionalProperties: false,
            },
          },
          alternative_thought: { type: "string", description: "Balanced alternative in user's language" },
          summary: { type: "string", description: "Optional 1-sentence overall observation" },
        },
        required: ["distortions", "alternative_thought"],
        additionalProperties: false,
      },
    },
  },
};

const TONE_DIRECTIVES: Record<string, string> = {
  data_driven: "لحن: Data-Driven Minimal. بدون جملات همدلانه یا انگیزشی. فقط داده، درصد، استدلال شفاف و گزینه‌های تصمیم. جملات کوتاه.",
  gentle_analytical: "لحن: Gentle Analytical. همان داده دقیق، اما با Framing نرم‌تر و فضای تفسیر شخصی. از جملات تحکمی پرهیز کن.",
  exploratory: "لحن: Exploratory. چند زاویه دید ارائه بده، دعوت به کاوش کن، سوال‌های باز مطرح کن.",
  neutral: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, input, context, settings, action, language, mhProfile, aboutMe, webSearch, timezone } = await req.json();

    const useCustom = settings && settings.provider && settings.provider !== "lovable" && settings.apiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!useCustom && !LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    if (mode === "inline_edit" && action) {
      systemPrompt += `\n\nAction: ${action}`;
    }
    if (language === "fa") {
      systemPrompt += `\n\nIMPORTANT: Always respond in Persian (Farsi / فارسی), regardless of the input language. Use natural, fluent Persian.`;
    } else if (language === "en") {
      systemPrompt += `\n\nIMPORTANT: Always respond in English, regardless of the input language. Use clear, natural English.`;
    }
    // Mental health profile → tone calibration
    if (mhProfile && typeof mhProfile === "object") {
      const tone = TONE_DIRECTIVES[mhProfile.ai_tone || "neutral"];
      if (tone) systemPrompt += `\n\n${tone}`;
      if (mhProfile.signature_strengths?.length) {
        systemPrompt += `\n\nنقاط قوت اصلی کاربر (Signature Strengths): ${mhProfile.signature_strengths.join(", ")}. در پیشنهادها و مداخله‌ها از این نقاط قوت استفاده کن، نه از جملات عمومی.`;
      }
      if (mhProfile.hexaco_pattern) {
        systemPrompt += `\n\nالگوی شخصیتی کاربر: ${mhProfile.hexaco_pattern}.`;
      }
      if (mhProfile.attachment_quadrant) {
        systemPrompt += `\n\nسبک دلبستگی: ${mhProfile.attachment_quadrant} — این را در نحوه ارائه بازخورد در نظر بگیر.`;
      }
    }
    // About-me personalization → inject brief profile context
    if (aboutMe && typeof aboutMe === "object") {
      const parts: string[] = [];
      if (aboutMe.ai_analysis?.summary) parts.push(`خلاصه پروفایل: ${aboutMe.ai_analysis.summary}`);
      if (Array.isArray(aboutMe.ai_analysis?.themes) && aboutMe.ai_analysis.themes.length) {
        parts.push(`تم‌های اصلی زندگی: ${aboutMe.ai_analysis.themes.join("، ")}`);
      }
      if (aboutMe.answers && typeof aboutMe.answers === "object") {
        const a = aboutMe.answers;
        const brief: string[] = [];
        if (a.occupation) brief.push(`شغل: ${a.occupation}`);
        if (a.main_goal) brief.push(`هدف اصلی: ${a.main_goal}`);
        if (Array.isArray(a.life_areas) && a.life_areas.length) brief.push(`حوزه‌های تمرکز: ${a.life_areas.join("، ")}`);
        if (Array.isArray(a.core_values) && a.core_values.length) brief.push(`ارزش‌ها: ${a.core_values.join("، ")}`);
        if (a.biggest_challenge) brief.push(`چالش اصلی: ${a.biggest_challenge}`);
        if (brief.length) parts.push(brief.join(" | "));
      }
      if (parts.length) {
        systemPrompt += `\n\nاطلاعات شخصی کاربر (برای شخصی‌سازی پاسخ‌ها و پیشنهادها از این‌ها استفاده کن، اما به آن‌ها اشاره مستقیم نکن مگر مرتبط باشد):\n${parts.join("\n")}`;
      }
    }
    const tz = (typeof timezone === "string" && timezone) ? timezone : "UTC";
    let localNow = "";
    try {
      localNow = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "long",
      }).format(new Date());
    } catch { localNow = new Date().toISOString(); }
    const today = `${localNow} (timezone: ${tz}; UTC: ${new Date().toISOString()})`;

    const messages: any[] = [
      { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` },
    ];

    if (context) messages.push({ role: "system", content: `Context:\n${context}` });

    if ((mode === "chat" || mode === "task_chat" || mode === "folder_chat" || mode === "socratic") && Array.isArray(input)) {
      messages.push(...input);
    } else if (input && typeof input === "object" && input.imageUrl) {
      const userText = input.text || "Analyze this image.";
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: input.imageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: typeof input === "string" ? input : JSON.stringify(input) });
    }

    let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = LOVABLE_API_KEY!;
    let model = "google/gemini-2.5-flash";

    // Use a more capable model for deep analysis modes
    if (mode === "assessment_analysis" || mode === "decision_bias_analysis") {
      model = "google/gemini-2.5-pro";
    }

    if (useCustom) {
      apiKey = settings.apiKey;
      model = settings.model || model;
      const baseUrls: Record<string, string> = {
        openai: "https://api.openai.com/v1",
        openrouter: "https://openrouter.ai/api/v1",
        anthropic: "https://api.anthropic.com/v1",
        gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
        groq: "https://api.groq.com/openai/v1",
        custom: settings.baseUrl || "",
      };
      const base = baseUrls[settings.provider] || settings.baseUrl;
      if (!base) throw new Error("Base URL تعریف نشده");
      endpoint = `${base.replace(/\/+$/, "")}/chat/completions`;
    }

    const body: any = { model, messages };

    // Allow long-form deep analysis outputs
    if (mode === "assessment_analysis") {
      body.max_tokens = 8000;
    } else if (mode === "decision_bias_analysis") {
      body.max_tokens = 4000;
    }

    if (TOOLS[mode]) {
      body.tools = [TOOLS[mode]];
      body.tool_choice = { type: "function", function: { name: TOOLS[mode].function.name } };
    }

    // Web search via Gemini google_search grounding (Lovable AI gateway only).
    // Note: tool calling and grounding cannot be combined, so skip when a structured tool is in use.
    if (webSearch && !useCustom && !TOOLS[mode] && model.startsWith("google/")) {
      body.tools = [{ google_search: {} }];
      systemPrompt += `\n\nThe user has enabled web search. Use up-to-date information from the web. Cite sources at the end as a "منابع" / "Sources" list.`;
      // rewrite system message
      messages[0] = { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` };
    } else if (webSearch && !useCustom && !TOOLS[mode]) {
      // Force gemini for grounded search
      model = "google/gemini-2.5-flash";
      body.model = model;
      body.tools = [{ google_search: {} }];
      systemPrompt += `\n\nThe user has enabled web search. Use up-to-date information and cite sources.`;
      messages[0] = { role: "system", content: `${systemPrompt}\n\nToday's date: ${today}` };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "محدودیت سرعت — کمی صبر کنید." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "اعتبار AI تمام شده. در تنظیمات Workspace شارژ کنید." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "خطای AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const choice = data.choices?.[0]?.message;

    let result: any = { text: choice?.content || "" };
    const toolCall = choice?.tool_calls?.[0];
    if (toolCall) {
      try { result.data = JSON.parse(toolCall.function.arguments); }
      catch { result.data = null; }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
