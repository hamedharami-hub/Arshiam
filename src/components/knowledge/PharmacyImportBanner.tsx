import React from "react";
import { Sparkles, Loader2, BookOpen } from "lucide-react";

interface PharmacyImportBannerProps {
  isPharmacyImported: boolean;
  isImportingPharmacy: boolean;
  onImportPharmacy?: (force?: boolean) => Promise<void>;
  isEn?: boolean;
}

export const PharmacyImportBanner: React.FC<PharmacyImportBannerProps> = React.memo(
  ({
    isPharmacyImported,
    isImportingPharmacy,
    onImportPharmacy,
    isEn = false,
  }) => {
    if (isPharmacyImported || !onImportPharmacy) {
      return null;
    }

    return (
      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/15 border border-emerald-500/30 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">💊</span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-foreground truncate">
              {isEn ? "Pharmacy Encyclopedia" : "بسته جامع دارویی استرالیا"}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {isEn
                ? "330 lessons, clinical atlas & 35 cards"
                : "۳۳۰ درس، اطلس بالینی و ۳۵ کارت لایتنر"}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={isImportingPharmacy}
          onClick={() => onImportPharmacy(false)}
          className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold shrink-0 shadow-2xs transition disabled:opacity-60 flex items-center gap-1 cursor-pointer"
        >
          {isImportingPharmacy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span>
            {isImportingPharmacy
              ? isEn
                ? "..."
                : "..."
              : isEn
              ? "Install"
              : "نصب"}
          </span>
        </button>
      </div>
    );
  }
);

PharmacyImportBanner.displayName = "PharmacyImportBanner";
