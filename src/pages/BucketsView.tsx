import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_BUCKET_KINDS, type BucketKind, getEnabledBuckets,
  currentAnchor, bucketLabel, kindLabel,
} from "@/lib/timeBuckets";
import { getCalendarSystem, setCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import { Clock, CalendarRange, ListTodo, Sun, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";

export default function BucketsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const enabled = getEnabledBuckets().filter((k) => k !== "day"); // day = today/tomorrow handled elsewhere
  const initial = (params.get("kind") as BucketKind) || enabled[0] || "week";
  const [kind, setKind] = useState<BucketKind>(initial);
  const [calendar, setCalendar] = useState<CalendarSystem>(getCalendarSystem());
  const [tasks, setTasks] = useState<any[] | null>(null);

  const anchor = currentAnchor(kind, calendar);

  useEffect(() => {
    setParams((p) => { p.set("kind", kind); return p; }, { replace: true });
  }, [kind]);

  useEffect(() => {
    if (!user) return;
    setTasks(null);
    supabase
      .from("tasks")
      .select("id,title,priority,completed,due_date")
      .eq("user_id", user.id)
      .eq("completed", false)
      .eq("bucket_kind", kind)
      .eq("bucket_calendar", calendar)
      .eq("bucket_anchor", anchor)
      .order("priority", { ascending: true })
      .limit(500)
      .then(({ data }) => setTasks(data || []));
  }, [user, kind, calendar, anchor]);

  const toggleCal = () => {
    haptic("light");
    const next = calendar === "jalali" ? "gregorian" : "jalali";
    setCalendarSystem(next);
    setCalendar(next);
  };

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-4 md:p-8 space-y-4 pb-20">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-primary" />
            دسته‌بندی زمانی
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            بدون زمان دقیق — فقط بازه‌ای که کار باید انجام بشه.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={toggleCal} className="text-xs gap-1">
          <Sun className="w-3.5 h-3.5" />
          {calendar === "jalali" ? "شمسی" : "میلادی"}
        </Button>
      </header>

      <Tabs value={kind} onValueChange={(v) => { haptic("light"); setKind(v as BucketKind); }}>
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
          {ALL_BUCKET_KINDS.filter((k) => k !== "day" && enabled.includes(k)).map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs py-2">
              {kindLabel(k)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {bucketLabel(kind, calendar, anchor)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks === null ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">
              هیچ کاری در این بازه ثبت نکرده‌ای. از داخل تسک‌ها بازه‌ی زمانی را انتخاب کن.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => { haptic("light"); navigate(`/app/tasks/${t.id}`); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-border/60 hover:bg-accent/30 transition text-end"
                  >
                    <ListTodo className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="flex-1 text-sm font-medium break-words line-clamp-2">{t.title}</span>
                    {t.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
