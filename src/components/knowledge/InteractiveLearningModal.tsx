import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  RotateCw,
  HelpCircle,
  Shuffle,
  Stethoscope,
  Eye,
  GitFork,
  Gamepad2,
  Check,
  Plus,
  ArrowRight,
  Layers,
  Loader2,
  Wand2,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import {
  INTERACTIVE_PRESETS,
  type InteractiveWidgetType,
  generateInteractiveContent,
  attachInteractiveListeners,
} from "@/lib/interactiveLearningHelper";
import { toast } from "sonner";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";

interface InteractiveLearningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  documentTitle: string;
  documentContent: string;
  documentTitleEn?: string;
  documentContentEn?: string;
  onInsertContent: (html: string, mode: "append" | "replace") => void | Promise<void>;
  presentationMode?: "editor" | "standalone";
  languageOverride?: "fa" | "en" | "bilingual";
  onWorkflowStepChange?: (step: 2 | 3) => void;
}

export const InteractiveLearningModal: React.FC<InteractiveLearningModalProps> = ({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  documentContent,
  documentTitleEn,
  documentContentEn,
  onInsertContent,
  presentationMode = "editor",
  languageOverride,
  onWorkflowStepChange,
}) => {
  const { isEn: appIsEn } = useBilingual();
  const effectiveLanguage: "fa" | "en" | "bilingual" =
    languageOverride ?? (appIsEn ? "en" : "fa");
  const isEn = effectiveLanguage === "en";
  const isBilingual = effectiveLanguage === "bilingual";
  const [isApplying, setIsApplying] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<InteractiveWidgetType[]>([
    "flip_card",
    "quiz_mcq",
  ]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"presets" | "preview">("presets");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const generationSequenceRef = useRef(0);

  // A preview belongs to one source lesson and language. Never carry generated
  // content across a source change, and ignore a late AI response for old input.
  useEffect(() => {
    generationSequenceRef.current += 1;
    setSelectedPresets(["flip_card", "quiz_mcq"]);
    setCustomPrompt("");
    setActiveTab("presets");
    setGeneratedHtml("");
    setIsGenerating(false);
  }, [documentContent, documentContentEn, documentId, documentTitle, documentTitleEn, effectiveLanguage]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("presets");
    onWorkflowStepChange?.(2);
  }, [onWorkflowStepChange, open]);

  const showFormats = () => {
    setActiveTab("presets");
    onWorkflowStepChange?.(2);
  };

  const showPreview = () => {
    setActiveTab("preview");
    onWorkflowStepChange?.(3);
  };

  // Toggle a preset chip
  const togglePreset = (id: InteractiveWidgetType) => {
    setSelectedPresets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Render Lucide icon dynamically
  const renderIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "RotateCw":
        return <RotateCw className={className} />;
      case "HelpCircle":
        return <HelpCircle className={className} />;
      case "Shuffle":
        return <Shuffle className={className} />;
      case "Stethoscope":
        return <Stethoscope className={className} />;
      case "Eye":
        return <Eye className={className} />;
      case "GitFork":
        return <GitFork className={className} />;
      case "Gamepad2":
        return <Gamepad2 className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  // Generate interactive widgets
  const handleGenerate = async () => {
    if (selectedPresets.length === 0 && !customPrompt.trim()) {
      toast.error(
        isEn
          ? "Please select at least one preset or write custom instructions."
          : isBilingual
            ? "Please select at least one preset or write custom instructions. / لطفاً حداقل یک الگوی تعاملی انتخاب کنید."
            : "لطفاً حداقل یک الگوی تعاملی انتخاب کنید یا توضیحات سفارشی خود را بنویسید."
      );
      return;
    }

    const generationSequence = ++generationSequenceRef.current;
    setIsGenerating(true);
    try {
      const html = await generateInteractiveContent({
        title: documentTitle || (isEn ? "Interactive Lesson" : "درس تعاملی"),
        content: documentContent || "",
        titleEn: documentTitleEn,
        contentEn: documentContentEn,
        selectedPresets,
        customPrompt,
        language: effectiveLanguage,
      });

      if (generationSequence !== generationSequenceRef.current) return;
      setGeneratedHtml(html);
      showPreview();
      toast.success(
        isEn
          ? "Interactive widgets generated!"
          : isBilingual
            ? "Interactive widgets generated! / ماژول‌های تعاملی با موفقیت ساخته شدند!"
            : "ماژول‌های تعاملی با موفقیت ساخته شدند!"
      );
    } catch (err: any) {
      if (generationSequence !== generationSequenceRef.current) return;
      console.error("Error generating interactive widgets:", err);
      toast.error(
        err.message ||
          (isEn
            ? "Generation failed"
            : isBilingual
              ? "Generation failed / خطا در تولید محتوای تعاملی"
              : "خطا در تولید محتوای تعاملی")
      );
    } finally {
      if (generationSequence === generationSequenceRef.current) setIsGenerating(false);
    }
  };

  // Attach interactive click listeners to preview
  useEffect(() => {
    if (activeTab === "preview" && previewContainerRef.current && generatedHtml) {
      const cleanup = attachInteractiveListeners(previewContainerRef.current, undefined, effectiveLanguage);
      return cleanup;
    }
  }, [activeTab, effectiveLanguage, generatedHtml]);

  const handleApply = async (mode: "append" | "replace") => {
    if (!generatedHtml || isApplying) return;
    setIsApplying(true);
    try {
      await onInsertContent(generatedHtml, mode);
      if (presentationMode === "standalone") {
        toast.success(isEn ? "Interactive study session is ready." : "جلسهٔ آموزش تعاملی آماده است.");
      } else {
        toast.success(
          mode === "append"
            ? isEn
              ? "Interactive widgets appended to lesson!"
              : "ماژول‌های تعاملی به انتهای درس اضافه شدند!"
            : isEn
              ? "Lesson content replaced with interactive module!"
              : "محتوای درس با ماژول تعاملی جایگزین شد!"
        );
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error applying interactive content:", err);
      toast.error(
        err?.message ||
          (isEn
            ? "Failed to save interactive content"
            : "خطا در ذخیره محتوای تعاملی")
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isApplying) onOpenChange(val); }}>
      <DialogContent
        dir={isEn ? "ltr" : "rtl"}
        className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-3xl shadow-xl"
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                  {isEn ? "Interactive Learning Studio" : "استودیوی ساخت آموزش تعاملی"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {isEn
                    ? "Generate 3D cards, quizzes, clinical scenarios, or interactive games with AI"
                    : "تبدیل درس به فلش‌کارت‌های وارونه، کوییز تشخیصی، سناریوی بالینی یا بازی‌های حافظه"}
                </DialogDescription>
              </div>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border text-xs self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={showFormats}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
                  activeTab === "presets"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Presets & Prompt" : "الگوها و تنظیمات"}
              </button>
              <button
                type="button"
                disabled={!generatedHtml}
                onClick={showPreview}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === "preview"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isEn ? "Live Preview" : "پیش‌نمایش زنده"}</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[260px] sm:min-h-[380px]">
          {activeTab === "presets" ? (
            <div className="space-y-6">
              {/* Presets Chips Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Select Interactive Formats:" : "انتخاب فرمت‌های تعاملی (کلیک کنید):"}</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {selectedPresets.length} {isEn ? "selected" : "مورد انتخاب شده"}
                  </span>
                </div>

                <p className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                  {isEn
                    ? "Recommended starting point: flashcards support active recall and quizzes check understanding. These are optional defaults—choose any combination that fits this lesson."
                    : "پیشنهاد برای شروع: فلش‌کارت به یادآوری فعال کمک می‌کند و آزمون میزان فهم را می‌سنجد. این‌ها فقط پیش‌فرض پیشنهادی‌اند؛ هر ترکیبی را متناسب با درس انتخاب کن."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {INTERACTIVE_PRESETS.map((preset) => {
                    const isSelected = selectedPresets.includes(preset.id);
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        aria-pressed={isSelected}
                        onClick={() => togglePreset(preset.id)}
                        className={`group w-full p-3 rounded-2xl border text-start transition-all cursor-pointer select-none flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                            : "bg-muted/30 border-border hover:bg-muted/60 hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-1.5 rounded-xl transition ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              {renderIcon(preset.icon)}
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {isEn ? preset.titleEn : preset.titleFa}
                            </span>
                          </div>

                          <div
                            aria-hidden="true"
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {isEn ? preset.descEn : preset.descFa}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                          <span className="text-primary font-medium">{preset.tag}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Explanation Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {isEn
                      ? "Custom Instructions or Game Scenario (Optional):"
                      : "توضیحات اختصاصی یا سناریوی مدنظر شما (اختیاری):"}
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? "Explain any custom interactive mechanic, e.g.: 'Create a 3-step decision tree for diagnosing drug interactions between SSRIs and MAOIs', or 'Build a memory game for generic vs brand names'..."
                      : "توضیح دهید مایلید چه بازی، چالش یا انیمیشنی ساخته شود؛ مثلاً: «یک درخت تصمیم‌گیری ۳ مرحله‌ای برای پیشگیری از سندرم سروتونین بساز» یا «یک بازی تطبیق برای نام ژنریک و تجاری داروها»..."
                  }
                  className="w-full p-3 rounded-2xl bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground">
                  {isEn
                    ? "💡 You can select chips above, write custom explanation here, or use both together."
                    : "💡 می‌توانید فقط گزینه‌های بالا را انتخاب کنید، یا فقط توضیحات اختصاصی بنویسید، یا هر دو را با هم ترکیب نمایید."}
                </p>
              </div>

              {/* Quick Info Box */}
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border text-xs flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary shrink-0 opacity-80" />
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {isEn
                    ? "The generator analyzes your active lesson text and produces accessible, native interactive widgets with zero unsafe scripts."
                    : "ژنراتور با بررسی متن درس جاری، ماژول‌های تعاملی را مطابق سبک گرافیکی برنامه تولید می‌کند که کاربر مستقیماً روی آن‌ها کلیک کرده و پاسخ‌ها و انیمیشن‌ها را مشاهده می‌نماید."}
                </div>
              </div>
            </div>
          ) : (
            /* Live Interactive Preview Tab */
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEn ? "Interactive Widgets Test Drive (Click items to test)" : "تست زنده ماژول‌های تعاملی (روی المان‌ها کلیک کنید):"}</span>
                </span>
              </div>

              <div
                ref={previewContainerRef}
                className="knowledge-html-content p-4 rounded-2xl bg-background border border-border shadow-xs"
                dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeHtml(generatedHtml) }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === "preview" && (
              <button
                type="button"
                onClick={showFormats}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {isEn ? "Edit Settings" : "ویرایش تنظیمات"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isApplying}
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50"
            >
              {isEn ? "Close" : "بستن"}
            </button>

            {activeTab === "presets" ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                )}
                <span>{isEn ? "Generate Interactive Module" : "تولید ماژول تعاملی با هوش مصنوعی"}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {presentationMode === "standalone" ? (
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleApply("replace")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Gamepad2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isEn ? "Start study session" : "شروع جلسهٔ مطالعه"}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApply("append")}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {isApplying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{isEn ? "Append to Lesson" : "افزودن به انتهای درس"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApply("replace")}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isApplying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isEn ? "Replace Full Lesson" : "جایگزینی کل محتوا"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
