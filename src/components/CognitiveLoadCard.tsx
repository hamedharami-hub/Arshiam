import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { computeCognitiveLoad, loadStatus, CATEGORY_LABELS } from "@/lib/cognitiveLoad";
import { Button } from "@/components/ui/button";

export default function CognitiveLoadCard() {
  const { user } = useAuth();
  const [data, setData] = useState<ReturnType<typeof computeCognitiveLoad> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todayDate = new Date().toISOString().slice(0, 10);

      const [tasks, checkin] = await Promise.all([
        supabase.from("tasks").select("id,title,description,priority,folder_id,quadrant,due_date,completed")
          .eq("user_id", user.id).eq("completed", false)
          .or(`due_date.gte.${todayStart.toISOString()},due_date.is.null`)
          .lte("due_date", todayEnd.toISOString()),
        supabase.from("daily_checkins").select("sleep_hours,sleep_quality,stress").eq("user_id", user.id).eq("checkin_date", todayDate).maybeSingle(),
      ]);

      const todayTasks = (tasks.data || []).filter((t) => {
        if (!t.due_date) return true;
        const dt = new Date(t.due_date);
        return dt >= todayStart && dt <= todayEnd;
      });

      setData(computeCognitiveLoad({
        tasks: todayTasks,
        sleepHours: checkin.data?.sleep_hours ?? null,
        sleepQuality: checkin.data?.sleep_quality ?? null,
        stress: checkin.data?.stress ?? null,
      }));
    })();
  }, [user]);

  if (!data) return null;
  const status = loadStatus(data.load);
  const tone = status.tone === "high" ? "destructive" : status.tone === "warn" ? "default" : "secondary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> بار شناختی امروز</span>
          <Badge variant={tone as any}>{status.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{data.load}</span>
          <span className="text-xs text-muted-foreground">/ ۱۵ آستانه</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${
              status.tone === "high" ? "bg-destructive" : status.tone === "warn" ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, (data.load / 19.5) * 100)}%` }}
          />
        </div>

        <Button variant="ghost" size="sm" className="w-full justify-between text-xs" onClick={() => setOpen(!open)}>
          جزئیات محاسبه
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>

        {open && (
          <div className="space-y-2 text-xs border-t pt-3">
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <div>پایه (مجموع وزن): <strong className="text-foreground">{data.breakdown.base}</strong></div>
              <div>×سوئیچ: <strong className="text-foreground">{data.breakdown.switchMult}</strong></div>
              <div>×خواب: <strong className="text-foreground">{data.breakdown.sleepMult.toFixed(2)}</strong></div>
              <div>×استرس: <strong className="text-foreground">{data.breakdown.stressMult}</strong></div>
            </div>
            {data.perTask.length > 0 && (
              <div className="border-t pt-2">
                <div className="font-medium mb-1">تسک‌های امروز:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {data.perTask.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate flex-1">{t.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{CATEGORY_LABELS[t.category]}</Badge>
                      <span className="text-muted-foreground tabular-nums w-8 text-start">{t.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {status.tone !== "ok" && (
              <div className="bg-muted/50 rounded p-2 text-muted-foreground">
                💡 پیشنهاد: {status.tone === "high"
                  ? "حداقل ۲ تسک کم‌اولویت را به فردا منتقل کن یا یک ریکاوری ۲۰ دقیقه‌ای اضافه کن."
                  : "یک شکاف ۱۵ دقیقه‌ای بین تسک‌های عمیق بگذار."}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
