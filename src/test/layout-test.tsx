import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/layouts/AppLayout";
import "../index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function MockContent() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">امروز (Today Dashboard)</h1>
      <p className="text-muted-foreground mb-6">
        تسک‌های امروز برای بررسی عدم هم‌پوشانی سایدبار و محتوا
      </p>
      <div className="space-y-3">
        <div className="p-4 bg-card rounded-lg border shadow-sm flex items-center justify-between">
          <span className="font-medium">تسک اول: تست موقعیت سایدبار در سمت راست</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">فوری</span>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-sm flex items-center justify-between">
          <span className="font-medium">تسک دوم: بررسی اشغال فضا توسط spacer بدون هم‌پوشانی</span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">معمولی</span>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-sm flex items-center justify-between">
          <span className="font-medium">تسک سوم: تست حالت جمع‌شده (Collapsed / Icon Rail)</span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">پایین</span>
        </div>
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
                  <Route path="*" element={<MockContent />} />
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
