// Cognitive Load Engine v2 — A1
// Daily_Load = Σ(Task_Weight × Context_Switch_Penalty) × Sleep_Mult × Stress_Mult
//
// Task Weight by category (heuristic):
//   deep work = 4, creative = 3, comm = 2.5, shallow = 1.5, physical = 1, recovery = -0.5
// Inferred from priority + keyword in title/description.

export type TaskCategory = "deep" | "creative" | "comm" | "shallow" | "physical" | "recovery" | "unknown";

export const TASK_WEIGHTS: Record<TaskCategory, number> = {
  deep: 4, creative: 3, comm: 2.5, shallow: 1.5, physical: 1, recovery: -0.5, unknown: 2,
};

const KEYWORDS: Record<TaskCategory, RegExp> = {
  deep: /(deep|تمرکز|کدنویسی|نوشتن|تحلیل|طراحی|پژوهش|مطالعه|یادگیری)/i,
  creative: /(خلاق|طرح|ایده|ساخت|نقاشی|موسیقی|محتوا)/i,
  comm: /(جلسه|تماس|ایمیل|پاسخ|چت|پیام|ملاقات|meeting|call)/i,
  shallow: /(چک|مرور|پاسخ سریع|اداری|گزارش کوتاه)/i,
  physical: /(ورزش|دو|پیاده|تمرین|باشگاه|یوگا)/i,
  recovery: /(استراحت|چرت|مدیتیشن|تنفس|ریکاوری|nap)/i,
  unknown: /^$/,
};

export function categorizeTask(t: any): TaskCategory {
  const text = `${t.title || ""} ${t.description || ""}`;
  for (const cat of ["deep","creative","comm","shallow","physical","recovery"] as TaskCategory[]) {
    if (KEYWORDS[cat].test(text)) return cat;
  }
  return "unknown";
}

function inferTaskWeight(t: any): number {
  const cat = categorizeTask(t);
  const base = TASK_WEIGHTS[cat];
  // Priority modifier
  const pMod = t.priority === "high" ? 1.2 : t.priority === "low" ? 0.8 : 1.0;
  return base * pMod;
}

export function computeCognitiveLoad(opts: {
  tasks: any[];
  sleepHours?: number | null;
  sleepQuality?: number | null; // 1-10
  stress?: number | null; // 1-10
  hourOfDay?: number;
}): {
  load: number;
  breakdown: { base: number; switchMult: number; sleepMult: number; stressMult: number };
  perTask: { id: string; title: string; category: TaskCategory; weight: number }[];
} {
  const perTask = opts.tasks.map((t) => ({
    id: t.id, title: t.title, category: categorizeTask(t), weight: Math.round(inferTaskWeight(t) * 10) / 10,
  }));
  const base = perTask.reduce((s, t) => s + t.weight, 0);

  // Context switch: distinct folders/quadrants
  const distinctContexts = new Set(opts.tasks.map((t) => t.folder_id || t.quadrant || "x")).size;
  const switchMult = distinctContexts >= 5 ? 1.6 : distinctContexts >= 3 ? 1.3 : distinctContexts >= 2 ? 1.15 : 1.0;

  // Sleep multiplier — combines hours + quality
  let sleepMult = 1.0;
  if (opts.sleepHours != null) {
    if (opts.sleepHours < 5) sleepMult = 1.5;
    else if (opts.sleepHours < 6) sleepMult = 1.3;
    else if (opts.sleepHours < 7) sleepMult = 1.1;
    else if (opts.sleepHours >= 9) sleepMult = 1.05;
  }
  if (opts.sleepQuality != null && opts.sleepQuality <= 4) sleepMult *= 1.15;

  // Stress multiplier
  let stressMult = 1.0;
  if (opts.stress != null) {
    if (opts.stress >= 8) stressMult = 1.25;
    else if (opts.stress >= 6) stressMult = 1.1;
  }

  const load = base * switchMult * sleepMult * stressMult;
  return {
    load: Math.round(load * 10) / 10,
    breakdown: { base: Math.round(base * 10) / 10, switchMult, sleepMult, stressMult },
    perTask,
  };
}

export function loadStatus(load: number, threshold = 15): { label: string; tone: "ok" | "warn" | "high" } {
  if (load < threshold * 0.6) return { label: "سبک", tone: "ok" };
  if (load < threshold) return { label: "متعادل", tone: "ok" };
  if (load < threshold * 1.3) return { label: "بالا", tone: "warn" };
  return { label: "اضافه‌بار", tone: "high" };
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  deep: "کار عمیق",
  creative: "خلاقانه",
  comm: "ارتباطی",
  shallow: "سطحی",
  physical: "بدنی",
  recovery: "ریکاوری",
  unknown: "نامشخص",
};
