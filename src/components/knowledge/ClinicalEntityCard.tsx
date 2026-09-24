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
    const isNavigable = Boolean(item.documentId && onSelect);

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

    const content = (
      <>
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

          {isNavigable && (
            <div className="text-muted-foreground group-hover:text-primary shrink-0 transition">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {item.subtitle && (
          <div className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/40 line-clamp-1">
            {item.subtitle}
          </div>
        )}
        {item.sourceRelations?.map((relation) => (
          <div key={relation.id} className="border-t border-border/50 pt-2 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-foreground/80">
                {isEn
                  ? `${relation.direction}: ${relationLabelEn(relation.type)}`
                  : `${relation.direction === "outgoing" ? "از این مورد" : "به این مورد"} · ${relationLabelFa(relation.type)}`}
              </span>
              <span
                title={isEn
                  ? "This confidence label comes from the source registry; it is not independent clinical validation."
                  : "این برچسب از رجیستری منبع آمده و به‌معنای اعتبارسنجی بالینی مستقل نیست."}
                className={`rounded-md px-1.5 py-0.5 font-semibold ${relation.confidence === "suggested"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-sky-500/10 text-sky-700 dark:text-sky-300"}`}
              >
                {relation.confidence === "suggested"
                  ? (isEn ? "Suggested · review" : "پیشنهادی · نیازمند بازبینی")
                  : (isEn ? "Source-marked verified" : "در منبع: تأییدشده")}
              </span>
            </div>
            <p className="text-[9px] leading-relaxed text-muted-foreground">
              {isEn ? "Source:" : "منشأ رابطه:"} {relation.source}
              {relation.reason ? ` · ${relation.reason}` : ""}
            </p>
          </div>
        ))}
        {!item.documentId && (
          <p className="border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
            {isEn ? "No separate ARSHNAZ document is mapped for this node." : "برای این گره سند مستقلی در ARSHNAZ نگاشت نشده است."}
          </p>
        )}
      </>
    );

    const className = `flex flex-col justify-between p-3.5 rounded-2xl bg-card border border-border/80 transition text-start group shadow-2xs space-y-2.5 ${isNavigable
      ? "hover:bg-secondary/70 hover:border-primary/50 cursor-pointer"
      : "opacity-90 cursor-default"}`;

    return isNavigable ? (
      <button type="button" onClick={() => onSelect?.(item.documentId!)} className={className}>
        {content}
      </button>
    ) : (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }
);

function relationLabelFa(type: string): string {
  const labels: Record<string, string> = {
    "has-product": "فرآوردهٔ مرتبط",
    "used-for": "کاربرد احتمالی",
    triages: "ارتباط با تریاژ",
    "conversation-about": "موضوع مکالمه",
    explains: "ارتباط توضیحی / مکانیسم",
    "interacts-with": "تداخل احتمالی",
    "involves-medicine": "مادهٔ مؤثرهٔ درگیر",
    "has-medicine": "مادهٔ مؤثره",
  };
  return labels[type] || type;
}

function relationLabelEn(type: string): string {
  const labels: Record<string, string> = {
    "has-product": "Related shelf product",
    "used-for": "Potential use",
    triages: "Triage relation",
    "conversation-about": "Conversation topic",
    explains: "Explanatory / mechanism link",
    "interacts-with": "Potential interaction",
    "involves-medicine": "Involved ingredient",
    "has-medicine": "Active ingredient",
  };
  return labels[type] || type;
}

ClinicalEntityCard.displayName = "ClinicalEntityCard";
