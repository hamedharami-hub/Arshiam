import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  CONTACT_SHAPES,
  CONTACT_COLORS,
  CONTACT_SYMBOLS,
  POPULAR_EMOJIS,
} from "@/lib/contactSymbols";
import type { ContactAvatarShape } from "@/lib/contactTypes";
import { ContactAvatar } from "./ContactAvatar";
import { Sparkles, Palette, Shapes, Check, X, Smile } from "lucide-react";

interface Props {
  avatarIcon?: string;
  avatarColor?: string;
  avatarShape?: ContactAvatarShape;
  photoUrl?: string;
  displayName?: string;
  onChangeIcon: (icon?: string) => void;
  onChangeColor: (color?: string) => void;
  onChangeShape: (shape: ContactAvatarShape) => void;
}

export function ContactSymbolPicker({
  avatarIcon,
  avatarColor,
  avatarShape = "circle",
  photoUrl,
  displayName,
  onChangeIcon,
  onChangeColor,
  onChangeShape,
}: Props) {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [activeTab, setActiveTab] = useState<"symbol" | "shape" | "color">("symbol");
  const [customEmoji, setCustomEmoji] = useState(
    avatarIcon && !CONTACT_SYMBOLS.some((s) => s.id === avatarIcon) ? avatarIcon : ""
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-3">
      {/* Header & Mini Preview */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2.5">
          <ContactAvatar
            name={displayName || "کاربر"}
            photoUrl={photoUrl}
            avatarIcon={avatarIcon}
            avatarColor={avatarColor}
            avatarShape={avatarShape}
            size="lg"
          />
          <div>
            <span className="text-xs font-bold text-foreground block">
              {T("شکل و نماد مخاطب", "Contact Shape & Symbol")}
            </span>
            <span className="text-[11px] text-muted-foreground block">
              {T(
                "انتخاب نماد اختصاصی، کادر هندسی و رنگ پس‌زمینه",
                "Choose a unique symbol, geometric shape, and color"
              )}
            </span>
          </div>
        </div>

        {/* Clear Icon button if one is set */}
        {avatarIcon && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChangeIcon(undefined);
              setCustomEmoji("");
            }}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="w-3 h-3" />
            <span>{T("حذف نماد", "Remove symbol")}</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/50 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("symbol")}
          className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === "symbol"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{T("نماد و اموجی", "Symbol & Emoji")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shape")}
          className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === "shape"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shapes className="w-3.5 h-3.5 text-blue-500" />
          <span>{T("شکل کادر", "Shape")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === "color"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-emerald-500" />
          <span>{T("رنگ", "Color")}</span>
        </button>
      </div>

      {/* Tab: Symbol */}
      {activeTab === "symbol" && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          {/* Lucide Icons Grid */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {T("نمادهای پرکاربرد", "Common Symbols")}
            </span>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-card/60 border border-border/40">
              {CONTACT_SYMBOLS.map((item) => {
                const Icon = item.icon;
                const isSelected = avatarIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={isEn ? item.labelEn : item.labelFa}
                    onClick={() => {
                      onChangeIcon(isSelected ? undefined : item.id);
                      setCustomEmoji("");
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                        : "bg-card hover:bg-accent border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Emojis */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {T("اموجی‌های سریع", "Quick Emojis")}
            </span>
            <div className="flex flex-wrap gap-1">
              {POPULAR_EMOJIS.map((emoji) => {
                const isSelected = avatarIcon === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChangeIcon(isSelected ? undefined : emoji);
                      setCustomEmoji(isSelected ? "" : emoji);
                    }}
                    className={`w-7 h-7 text-sm rounded-lg flex items-center justify-center border transition ${
                      isSelected
                        ? "border-primary bg-primary/15 scale-110 shadow-xs"
                        : "border-border/40 bg-card hover:bg-accent"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Emoji / Symbol Input */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Smile className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={customEmoji}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomEmoji(val);
                  if (val.trim()) {
                    onChangeIcon(val.trim());
                  } else {
                    onChangeIcon(undefined);
                  }
                }}
                placeholder={T("اموجی یا نماد دلخواه (مثلاً 👨‍⚕️ یا ⚖️)", "Custom emoji or symbol...")}
                className="h-8 ps-8 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Shape */}
      {activeTab === "shape" && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {T("شکل کادر نماد و تصویر مخاطب", "Badge and photo frame shape")}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONTACT_SHAPES.map((shape) => {
              const isSelected = avatarShape === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => onChangeShape(shape.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs transition ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border-2 border-current bg-current/10 shrink-0 ${shape.className}`}
                  />
                  <span className="truncate">{isEn ? shape.labelEn : shape.labelFa}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ms-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Color */}
      {activeTab === "color" && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            {T("رنگ زمینه و حاشیه نماد", "Symbol background & accent color")}
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            {CONTACT_COLORS.map((color) => {
              const isSelected = (avatarColor || "primary") === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onChangeColor(color.id === "primary" ? undefined : color.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition ${
                    isSelected
                      ? "border-primary bg-card ring-1 ring-primary font-bold shadow-xs"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${color.dotClass}`} />
                  <span className="truncate">{isEn ? color.labelEn : color.labelFa}</span>
                  {isSelected && <Check className="w-3 h-3 ms-auto text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
