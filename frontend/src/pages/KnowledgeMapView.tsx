import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { KnowledgeMindMapView } from "@/components/review/KnowledgeMindMapView";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { useNavigate, useSearchParams } from "react-router-dom";
import { learningSourceUrl } from "@/lib/learningWorkspace";

/** Knowledge's shared graph survives retirement of the separate review module. */
export default function KnowledgeMapView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  if (!user) return null;
  return <div dir={isEn ? "ltr" : "rtl"} className="study-workspace flex flex-col min-h-0 w-full bg-background text-foreground overflow-hidden font-sans">
    <HeaderTitlePortal title={T("نقشهٔ دانش", "Knowledge mind map")} />
    <KnowledgeMindMapView key={user.id} userId={user.id} cardLanguage={isEn ? "en" : "fa"}
      initialFolderId={params.get("folderId") || undefined} initialDocId={params.get("docId") || undefined}
      onOpenDocument={id => navigate(learningSourceUrl(id))} />
  </div>;
}
