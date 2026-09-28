import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCalendarSystem, setCalendarSystem, formatDate, type CalendarSystem } from "@/lib/jalali";
import { getHolidaysForRange, type Holiday } from "@/lib/holidays";
import { parseTaskDueDate } from "@/lib/taskDate";
import { useBilingual } from "@/hooks/useBilingual";
import MonthGrid from "@/components/calendar/MonthGrid";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import AgendaView from "@/components/calendar/AgendaView";
import DayDetailSheet from "@/components/calendar/DayDetailSheet";
import type { CycleProfile, CycleLog } from "@/lib/cycle";

type ViewMode = "month" | "week" | "day" | "agenda";

export default function CalendarView() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { T, isEn } = useBilingual();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [system, setSystem] = useState<CalendarSystem>(getCalendarSystem());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeCycleProfileId, setActiveCycleProfileId] = useState<string | null>(null);
  const [cycleProfile, setCycleProfile] = useState<CycleProfile | null>(null);
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [cycleOverlayEnabled, setCycleOverlayEnabled] = useState(true);
  const [detailDate, setDetailDate] = useState<Date | null>(null);

  // Load user cycle settings & active profile
  useEffect(() => {
    if (!user) return;
    firebaseStore.from("user_settings").select("active_cycle_profile_id, cycle_overlay_enabled").eq("user_id", user.id).maybeSingle()
      .then(async ({ data: s }) => {
        const enabled = s?.cycle_overlay_enabled !== false;
        setCycleOverlayEnabled(enabled);
        const pid = s?.active_cycle_profile_id;
        setActiveCycleProfileId(pid || null);
        if (pid && enabled) {
          const [{ data: p }, { data: logs }] = await Promise.all([
            firebaseStore.from("cycle_profiles").select("*").eq("id", pid).maybeSingle(),
            firebaseStore.from("cycle_logs").select("*").eq("profile_id", pid).order("log_date", { ascending: false }),
          ]);
          setCycleProfile((p as CycleProfile) || null);
          setCycleLogs((logs as CycleLog[]) || []);
        } else {
          setCycleProfile(null);
          setCycleLogs([]);
        }
      });
  }, [user]);

  const persistSystem = (s: CalendarSystem) => { setCalendarSystem(s); setSystem(s); };

  // Fetch range based on view
  useEffect(() => {
    if (!user) return;
    let start: Date, end: Date;
    if (view === "month") { start = startOfWeek(startOfMonth(date)); end = endOfWeek(endOfMonth(date)); }
    else if (view === "week") { start = startOfWeek(date); end = endOfWeek(date); }
    else if (view === "day") { start = new Date(date); start.setHours(0,0,0,0); end = new Date(date); end.setHours(23,59,59,999); }
    else { start = startOfMonth(date); end = endOfMonth(date); }

    const startTime = start.getTime();
    const endTime = end.getTime();

    firebaseStore.from("tasks").select("*")
      .then(({ data }) => {
        const matching: any[] = [];
        const seenIds = new Set<string>();
        for (const t of (data || []) as any[]) {
          if (!t.id || seenIds.has(t.id)) continue;
          let inRange = false;
          if (t.due_date) {
            const d = parseTaskDueDate(t.due_date);
            if (d && d.getTime() >= startTime && d.getTime() <= endTime) {
              inRange = true;
            }
          }
          if (!inRange && t.start_at) {
            const s = parseTaskDueDate(t.start_at);
            if (s && s.getTime() >= startTime && s.getTime() <= endTime) {
              inRange = true;
            }
          }
          if (inRange) {
            seenIds.add(t.id);
            matching.push(t);
          }
        }
        setTasks(matching);
      });
    getHolidaysForRange(start, end, ["IR", "AU"]).then(setHolidays);
  }, [user, date, view, refreshKey]);

  const headerLabel = (() => {
    if (view === "day") return system === "jalali" ? formatDate(date, "d MMMM yyyy", "jalali") : format(date, "MMMM d, yyyy");
    if (view === "week") {
      const s = startOfWeek(date), e = endOfWeek(date);
      return system === "jalali"
        ? `${formatDate(s, "d MMM", "jalali")} – ${formatDate(e, "d MMM", "jalali")}`
        : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
    }
    return system === "jalali" ? formatDate(date, "MMMM yyyy", "jalali") : format(date, "MMMM yyyy");
  })();

  const altLabel = system === "jalali" ? format(date, "MMMM yyyy") : formatDate(date, "MMMM yyyy", "jalali");

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setDate(dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
    else if (view === "week") setDate(dir < 0 ? subWeeks(date, 1) : addWeeks(date, 1));
    else if (view === "day") setDate(dir < 0 ? subDays(date, 1) : addDays(date, 1));
    else setDate(dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
  };

  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-20 page-enter">
      <div className="flex items-start md:items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{headerLabel}</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{altLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={system} onValueChange={(v) => persistSystem(v as CalendarSystem)}>
            <TabsList className="h-8 bg-muted p-1">
              <TabsTrigger value="jalali" className="text-xs h-6 rounded-md data-[state=active]:bg-background">
                {T("شمسی", "Jalali")}
              </TabsTrigger>
              <TabsTrigger value="gregorian" className="text-xs h-6 rounded-md data-[state=active]:bg-background">
                {T("میلادی", "Gregorian")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(-1)} title={T("قبلی", "Previous")}>
              <PrevIcon className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDate(new Date())}>
              {T("امروز", "Today")}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(1)} title={T("بعدی", "Next")}>
              <NextIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="space-y-4">
        <TabsList className="bg-muted p-1 h-9">
          <TabsTrigger value="month" className="text-xs rounded-md data-[state=active]:bg-background">
            {T("ماهانه", "Month")}
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs rounded-md data-[state=active]:bg-background">
            {T("هفتگی", "Week")}
          </TabsTrigger>
          <TabsTrigger value="day" className="text-xs rounded-md data-[state=active]:bg-background">
            {T("روزانه", "Day")}
          </TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs rounded-md data-[state=active]:bg-background">
            {T("برنامه", "Agenda")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <Card className="p-3 bg-card/60 border-border/60 shadow-sm">
            <MonthGrid month={date} tasks={tasks} holidays={holidays} system={system}
              cycleProfile={cycleProfile} cycleLogs={cycleLogs}
              onDayClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card className="p-3 bg-card/60 border-border/60 shadow-sm">
            <WeekView date={date} tasks={tasks} holidays={holidays} system={system}
              onDayClick={(d) => { setDate(d); setView("day"); }}
              onSlotClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="day">
          <Card className="p-4 bg-card/60 border-border/60 shadow-sm">
            <DayView date={date} tasks={tasks} system={system}
              onSlotClick={() => setDetailDate(date)}
              onTaskClick={(id) => nav(`/app/tasks/${id}`)} />
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <Card className="p-4 bg-card/60 border-border/60 shadow-sm">
            <AgendaView start={startOfMonth(date)} end={endOfMonth(date)} tasks={tasks}
              holidays={holidays} system={system} />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/30" /> {T("تعطیل", "Holiday")}</span>
        <span>🇮🇷 {T("ایران", "Iran")}</span>
        <span>🇦🇺 {T("استرالیا", "Australia")}</span>
      </div>

      <DayDetailSheet
        date={detailDate}
        open={!!detailDate}
        onOpenChange={(v) => !v && setDetailDate(null)}
        tasks={tasks}
        holidays={holidays}
        system={system}
        onTaskCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
