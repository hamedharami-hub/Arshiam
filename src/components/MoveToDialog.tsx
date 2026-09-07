import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderTree, Inbox } from "lucide-react";
import { toast } from "sonner";

type Folder = { id: string; name: string; color: string | null };

export function MoveToDialog({
  open, onOpenChange, kind, itemId, currentFolderId, onMoved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "task" | "note";
  itemId: string;
  currentFolderId: string | null;
  onMoved?: (newFolderId: string | null) => void;
}) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [pick, setPick] = useState<string | null>(currentFolderId);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPick(currentFolderId); }, [currentFolderId, open]);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from("folders").select("id,name,color").order("position").then(({ data }) => {
      setFolders((data || []) as any);
    });
  }, [user, open]);

  const apply = async () => {
    setBusy(true);
    try {
      const table = kind === "task" ? "tasks" : "notes";
      const { error } = await supabase.from(table as any).update({ folder_id: pick }).eq("id", itemId);
      if (error) throw error;
      toast.success("منتقل شد");
      onMoved?.(pick);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>انتقال به فولدر</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          <button
            onClick={() => setPick(null)}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-end transition ${pick === null ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
          >
            <Inbox className="w-4 h-4" />
            <span className="text-sm">بدون فولدر (Inbox)</span>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setPick(f.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-md text-end transition ${pick === f.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            >
              <FolderTree className="w-4 h-4" style={{ color: f.color || undefined }} />
              <span className="text-sm">{f.name}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={apply} disabled={busy}>{busy ? "..." : "انتقال"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
