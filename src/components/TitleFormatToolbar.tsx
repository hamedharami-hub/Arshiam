import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bold, Palette, Highlighter, Eraser, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  TITLE_COLORS,
  hasTitleFormatting,
  stripTitleFormatting,
  applyFormatting,
  type FormatType,
} from "@/lib/titleFormatting";
import { BidiText } from "@/components/BidiText";

interface TitleFormatToolbarProps {
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  onCommit?: (newValue: string) => void;
  className?: string;
  placeholder?: string;
}

export function TitleFormatToolbar({
  inputRef,
  value,
  onChange,
  onCommit,
  className = "",
}: TitleFormatToolbarProps) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [colorOpen, setColorOpen] = useState(false);
  const isFormatted = hasTitleFormatting(value);

  const handleFormat = (type: FormatType, colorId?: string) => {
    const input = inputRef.current;
    if (!input) return;

    const result = applyFormatting(input, type, colorId);
    if (!result) return;

    onChange(result.newText);
    onCommit?.(result.newText);

    // Re-focus and set selection on the formatted region
    requestAnimationFrame(() => {
      input.focus();
      try {
        input.setSelectionRange(result.newCursorStart, result.newCursorEnd);
      } catch {}
    });
  };

  const handleClear = () => {
    const cleaned = stripTitleFormatting(value);
    onChange(cleaned);
    onCommit?.(cleaned);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-1.5 px-1 py-0.5 text-xs select-none ${className}`}>
      <div className="flex items-center gap-1">
        {/* Bold Button */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleFormat("bold")}
          className="h-7 px-2 gap-1 rounded-lg text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground"
          title={T("بولد / پررنگ کردن کلمه انتخاب‌شده (**کلمه**)", "Bold selected word (**word**)")}
        >
          <Bold className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-extrabold">{T("بولد", "Bold")}</span>
        </Button>

        {/* Color Palette Popover */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              title={T("رنگی کردن کلمه یا عبارت ([رنگ]{متن})", "Colorize selected word ([color]{text})")}
            >
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{T("رنگ کلمه", "Word Color")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-64 p-2.5 rounded-2xl shadow-xl border border-border/70 backdrop-blur-xl bg-popover/95"
          >
            <div className="text-[11px] font-semibold text-muted-foreground mb-2 px-1">
              {T("انتخاب رنگ برای کلمه یا عبارت:", "Choose color for word or phrase:")}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TITLE_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    handleFormat("color", col.id);
                    setColorOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-muted/80 active:scale-95 transition-all text-center border border-border/40 hover:border-border"
                >
                  <span
                    className="w-4 h-4 rounded-full shadow-xs border border-white/20"
                    style={{ backgroundColor: col.bgHex }}
                  />
                  <span className="text-[10px] font-medium leading-tight truncate w-full">
                    {isEn ? col.nameEn : col.name}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight Button */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleFormat("highlight")}
          className="h-7 px-2 gap-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          title={T("هایلایت کردن عبارت (==متن==)", "Highlight phrase (==text==)")}
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">{T("هایلایت", "Highlight")}</span>
        </Button>

        {/* Clear formatting if any */}
        {isFormatted && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 px-1.5 rounded-lg text-xs text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10"
            title={T("حذف تمام فرمت‌ها و تگ‌های تایتل", "Strip all title formatting tags")}
          >
            <Eraser className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Live rendered preview when formatted */}
      {isFormatted && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 px-2 py-0.5 rounded-lg max-w-[280px] sm:max-w-xs truncate border border-border/40">
          <Eye className="w-3 h-3 text-primary shrink-0 opacity-70" />
          <span className="text-[10px] opacity-70 shrink-0">{T("پیش‌نمایش:", "Preview:")}</span>
          <BidiText text={value} className="truncate text-xs" />
        </div>
      )}
    </div>
  );
}
