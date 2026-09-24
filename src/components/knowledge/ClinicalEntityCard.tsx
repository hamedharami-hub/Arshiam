import React from "react";
import {
  Pill,
  Stethoscope,
  MessageSquare,
  Dna,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import type { ConnectedEntity } from "@/lib/pharmacyRelationsHelper";

interface ClinicalEntityCardProps {
  item: ConnectedEntity;
  isEn?: boolean;
  onSelect?: (id: string) => void;
}

export const ClinicalEntityCard: React.FC<ClinicalEntityCardProps> = React.memo(
  ({ item, isEn = false, onSelect }) => {
    const getEntityIcon = (type: ConnectedEntity["type"]) => {
      switch (type) {
        case "product":
          return <Pill className="w-4 h-4 text-emerald-500" />;
        case "disease":
          return <Stethoscope className="w-4 h-4 text-cyan-500" />;
        case "scenario":
          return <MessageSquare className="w-4 h-4 text-rose-500" />;
        case "pharmacology":
          return <Dna className="w-4 h-4 text-purple-500" />;
        case "regulation":
          return <ShieldAlert className="w-4 h-4 text-amber-500" />;
        default:
          return <Pill className="w-4 h-4 text-muted-foreground" />;
      }
    };

    return (
      <button
        type="button"
        onClick={() => onSelect?.(item.id)}
        className="flex flex-col justify-between p-3.5 rounded-2xl bg-card hover:bg-secondary/70 border border-border/80 hover:border-primary/50 transition text-start group cursor-pointer shadow-2xs space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-background border border-border/80 shrink-0 group-hover:scale-105 transition shadow-2xs">
              {getEntityIcon(item.type)}
            </div>
            <div className="min-w-0">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border inline-block mb-1 ${item.colorClass}`}
              >
                {isEn ? item.badgeEn : item.badgeFa}
              </span>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                {isEn && item.titleEn ? item.titleEn : item.title}
              </h4>
              {item.titleEn && !isEn && (
                <p
                  className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-sans"
                  dir="ltr"
                >
                  {item.titleEn}
                </p>
              )}
            </div>
          </div>

          <div className="text-muted-foreground group-hover:text-primary shrink-0 transition">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {item.subtitle && (
          <div className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/40 line-clamp-1">
            {item.subtitle}
          </div>
        )}
      </button>
    );
  }
);

ClinicalEntityCard.displayName = "ClinicalEntityCard";
