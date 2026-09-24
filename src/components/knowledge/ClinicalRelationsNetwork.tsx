import React, { useState, useMemo } from "react";
import {
  Pill,
  Stethoscope,
  MessageSquare,
  Dna,
  ShieldAlert,
  ArrowUpRight,
  Network,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import {
  getConnectedClinicalEntities,
  type ConnectedEntity,
} from "@/lib/pharmacyRelationsHelper";

interface ClinicalRelationsNetworkProps {
  document: KnowledgeDocument | null;
  allDocuments: KnowledgeDocument[];
  onSelectDocument?: (docId: string) => void;
  isEn?: boolean;
}

type TabKey = "all" | "products" | "diseases" | "scenarios" | "pharmacology" | "regulations";

export const ClinicalRelationsNetwork: React.FC<ClinicalRelationsNetworkProps> = ({
  document,
  allDocuments,
  onSelectDocument,
  isEn = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const relations = useMemo(() => {
    return getConnectedClinicalEntities(document, allDocuments);
  }, [document, allDocuments]);

  // If no connections found, do not render
  if (relations.totalCount === 0) {
    return null;
  }

  const { products, diseases, scenarios, pharmacology, regulations, totalCount } = relations;

  // Determine active list based on selected tab
  const activeItems: ConnectedEntity[] = useMemo(() => {
    switch (activeTab) {
      case "products":
        return products;
      case "diseases":
        return diseases;
      case "scenarios":
        return scenarios;
      case "pharmacology":
        return pharmacology;
      case "regulations":
        return regulations;
      case "all":
      default:
        return [
          ...products,
          ...diseases,
          ...scenarios,
          ...pharmacology,
          ...regulations,
        ];
    }
  }, [activeTab, products, diseases, scenarios, pharmacology, regulations]);

  const tabs: Array<{ key: TabKey; labelFa: string; labelEn: string; count: number; icon: React.ReactNode }> = [
    {
      key: "all",
      labelFa: "همه موارد",
      labelEn: "All Links",
      count: totalCount,
      icon: <Network className="w-3.5 h-3.5" />,
    },
    ...(products.length > 0
      ? [
          {
            key: "products" as TabKey,
            labelFa: "داروها و فرآورده‌ها",
            labelEn: "Medicines & Shelf",
            count: products.length,
            icon: <Pill className="w-3.5 h-3.5 text-emerald-500" />,
          },
        ]
      : []),
    ...(diseases.length > 0
      ? [
          {
            key: "diseases" as TabKey,
            labelFa: "بیماری‌ها و اندیکاسیون‌ها",
            labelEn: "Diseases & Guides",
            count: diseases.length,
            icon: <Stethoscope className="w-3.5 h-3.5 text-cyan-500" />,
          },
        ]
      : []),
    ...(scenarios.length > 0
      ? [
          {
            key: "scenarios" as TabKey,
            labelFa: "سناریوهای تریاژ و بالینی",
            labelEn: "Triage & Dialogue",
            count: scenarios.length,
            icon: <MessageSquare className="w-3.5 h-3.5 text-rose-500" />,
          },
        ]
      : []),
    ...(pharmacology.length > 0
      ? [
          {
            key: "pharmacology" as TabKey,
            labelFa: "فارماکولوژی و CYP",
            labelEn: "Pharmacology & CYP",
            count: pharmacology.length,
            icon: <Dna className="w-3.5 h-3.5 text-purple-500" />,
          },
        ]
      : []),
    ...(regulations.length > 0
      ? [
          {
            key: "regulations" as TabKey,
            labelFa: "برچسب‌ها و قوانین نگهداری",
            labelEn: "CAL & Storage Laws",
            count: regulations.length,
            icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />,
          },
        ]
      : []),
  ];

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
        return <Network className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-border/80 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {isEn ? "Interconnected Clinical & Drug Network" : "شبکه اتصالات بالینی و دارویی"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Click any item to jump instantly across medicines, diseases, and triage cases"
                : "با کلیک روی هر مورد مستقیماً به فرآورده، بیماری یا سناریوی تریاژ مرتبط منتقل شوید"}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
          {totalCount} {isEn ? "connected nodes" : "مورد پیوسته"}
        </span>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/70"
              }`}
            >
              {tab.icon}
              <span>{isEn ? tab.labelEn : tab.labelFa}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground/80"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Connected Entities Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {activeItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectDocument?.(item.id)}
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
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-sans" dir="ltr">
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
        ))}
      </div>
    </div>
  );
};
