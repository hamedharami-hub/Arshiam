// Progressive Profiling — micro-prompt that surfaces 1 question at idle moments.
// Triggers: after a Pomodoro session ends, on Check-in save, or when user lingers on Today >2min.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MINI_IPIP } from "@/lib/miniIpip";
import { Sparkles } from "lucide-react";

const SCALE_LABELS = ["مخالفم", "تا حدی مخالفم", "بی‌نظر", "تا حدی موافقم", "موافقم"];
const COOLDOWN_KEY = "pp_last_shown_at";
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

export default function ProfileMicroPrompt({ trigger }: { trigger?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<{ id: string; question_key: string; question_text: string } | null>(null);

  const fetchNext = useCallback(async () => {
    if (!user) return null;
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return null;

    const { data: queue } = await supabase
      .from("profile_questions_queue")
      .select("id,question_key,question_text")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (queue && queue.length > 0) return queue[0];

    // Seed Mini-IPIP if user has no queue yet
    const { data: any_existing } = await supabase
      .from("profile_questions_queue")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!any_existing || any_existing.length === 0) {
      const rows = MINI_IPIP.map((it) => ({
        user_id: user.id,
        source: "mini_ipip",
        question_key: it.key,
        question_text: it.text,
        scale_min: 1,
        scale_max: 5,
        reverse_scored: it.reverse,
        trait: it.trait,
        status: "pending",
      }));
      await supabase.from("profile_questions_queue").insert(rows);
      const { data: first } = await supabase
        .from("profile_questions_queue")
        .select("id,question_key,question_text")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1);
      return first?.[0] || null;
    }
    return null;
  }, [user]);

  useEffect(() => {
    if (!user || !trigger) return;
    const t = setTimeout(async () => {
      const q = await fetchNext();
      if (q) {
        setItem(q);
        setOpen(true);
        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [user, trigger, fetchNext]);

  async function answer(value: number) {
    if (!item || !user) return;
    await supabase.from("profile_questions_queue")
      .update({ status: "answered", answer: value, answered_at: new Date().toISOString(), trigger_context: trigger || null })
      .eq("id", item.id);
    setOpen(false);
    setItem(null);
  }

  async function skip() {
    if (!item) return;
    await supabase.from("profile_questions_queue")
      .update({ status: "skipped", asked_at: new Date().toISOString() })
      .eq("id", item.id);
    setOpen(false);
    setItem(null);
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" /> یک سوال کوتاه
          </DialogTitle>
          <DialogDescription className="text-xs">
            برای شناخت بهتر تو — کمتر از ۱۰ ثانیه. (می‌توانی رد کنی)
          </DialogDescription>
        </DialogHeader>
        <p className="py-3 text-base">{item.question_text}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((v) => (
            <Button key={v} variant="outline" size="sm" className="flex flex-col h-auto py-2" onClick={() => answer(v)}>
              <span className="font-bold">{v}</span>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{SCALE_LABELS[v - 1]}</span>
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={skip}>الان نه</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
