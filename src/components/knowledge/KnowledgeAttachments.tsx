import { useState } from "react";
import { Paperclip, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KnowledgeDeviceAttachments } from "./KnowledgeDeviceAttachments";
import { KnowledgeDriveAttachments } from "./KnowledgeDriveAttachments";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
export function KnowledgeAttachments({ document, userId, onDocumentUpdated }: { document: KnowledgeDocument; userId: string; onDocumentUpdated?: (document: KnowledgeDocument) => void }) {
  const { T, isEn } = useBilingual(); const [open, setOpen] = useState(false);
  return <section className="mb-2">
    <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={T("فایل‌ها و رسانه‌های درس", "Lesson files and media")} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Paperclip className="h-4 w-4" /><span className="learning-tool-label hidden md:inline">{T("فایل‌ها و رسانه‌های درس", "Lesson files and media")} ({document.attachments?.length ?? 0})</span><ChevronDown className={`learning-tool-extra hidden md:block h-4 w-4 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <Tabs defaultValue="device" className="mt-2">
      <TabsList className="h-9"><TabsTrigger value="device">{T("فضای ابری برنامه", "App cloud")}</TabsTrigger><TabsTrigger value="drive">Google Drive</TabsTrigger></TabsList>
      <TabsContent value="device"><KnowledgeDeviceAttachments key={`${userId}:${document.id}`} document={document} userId={userId} onDocumentUpdated={onDocumentUpdated} /></TabsContent>
      <TabsContent value="drive"><KnowledgeDriveAttachments key={`${userId}:${document.id}`} document={document} userId={userId} isEn={isEn} onDocumentUpdated={onDocumentUpdated} /></TabsContent>
    </Tabs>}
  </section>;
}
