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
    navigate(`/app/knowledge`);
  };

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans"
    >
      {/* Top Header & Tab Navigation */}
      <div className="p-3 md:px-6 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white">
              {isEn ? "Review & Mastery (SR)" : "مرور، یادگیری و نقشه ذهنی"}
            </h1>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? "Spaced repetition flashcards & visual concept mind map"
                : "جعبه لایتنر هوشمند و نقشه مفهومی پیوند اسناد آموزشی"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("leitner")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === "leitner"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200"
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
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>{isEn ? "Mind Map" : "نقشه مفهومی"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "leitner" ? (
          <LeitnerDeckView userId={userId} onOpenDocument={handleOpenDoc} />
        ) : (
          <KnowledgeMindMapView userId={userId} onOpenDocument={handleOpenDoc} />
        )}
      </div>
    </div>
  );
};

export default ReviewView;
