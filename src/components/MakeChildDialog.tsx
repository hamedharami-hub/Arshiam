import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CornerUpLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Task } from "@/lib/taskTypes";

export function MakeChildDialog({
  open, onOpenChange, task, allTasks, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task;
  allTasks: Task[];
  onDone: (newParentId: string | null) => void;
}) {
  const [q, setQ] = useState("");

  // Collect descendants of `task` to exclude from candidates (cycle-prevention)
  const forbidden = useMemo(() => {
    const set = new Set<string>([task.id]);
    const queue = [task.id];
    while (queue.length) {
      const id = queue.shift()!;
      allTasks.filter(t => t.parent_id === id).forEach(c => {
        if (!set.has(c.id)) { set.add(c.id); queue.push(c.id); }
      });
    }
    return set;
  }, [task, allTasks]);

  const candidates = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allTasks
      .filter(t => !forbidden.has(t.id))
      .filter(t => !term || t.title.toLowerCase().includes(term))
      .slice(0, 80);
  }, [allTasks, forbidden, q]);

  const apply = async (newParentId: string | null) => {
    const { error } = await supabase.from("tasks").update({ parent_id: newParentId }).eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success(newParentId ? "زیرتسک شد" : "به ریشه منتقل شد");
    onDone(newParentId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">تبدیل «{task.title}» به زیرتسکِ…</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute top-2.5 start-2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی تسک…"
            className="ps-7 h-9"
            dir="auto"
          />
        </div>

        {task.parent_id && (
          <Button variant="outline" size="sm" onClick={() => apply(null)} className="justify-start gap-2">
            <CornerUpLeft className="w-4 h-4" />
            🔝 ریشه — تبدیل به تسکِ سطح بالا
          </Button>
        )}

        <ScrollArea className="h-[320px] rounded-md border">
          <div className="p-1">
            {candidates.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">نتیجه‌ای نیست</div>
            )}
            {candidates.map(c => (
              <button
                key={c.id}
                onClick={() => apply(c.id)}
                className="w-full text-start px-2 py-2 rounded hover:bg-accent text-sm flex items-center justify-between gap-2"
              >
                <span className="truncate">{c.title}</span>
                {c.parent_id && <span className="text-[10px] text-muted-foreground shrink-0">زیرتسک</span>}
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
