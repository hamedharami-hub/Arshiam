import { CheckCircle2, HeartPulse, ListTodo, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEVEL_NAME, LEVEL_THEME } from "@/components/planning/planningTheme";
import { LEVELS_TOP_DOWN } from "@/lib/planCascade";

const POINTS = [
  { icon: ListTodo, fa: "از هدف سال تا کار امروز، همه به هم وصل", en: "From the year's goal to today's task, all connected" },
  { icon: NotebookPen, fa: "نوت، دفتر روزانه و عادت‌ها در یک جا", en: "Notes, diary and habits in one place" },
  { icon: HeartPulse, fa: "مراقبت از ذهن و آرامش، کنار کارها", en: "Care for your mind, right beside your work" },
];

/** Brand side of the sign-in page: what ARSHNAZ helps with, shown as the planning cascade. */
export function AuthBrandPanel({ fa, dedication }: { fa: boolean; dedication: string }) {
  const lang = fa ? "fa" : "en";
  return (
    <section className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-[hsl(232_45%_16%)] p-6 text-white sm:p-10" data-testid="auth-brand-panel">
      <div aria-hidden className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-[hsl(330_80%_60%/0.25)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -start-20 h-80 w-80 rounded-full bg-[hsl(200_90%_55%/0.18)] blur-3xl" />

      <header className="relative flex items-center gap-3">
        <img src="/favicon.png" alt="ARSHNAZ" width={48} height={48} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20" />
        <div>
          <p className="text-xl font-black tracking-[0.18em]">ARSHNAZ</p>
          <p className="text-xs text-white/60">{fa ? "ارشناز · آرام، منظم، متمرکز" : "Calm, organised, focused"}</p>
        </div>
      </header>

      <div className="relative space-y-6">
        <h2 className="text-2xl font-bold leading-[1.6] sm:text-4xl lg:text-[2.6rem]">
          {fa ? <>برنامه‌ریزی که <span className="text-[hsl(330_85%_75%)]">واقعاً</span> به امروزت می‌رسد.</> : <>Plans that <span className="text-[hsl(330_85%_75%)]">actually</span> reach your today.</>}
        </h2>
        <ol className="flex flex-wrap items-center gap-1.5" aria-label={fa ? "سطح‌های برنامه‌ریزی" : "Planning levels"}>
          {LEVELS_TOP_DOWN.map((h, i) => (
            <li key={h} className="flex items-center gap-1.5 animate-fade-in-up" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
                <span className={cn("h-2 w-2 rounded-full", LEVEL_THEME[h].dot)} />{LEVEL_NAME[h][lang]}
              </span>
              {i < LEVELS_TOP_DOWN.length - 1 && <span className="text-white/40">{fa ? "←" : "→"}</span>}
            </li>
          ))}
        </ol>
        <ul className="hidden space-y-3 sm:block">
          {POINTS.map(({ icon: Icon, fa: f, en }) => (
            <li key={en} className="flex items-center gap-3 text-sm text-white/80">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10"><Icon className="h-4 w-4" /></span>{fa ? f : en}
            </li>
          ))}
        </ul>
      </div>

      <footer className="relative hidden items-center gap-2 text-xs text-white/60 sm:flex">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <span>{dedication}</span>
      </footer>
    </section>
  );
}
