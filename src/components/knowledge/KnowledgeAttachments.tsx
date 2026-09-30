import { useState } from "react";
import { Paperclip, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KnowledgeDeviceAttachments } from "./KnowledgeDeviceAttachments";
import { KnowledgeDriveAttachments } from "./KnowledgeDriveAttachments";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
export function KnowledgeAttachments({ document, userId, onDocumentUpdated }: { document: KnowledgeDocument; userId: string; onDocumentUpdated?: (document: KnowledgeDocument) => void }) {
  const { T, isEn } = useBilingual(); const [open, setOpen] = useState(false);
  return <section className="mb-4 border-b pb-2">
    <button type="button" className="flex min-h-9 w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Paperclip className="h-4 w-4" />{T("فایل‌ها و رسانه‌های درس", "Lesson files and media")} ({document.attachments?.length ?? 0})<ChevronDown className={`ms-auto h-4 w-4 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <Tabs defaultValue="device" className="mt-2">
      <TabsList className="h-9"><TabsTrigger value="device">{T("فضای ابری برنامه", "App cloud")}</TabsTrigger><TabsTrigger value="drive">Google Drive</TabsTrigger></TabsList>
      <TabsContent value="device"><KnowledgeDeviceAttachments key={`${userId}:${document.id}`} document={document} userId={userId} onDocumentUpdated={onDocumentUpdated} /></TabsContent>
      <TabsContent value="drive"><KnowledgeDriveAttachments key={`${userId}:${document.id}`} document={document} userId={userId} isEn={isEn} onDocumentUpdated={onDocumentUpdated} /></TabsContent>
    </Tabs>}
  </section>;
}
