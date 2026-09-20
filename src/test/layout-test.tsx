import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/layouts/AppLayout";
import { CheckSquare, Columns2, MoreVertical, Star, Calendar, Tag, CheckCircle2 } from "lucide-react";
import "../index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const MOCK_TASKS = Array.from({ length: 25 }, (_, i) => ({
  id: `task-${i + 1}`,
  title: [
    "بررسی معماری سیستم و بهینه‌سازی عملکرد پایگاه داده",
    "پیاده‌سازی تست‌های واحد برای بخش احراز هویت",
    "تنظیم ساختار جدید سایدبار دسکتاپ بدون هم‌پوشانی",
    "بررسی سازگاری مرورگرها در لینوکس و مک",
    "رفع باگ‌های گزارش‌شده در بخش چک‌این روزانه",
    "بهینه‌سازی زمان بارگذاری صفحات و کاهش حجم باندل",
    "طراحی کارت‌های وضعیت سلامت روان در داشبورد Mind",
    "همگام‌سازی یادداشت‌ها با فضای ابری فایربیس",
    "تست حالت دوپنله (Split View) در رزولوشن‌های عریض",
    "بررسی دسترسی‌پذیری و استانداردهای کیبورد و فوکوس",
  ][i % 10] + ` (${i + 1})`,
  priority: i % 4 === 0 ? "urgent" : i % 3 === 0 ? "high" : i % 2 === 0 ? "medium" : "low",
  completed: i % 5 === 0,
  tag: ["کاری", "شخصی", "توسعه", "سلامت"][i % 4],
}));

function TodaySplitViewContent() {
  const isRtl = typeof document !== "undefined" ? document.documentElement.dir !== "ltr" : true;

  return (
    <div
      data-testid="today-split-container"
      className="w-full h-[calc(100dvh-3.5rem)] flex flex-col p-3 md:p-4 space-y-3 overflow-hidden"
    >
      {/* Header bar within Today view */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isRtl ? "امروز (Today Dashboard)" : "Today Dashboard"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRtl
              ? "نمای دوپنله با ۲۵ تسک جهت اعتبارسنجی عدم هم‌پوشانی با سایدبار دسکتاپ"
              : "Split view with 25 tasks verifying zero overlay with desktop sidebar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-medium">
            ۲۵ تسک
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-lg border border-border/60 bg-secondary/50 font-medium"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>{isRtl ? "نمای دوپنله" : "Split View"}</span>
          </button>
        </div>
      </div>

      {/* Split view flex container */}
      <div
        data-task-split="true"
        dir="ltr"
        className="w-full flex-1 min-h-0 flex flex-row items-stretch gap-3 overflow-hidden"
      >
        {/* Left panel: Task detail placeholder */}
        <aside
          data-testid="task-detail-panel"
          dir={isRtl ? "rtl" : "ltr"}
          style={{ width: "45%" }}
          className="shrink-0 min-w-[280px] h-full overflow-y-auto rounded-2xl border border-dashed border-border/70 bg-card/40 flex flex-col items-center justify-center p-6 text-center text-muted-foreground shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {isRtl ? "یک تسک را انتخاب کنید" : "Select a task"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-5">
            {isRtl
              ? "جزئیات و ویرایش در پنل سمت چپ باز می‌شود؛ فهرست کارها در سمت راست باقی می‌ماند."
              : "Details open in the left panel while the task list remains on the right."}
          </p>
        </aside>

        {/* Vertical Splitter */}
        <div
          role="separator"
          aria-orientation="vertical"
          className="w-1.5 shrink-0 h-full flex items-center justify-center cursor-col-resize select-none touch-none"
        >
          <div className="w-1 h-12 rounded-full bg-border/80" />
        </div>

        {/* Right panel: Long Task List section */}
        <section
          data-testid="task-list-section"
          dir={isRtl ? "rtl" : "ltr"}
          className="flex-1 h-full min-w-0 min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/35 p-3 sm:p-4 shadow-sm space-y-2.5"
        >
          {MOCK_TASKS.map((t, idx) => (
            <div
              key={t.id}
              data-testid={`task-item-${idx}`}
              className="p-3 bg-card hover:bg-accent/40 rounded-xl border border-border/70 shadow-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    t.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                  }`}
                >
                  {t.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className={`text-sm truncate font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    t.priority === "urgent"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : t.priority === "high"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.priority}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 hidden sm:inline-flex">
                  <Tag className="w-3 h-3" />
                  {t.tag}
                </span>
                <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Harness() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="*" element={<AppLayout />}>
                  <Route path="*" element={<TodaySplitViewContent />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<Harness />);
}
