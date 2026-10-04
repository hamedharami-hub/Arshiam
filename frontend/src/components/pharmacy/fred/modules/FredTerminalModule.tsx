import { AlertTriangle, FileText, RotateCcw, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EDUCATIONAL_TERMINAL_CHIPS, TERMINAL_INPUT_MAX_LENGTH } from "@/lib/pharmacyFredPractice";
import { useFredPractice } from "../FredPracticeContext";
export function FredTerminalModule() {
const { T, isEn, terminalState, terminalInput, setTerminalInput, handleRunTerminalCommand, handleResetTerminal } = useFredPractice();
return (
        <section className="space-y-5 animate-in fade-in duration-200" aria-label={T("ترمینال تمرینی", "Practice Terminal")}>
          {/* Header & Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>{T("ترمینال تمرینی", "Practice Terminal")}</span>
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {T(
                  "کنسول متنی تمرینی موقت برای آزمودن فرامین مجاز در حافظه، بدون اتصال به سیستم‌های خارجی یا واقعی.",
                  "Temporary practice text console for testing whitelisted commands in memory, without external or live connections."
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTerminal}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{T("بازنشانی ترمینال", "Reset Terminal")}</span>
            </Button>
          </div>

          {/* Prominent Watermark Banner */}
          <div className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 p-2.5 rounded-xl text-center font-sans text-xs font-extrabold tracking-wider space-y-0.5">
            <div>⚠️ TRAINING ONLY — NOT CONNECTED TO A PHARMACY SYSTEM</div>
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300" dir="rtl">
              ⚠️ فقط آموزشی — متصل به هیچ سامانه داروخانه‌ای نیست
            </div>
          </div>

          {/* Two-Column Grid: Left = Console & Input, Right = Reference & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Command Input & Terminal Console */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Command Input Area */}
              <div className="space-y-2">
                <label
                  htmlFor="fred-terminal-input"
                  className="text-xs font-semibold text-foreground block"
                >
                  {T("ورود فرمان تمرینی (Whitelisted Command):", "Enter whitelisted command:")}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fred-terminal-input"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    maxLength={TERMINAL_INPUT_MAX_LENGTH}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRunTerminalCommand(terminalInput);
                      }
                    }}
                    placeholder={
                      isEn
                        ? "e.g. HELP, OPEN A, OPEN B, STATUS, CLEAR, RESET"
                        : "مثال: HELP, OPEN A, OPEN B, STATUS, CLEAR, RESET"
                    }
                    className="font-mono text-sm max-w-lg"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRunTerminalCommand(terminalInput)}
                    className="gap-1.5 cursor-pointer text-xs shrink-0"
                  >
                    <span>{T("اجرا", "Execute")}</span>
                  </Button>
                </div>
              </div>

              {/* Quick Whitelisted Command Chips */}
              <div className="space-y-1.5" dir={isEn ? "ltr" : "rtl"}>
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {T("فرمان‌های سریع (کلیک برای اجرا):", "Quick commands (click to execute):")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {EDUCATIONAL_TERMINAL_CHIPS.map((chip) => (
                    <button
                      key={chip.command}
                      type="button"
                      onClick={() => handleRunTerminalCommand(chip.command)}
                      className="px-2.5 py-1 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="font-mono text-primary text-[11px] font-bold" dir="ltr">
                        {chip.command}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({isEn ? chip.labelEn : chip.labelFa})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Console Output Display */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1" dir={isEn ? "ltr" : "rtl"}>
                  <span className="font-bold flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{T("خروجی کنسول تمرینی", "Training Console Output")}</span>
                  </span>
                  <span className="font-mono text-[10px]">
                    {terminalState.history.length} {T("ورودی", "entries")}
                  </span>
                </div>

                <div
                  role="log"
                  aria-live="polite"
                  aria-label={T("گزارش خروجی ترمینال", "Terminal output log")}
                  className="bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-xs border border-slate-800 shadow-inner space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto"
                >
                  {terminalState.history.length === 0 ? (
                    <div className="py-12 text-center space-y-2 text-slate-400">
                      <Terminal className="h-8 w-8 mx-auto opacity-40 text-emerald-400" />
                      <p className="font-sans text-xs">
                        {T(
                          "کنسول خالی است. فرمانی وارد کنید یا روی یکی از دکمه‌های بالا (مثل HELP یا OPEN A) کلیک کنید.",
                          "Console is empty. Enter a command or click a chip above (e.g. HELP or OPEN A)."
                        )}
                      </p>
                    </div>
                  ) : (
                    terminalState.history.map((entry) => (
                      <div key={entry.id} className="space-y-1">
                        {/* Timestamp & Type indicator */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono">{entry.timestamp}</span>
                          <span className="uppercase text-[9px] px-1 rounded bg-slate-900 border border-slate-800">
                            {entry.type}
                          </span>
                        </div>

                        {/* Entry Content */}
                        {entry.type === "command" && (
                          <div className="text-emerald-400 font-bold font-mono text-start" dir="ltr">
                            {entry.textEn}
                          </div>
                        )}

                        {entry.type === "output" && (
                          <div
                            className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-sans text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80"
                            dir="auto"
                          >
                            {isEn ? entry.textEn : entry.textFa}
                          </div>
                        )}

                        {entry.type === "error" && (
                          <div
                            className="text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 flex items-start gap-2 font-sans text-xs break-words"
                            dir="auto"
                          >
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>{isEn ? entry.textEn : entry.textFa}</div>
                          </div>
                        )}

                        {entry.type === "system" && (
                          <div
                            className="text-sky-300 bg-sky-950/40 p-2.5 rounded-xl border border-sky-900/60 flex items-start gap-2 font-sans text-xs break-words"
                            dir="auto"
                          >
                            <RotateCcw className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                            <div>{isEn ? entry.textEn : entry.textFa}</div>
                          </div>
                        )}

                        {entry.type === "card" && entry.cardDetail && (
                          <div className="space-y-2">
                            <div className="text-emerald-300 text-xs font-sans" dir="auto">
                              {isEn ? entry.textEn : entry.textFa}
                            </div>
                            <div
                              className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl p-3.5 space-y-2 font-sans text-xs"
                              dir={isEn ? "ltr" : "rtl"}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-emerald-400" />
                                  <span>{isEn ? entry.cardDetail.titleEn : entry.cardDetail.titleFa}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-600 text-white text-[10px]">
                                    {isEn ? entry.cardDetail.badgeEn : entry.cardDetail.badgeFa}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-300">
                                    {T("صرفاً تمرینی", "TRAINING ONLY")}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed" dir="auto">
                                {isEn ? entry.cardDetail.descriptionEn : entry.cardDetail.descriptionFa}
                              </p>
                              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5" dir="auto">
                                {isEn ? entry.cardDetail.sampleNoticeEn : entry.cardDetail.sampleNoticeFa}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Session Reference & Status */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <Card className="p-4 sm:p-5 space-y-4 border-border/80 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-sm text-foreground">
                    {T("وضعیت سشن و راهنمای فرامین", "Session Status & Command Reference")}
                  </h3>
                </div>

                {/* Session Status Summary */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("وضعیت سشن:", "Session State:")}</span>
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
                      {T("فعال در حافظه", "Active (In-Memory)")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("آیتم فعال:", "Active Item:")}</span>
                    <span className="font-bold text-foreground">
                      {terminalState.selectedEntryId
                        ? (terminalState.selectedEntryId === "entry_a"
                            ? T("آیتم تمرینی الف", "Training entry A")
                            : T("آیتم تمرینی ب", "Training entry B"))
                        : T("هیچ‌کدام", "None")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{T("فرامین اجراشده:", "Commands Executed:")}</span>
                    <span className="font-mono font-bold text-foreground">
                      {terminalState.executedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{T("ذخیره‌سازی دائم:", "Persistence:")}</span>
                    <span>{T("غیرفعال (صرفاً موقت)", "Disabled (Temporary)")}</span>
                  </div>
                </div>

                {/* Console Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTerminalCommand("CLEAR")}
                    className="flex-1 cursor-pointer text-xs"
                  >
                    <span>{T("پاکسازی لاگ", "Clear Log")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTerminalCommand("RESET")}
                    className="flex-1 cursor-pointer text-xs"
                  >
                    <span>{T("شروع مجدد", "Reset Session")}</span>
                  </Button>
                </div>

                {/* Whitelist Commands Reference Table */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground block">
                    {T("فهرست فرمان‌های مجاز تمرینی:", "Whitelisted Training Commands:")}
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {EDUCATIONAL_TERMINAL_CHIPS.map((chip) => (
                      <div
                        key={chip.command}
                        className="p-2 rounded-lg bg-muted/30 border border-border/50 space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <strong className="text-primary text-[11px]">{chip.command}</strong>
                          <span className="text-[10px] text-muted-foreground">
                            {isEn ? chip.labelEn : chip.labelFa}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed" dir="auto">
                          {isEn ? chip.descriptionEn : chip.descriptionFa}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      );
}
