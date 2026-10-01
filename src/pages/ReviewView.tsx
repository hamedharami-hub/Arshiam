import { learningSourceUrl } from "@/lib/learningWorkspace";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import React, { useCallback, useEffect, useState } from "react";
import { Layers, Languages, Network } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { LeitnerDeckView } from "@/components/review/LeitnerDeckView";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import type { KnowledgeMindMapReviewScope } from "@/lib/knowledgeMindMapReview";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReviewInsights } from "@/components/review/ReviewInsights";

import { REVIEW_DOMAINS, resolveReviewScope } from "@/lib/reviewDomains";

export const REVIEW_FOLDERS = REVIEW_DOMAINS;
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
  const { folder: legacyFolder } = useParams<{ folder: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { domain: reviewFolder, scopeRootFolderId, topic } = resolveReviewScope(searchParams.get("domain") ?? legacyFolder, searchParams.get("topic"));
  const urlFolderId = searchParams.get("folderId");
  const urlDocId = searchParams.get("docId");
  const studyDocId = searchParams.get("studyDocId");
  const studyFolderId = searchParams.get("studyFolderId");
  const studyTaskId = searchParams.get("studyTaskId");
  const urlTab = searchParams.get("tab");
  const domainHref = (domain: string) => {
    const next = new URLSearchParams(searchParams);
    for (const key of ["folderId", "docId", "studyFolderId", "studyDocId", "studyTaskId", "topic"]) next.delete(key);
    if (domain === "all") next.delete("domain"); else next.set("domain", domain);
    return `/app/review${next.toString() ? `?${next.toString()}` : ""}`;
  };

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

  const handleOpenDoc = (docId: string, sourceCardId?: string, sourceQuestionId?: string, sourceLanguage?: 'fa' | 'en') => {
    navigate(learningSourceUrl(docId, sourceCardId, sourceQuestionId, sourceLanguage));
  };

  const handleStartMindMapReview = useCallback((scope: KnowledgeMindMapReviewScope) => {
    const params = new URLSearchParams({ tab: "leitner" });
    if (reviewFolder !== "all") params.set("domain", reviewFolder);
    if (topic) params.set("topic", topic);
    if (scope.kind === "folder") params.set("studyFolderId", scope.id);
    if (scope.kind === "document") params.set("studyDocId", scope.id);
    navigate(`/app/review?${params.toString()}`);
  }, [navigate, reviewFolder]);

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="study-workspace flex flex-col min-h-0 w-full bg-background text-foreground overflow-hidden font-sans"
    >
      {/* Top Header & Tab Navigation */}
      <div className="p-2 md:px-4 border-b border-border bg-background flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <HeaderTitlePortal title={isEn ? "Review & Concept Mind Map" : "مرور، یادگیری و نقشه ذهنی"} />
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Spaced repetition flashcards & visual concept knowledge graph"
                : "جعبه لایتنر هوشمند و نقشه مفهومی پیوند اسناد آموزشی"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center p-1 rounded-lg bg-muted/60 border border-border text-xs">
            <button
              type="button"
              aria-pressed={activeTab === "leitner"}
              onClick={() => selectTab("leitner")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold transition cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activeTab === "mindmap"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="w-4 h-4" />
              <span>{isEn ? "Mind Map" : "نقشه مفهومی"}</span>
            </button>
          </div>

          <div role="group" aria-label={isEn ? "Flashcard content language" : "زبان محتوای کارت‌ها"} className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-xs">
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
                className={`rounded-md px-2.5 py-1.5 font-semibold transition ${cardLanguage === language ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {language === "fa" ? "فارسی" : language === "en" ? "English" : isEn ? "Bilingual" : "دوزبانه"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Content with Zero-Latency State Preservation */}
      <div className="px-3 md:px-6 pt-2 space-y-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" data-testid="review-folder-chips">
          <button
            type="button"
            aria-pressed={reviewFolder === "all"}
            onClick={() => navigate(domainHref("all"))}
            data-testid="review-folder-all"
            className={`shrink-0 h-8 px-3 rounded-full border text-xs font-semibold ${reviewFolder === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
          >
            {isEn ? "All folders" : "همهٔ پوشه‌ها"}
          </button>
          {REVIEW_FOLDERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={reviewFolder === f.id}
              onClick={() => navigate(domainHref(f.id))}
              data-testid={`review-folder-${f.id}`}
              className={`shrink-0 h-8 px-3 rounded-full border text-xs font-semibold ${reviewFolder === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              {isEn ? f.en : f.fa}
            </button>
          ))}
        </div>
        <ReviewInsights key={`${userId}:${reviewFolder}`} userId={userId} isEn={isEn} scopeRootFolderId={scopeRootFolderId} />
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
        {(visitedTabs.leitner || activeTab === "leitner") && (
          <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "leitner" ? "" : "hidden"}`}>
            <LeitnerDeckView
              key={`${userId}:${reviewFolder}:${studyFolderId || ""}:${studyDocId || ""}:${studyTaskId || ""}`}
              userId={userId}
              isActive={activeTab === "leitner"}
              onOpenDocument={handleOpenDoc}
              initialStudyDocumentId={studyDocId || undefined}
              initialStudyFolderId={studyFolderId || undefined}
              initialStudyTaskId={studyTaskId || undefined}
              cardLanguage={cardLanguage}
              scopeRootFolderId={scopeRootFolderId}
            />
          </div>
        )}
        {(visitedTabs.mindmap || activeTab === "mindmap") && (
          <div className={`flex-1 flex flex-col h-full min-h-0 ${activeTab === "mindmap" ? "" : "hidden"}`}>
            <KnowledgeMindMapView
              key={`${userId}:${reviewFolder}`}
              isActive={activeTab === "mindmap"}
              userId={userId}
              onOpenDocument={handleOpenDoc}
              initialFolderId={urlFolderId || undefined}
              initialDocId={urlDocId || undefined}
              cardLanguage={cardLanguage}
              onStartReview={handleStartMindMapReview}
              scopeRootFolderId={scopeRootFolderId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewView;
