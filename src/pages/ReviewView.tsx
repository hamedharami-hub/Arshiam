import React, { useState } from "react";
import { Layers, Network, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { LeitnerDeckView } from "@/components/review/LeitnerDeckView";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import { useNavigate } from "react-router-dom";

export const ReviewView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"leitner" | "mindmap">("leitner");

  const userId = user?.id || "anonymous-review-user";

  const handleOpenDoc = (docId: string) => {
    navigate(`/app/knowledge?docId=${docId}`);
  };

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden font-sans"
    >
      {/* Top Header & Tab Navigation */}
      <div className="p-3 md:px-6 border-b border-border bg-card/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-foreground">
              {isEn ? "Review & Concept Mind Map" : "مرور، یادگیری و نقشه ذهنی"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Spaced repetition flashcards & visual concept knowledge graph"
                : "جعبه لایتنر هوشمند و نقشه مفهومی پیوند اسناد آموزشی"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("leitner")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === "leitner"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isEn ? "Leitner Box" : "جعبه لایتنر"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mindmap")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === "mindmap"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>{isEn ? "Mind Map" : "نقشه مفهومی"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content with Zero-Latency State Preservation */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
        <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "leitner" ? "" : "hidden"}`}>
          <LeitnerDeckView userId={userId} onOpenDocument={handleOpenDoc} />
        </div>
        <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "mindmap" ? "" : "hidden"}`}>
          <KnowledgeMindMapView userId={userId} onOpenDocument={handleOpenDoc} />
        </div>
      </div>
    </div>
  );
};

export default ReviewView;
