import React, { useEffect, useState } from "react";
import { Layers, Languages, Network } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { LeitnerDeckView } from "@/components/review/LeitnerDeckView";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import type { KnowledgeMindMapReviewScope } from "@/lib/knowledgeMindMapReview";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  loadStudyContentLanguage,
  saveStudyContentLanguage,
  type StudyContentLanguage,
} from "@/lib/leitnerCardLanguage";

export const ReviewView: React.FC = () => {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const [cardLanguage, setCardLanguage] = useState<StudyContentLanguage>(
    () => loadStudyContentLanguage(isEn ? "en" : "fa"),
  );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFolderId = searchParams.get("folderId");
  const urlDocId = searchParams.get("docId");
  const studyDocId = searchParams.get("studyDocId");
  const studyFolderId = searchParams.get("studyFolderId");
  const studyTaskId = searchParams.get("studyTaskId");
  const urlTab = searchParams.get("tab");

  const activeTab: "leitner" | "mindmap" = urlTab === "mindmap"
    ? "mindmap"
    : urlTab === "leitner"
      ? "leitner"
      : urlFolderId || urlDocId
        ? "mindmap"
        : "leitner";

  const [visitedTabs, setVisitedTabs] = useState<Record<"leitner" | "mindmap", boolean>>(() => ({
    leitner: activeTab === "leitner",
    mindmap: activeTab === "mindmap",
  }));

  useEffect(() => {
    setVisitedTabs((previous) => previous[activeTab] ? previous : { ...previous, [activeTab]: true });
  }, [activeTab]);

  const selectTab = (tab: "leitner" | "mindmap") => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams, { replace: true });
  };

  const userId = user?.id || "anonymous-review-user";

  const handleOpenDoc = (docId: string) => {
    navigate(`/app/knowledge?docId=${docId}`);
  };

  const handleStartMindMapReview = (scope: KnowledgeMindMapReviewScope) => {
    const params = new URLSearchParams({ tab: "leitner" });
    if (scope.kind === "folder") params.set("studyFolderId", scope.id);
    if (scope.kind === "document") params.set("studyDocId", scope.id);
    navigate(`/app/review?${params.toString()}`);
  };

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="flex flex-col h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] min-h-[28rem] w-full bg-background text-foreground overflow-hidden font-sans"
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border text-xs">
            <button
              type="button"
              aria-pressed={activeTab === "leitner"}
              onClick={() => selectTab("leitner")}
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
              aria-pressed={activeTab === "mindmap"}
              onClick={() => selectTab("mindmap")}
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

          <div role="group" aria-label={isEn ? "Flashcard content language" : "زبان محتوای کارت‌ها"} className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1 text-xs">
            <Languages aria-hidden="true" className="mx-1 h-4 w-4 text-muted-foreground" />
            {(["fa", "en", "bilingual"] as const).map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={cardLanguage === language}
                onClick={() => {
                  setCardLanguage(language);
                  saveStudyContentLanguage(language);
                }}
                className={`rounded-xl px-2.5 py-1.5 font-semibold transition ${cardLanguage === language ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {language === "fa" ? "فارسی" : language === "en" ? "English" : isEn ? "Bilingual" : "دوزبانه"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Content with Zero-Latency State Preservation */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
        {(visitedTabs.leitner || activeTab === "leitner") && (
          <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "leitner" ? "" : "hidden"}`}>
            <LeitnerDeckView
              userId={userId}
              onOpenDocument={handleOpenDoc}
              initialStudyDocumentId={studyDocId || undefined}
              initialStudyFolderId={studyFolderId || undefined}
              initialStudyTaskId={studyTaskId || undefined}
              cardLanguage={cardLanguage}
            />
          </div>
        )}
        {(visitedTabs.mindmap || activeTab === "mindmap") && (
          <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "mindmap" ? "" : "hidden"}`}>
            <KnowledgeMindMapView
              userId={userId}
              onOpenDocument={handleOpenDoc}
              initialFolderId={urlFolderId || undefined}
              initialDocId={urlDocId || undefined}
              cardLanguage={cardLanguage}
              onStartReview={handleStartMindMapReview}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewView;
