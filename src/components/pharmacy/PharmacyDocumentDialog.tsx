import { KnowledgeSectionContent } from "@/components/knowledge/KnowledgeSectionContent";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { getKnowledgeDocument } from "@/lib/knowledgeService";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeHtmlSanitizer";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import { getPharmacySeedDocument } from "@/lib/pharmacyImportService";
import { PHARMACY_DIALOG_CLASS } from "./pharmacyDialogClass";

type LoadedDocument = { document: KnowledgeDocument; origin: "knowledge" | "seed" } | null;

interface PharmacyDocumentDialogProps {
  documentId: string | null;
  onClose: () => void;
}

/** Opens a monograph/disease document over the current practice without losing its state. */
export function PharmacyDocumentDialog({ documentId, onClose }: PharmacyDocumentDialogProps) {
  const { T, lang } = useBilingual();
  const { user } = useAuth();
  const inRouter = useInRouterContext();
  const [stack, setStack] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<LoadedDocument | "loading">("loading");
  const bodyRef = useRef<HTMLDivElement>(null);
  const currentId = stack[stack.length - 1] ?? null;
  const isEn = lang === "en";

  useEffect(() => { setStack(documentId ? [documentId] : []); }, [documentId]);

  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    setLoaded("loading");
    (async () => {
      const own = user?.id ? await getKnowledgeDocument(user.id, currentId).catch(() => null) : null;
      const result: LoadedDocument = own
        ? { document: own, origin: "knowledge" }
        : await getPharmacySeedDocument(currentId).then((doc) => (doc ? { document: doc, origin: "seed" as const } : null)).catch(() => null);
      if (!cancelled) setLoaded(result);
    })();
    return () => { cancelled = true; };
  }, [currentId, user?.id]);

  const loadedDoc = loaded === "loading" ? null : loaded;
  const html = useMemo(() => {
    if (!loadedDoc) return "";
    const { document } = loadedDoc;
    return sanitizeKnowledgeHtml((isEn ? document.content_en || document.content_html : document.content_html) || "");
  }, [isEn, loadedDoc]);

  const handleBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest("[data-doc-link]");
    const target = link?.getAttribute("data-doc-link");
    if (!target) return;
    event.preventDefault();
    setStack((previous) => [...previous, target]);
    bodyRef.current?.scrollTo?.({ top: 0 });
  };

  const title = loadedDoc ? (isEn ? loadedDoc.document.title_en || loadedDoc.document.title : loadedDoc.document.title) : T("سند", "Document");

  return (
    <Dialog open={Boolean(documentId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={PHARMACY_DIALOG_CLASS} dir={isEn ? "ltr" : "rtl"} data-testid="pharmacy-document-dialog">
        <DialogHeader className="space-y-2 text-start">
          <DialogTitle className="pe-6 text-start leading-snug" data-testid="pharmacy-document-title">{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</Badge>
              {loadedDoc && (
                <Badge variant="secondary" data-testid="pharmacy-document-origin">
                  {loadedDoc.origin === "knowledge" ? T("نسخهٔ Knowledge شما", "Your Knowledge copy") : T("snapshot منبع (هنوز import نشده)", "Source snapshot (not imported yet)")}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {stack.length > 1 && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setStack((previous) => previous.slice(0, -1))} data-testid="pharmacy-document-back-btn">
              {isEn ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              {T("سند قبلی", "Previous document")}
            </Button>
          )}
          {currentId && (
            inRouter ? <OpenInKnowledgeButton documentId={currentId} label={T("بازکردن در Knowledge", "Open in Knowledge")} /> : null
          )}
        </div>

        {loaded === "loading" ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{T("در حال بارگذاری…", "Loading…")}</div>
        ) : loadedDoc ? (
          <div
            ref={bodyRef}
            onClick={handleBodyClick}
            dir={isEn ? "ltr" : "rtl"}
            className="min-w-0"
            data-testid="pharmacy-document-body"
          >
            <KnowledgeSectionContent multiCard html={html} dir={isEn ? "ltr" : "rtl"} className="knowledge-content prose prose-sm max-w-none break-words dark:prose-invert" />
          </div>
        ) : (
          <p className="rounded-lg bg-muted/50 p-4 text-sm" data-testid="pharmacy-document-missing">{T("این سند نه در Knowledge شما و نه در snapshot منبع پیدا شد.", "This document was not found in your Knowledge or in the source snapshot.")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OpenInKnowledgeButton({ documentId, label }: { documentId: string; label: string }) {
  const navigate = useNavigate();
  return (
    <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => navigate(`/app/knowledge?docId=${encodeURIComponent(documentId)}`)} data-testid="pharmacy-document-open-knowledge-btn">
      <BookOpen className="h-4 w-4" aria-hidden="true" />{label}
    </Button>
  );
}
