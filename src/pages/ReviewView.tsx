import React, { useCallback, useEffect, useState } from "react";
import { Layers, Languages, Network, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { LeitnerDeckView } from "@/components/review/LeitnerDeckView";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import type { KnowledgeMindMapReviewScope } from "@/lib/knowledgeMindMapReview";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReviewInsights } from "@/components/review/ReviewInsights";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";

export const REVIEW_FOLDERS = [{ id: "pharmacy", fa: "فارماسی", en: "Pharmacy" }] as const;
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
  const { folder: reviewFolder = "all" } = useParams<{ folder: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFolderId = searchParams.get("folderId");
  const urlDocId = searchParams.get("docId");
  const studyDocId = searchParams.get("studyDocId");
  const studyFolderId = searchParams.get("studyFolderId");
  const studyTaskId = searchParams.get("studyTaskId");
  const urlTab = searchParams.get("tab");
  const scopeRootFolderId = reviewFolder === "pharmacy" ? PHARMACY_ROOT_FOLDER_ID : undefined;
  const preservedSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";

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

  const handleStartMindMapReview = useCallback((scope: KnowledgeMindMapReviewScope) => {
    const params = new URLSearchParams({ tab: "leitner" });
    if (scope.kind === "folder") params.set("studyFolderId", scope.id);
    if (scope.kind === "document") params.set("studyDocId", scope.id);
    navigate(`/app/review/${reviewFolder}?${params.toString()}`);
  }, [navigate, reviewFolder]);

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
      <div className="px-3 md:px-6 pt-2 space-y-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" data-testid="review-folder-chips">
          <button
            type="button"
            aria-pressed={reviewFolder === "all"}
            onClick={() => navigate(`/app/review${preservedSearch}`)}
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
              onClick={() => navigate(`/app/review/${f.id}${preservedSearch}`)}
              data-testid={`review-folder-${f.id}`}
              className={`shrink-0 h-8 px-3 rounded-full border text-xs font-semibold ${reviewFolder === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              {isEn ? f.en : f.fa}
            </button>
          ))}
          <a
            href={import.meta.env.VITE_EDUCATION_URL || "https://arshnaz-learning.vercel.app"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="review-education-link"
            className="shrink-0 h-8 px-3 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold inline-flex items-center gap-1.5 transition ml-auto"
            title={isEn ? "Open Arshnaz Learning Academy (432 lessons synced with Leitner)" : "ورود به آکادمی ارشناز (۴۳۲ درس همگام با لایتنر)"}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isEn ? "Learning Academy" : "آکادمی ارشناز"}</span>
          </a>
        </div>
        <ReviewInsights userId={userId} isEn={isEn} scopeRootFolderId={scopeRootFolderId} />
      </div>
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
              scopeRootFolderId={scopeRootFolderId}
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
              scopeRootFolderId={scopeRootFolderId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewView;
