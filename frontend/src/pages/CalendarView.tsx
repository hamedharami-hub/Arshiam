import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { taskWorkDate } from "@/lib/taskDate";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCalendarSystem, setCalendarSystem, formatDate, type CalendarSystem } from "@/lib/jalali";
import { getHolidaysForRange, getOccasionSets, setOccasionSets, HOLIDAYS_EVENT, type Holiday, type OccasionSet } from "@/lib/holidays";
import { HolidayList } from "@/components/calendar/HolidayList";
import { getTimeSettings, periodFor, fromLocalISO } from "@/lib/timeHorizon";
import { addMonths as jAddMonths } from "date-fns-jalali";
import { parseTaskDueDate } from "@/lib/taskDate";
import { filterTasksForVisibility, useShowCompletedTasks, setShowCompletedTasks } from "@/lib/completedTaskVisibility";
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
  const showCompletedTasks = useShowCompletedTasks();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [occasionSets, setSets] = useState<OccasionSet[]>(getOccasionSets);
  const [system, setSystem] = useState<CalendarSystem>(getCalendarSystem());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeCycleProfileId, setActiveCycleProfileId] = useState<string | null>(null);
  const [cycleProfile, setCycleProfile] = useState<CycleProfile | null>(null);
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [cycleOverlayEnabled, setCycleOverlayEnabled] = useState(true);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const visibleTasks = useMemo(() => filterTasksForVisibility(tasks, showCompletedTasks), [tasks, showCompletedTasks]);

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
    const ts = { ...getTimeSettings(), calendar: system };
    if (view === "month") { const mp = periodFor("month", date, ts); start = subDays(fromLocalISO(mp.start), 7); end = addDays(fromLocalISO(mp.end), 7); end.setHours(23, 59, 59, 999); }
    else if (view === "week") { const wp = periodFor("week", date, ts); start = fromLocalISO(wp.start); end = fromLocalISO(wp.end); end.setHours(23, 59, 59, 999); }
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
          const calendarDate = taskWorkDate(t);
          if (calendarDate) {
            const d = parseTaskDueDate(calendarDate);
            if (d && d.getTime() >= startTime && d.getTime() <= endTime) {
              inRange = true;
            }
          }
          if (inRange) {
            seenIds.add(t.id);
            matching.push({ ...t, due_date: calendarDate });
          }
        }
        setTasks(matching);
      });
    getHolidaysForRange(subDays(start, 40), addDays(end, 40), occasionSets).then(setHolidays).catch(() => setHolidays([]));
  }, [user, date, view, refreshKey, system, occasionSets]);

  useEffect(() => {
    const on = () => { setSets(getOccasionSets()); setRefreshKey((k) => k + 1); };
    window.addEventListener(HOLIDAYS_EVENT, on);
    return () => window.removeEventListener(HOLIDAYS_EVENT, on);
  }, []);

  const listPeriod = periodFor(view === "month" || view === "agenda" ? "month" : view === "week" ? "week" : "day", date, { ...getTimeSettings(), calendar: system });
  const rangeHolidays = holidays.filter((h) => h.date >= listPeriod.start && h.date <= listPeriod.end);
  const listTitle = view === "day" ? T("مناسبت‌های این روز", "Occasions today") : view === "week" ? T("مناسبت‌های این هفته", "Occasions this week") : T("مناسبت‌های این ماه", "Occasions this month");

  const headerLabel = (() => {
    if (view === "day") return system === "jalali" ? formatDate(date, "d MMMM yyyy", "jalali") : format(date, "MMMM d, yyyy");
    if (view === "week") {
      const wp = periodFor("week", date, { ...getTimeSettings(), calendar: system });
      const s = fromLocalISO(wp.start), e = fromLocalISO(wp.end);
      return system === "jalali"
        ? `${formatDate(s, "d MMM", "jalali")} – ${formatDate(e, "d MMM", "jalali")}`
        : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
    }
    return system === "jalali" ? formatDate(date, "MMMM yyyy", "jalali") : format(date, "MMMM yyyy");
  })();

  const altLabel = system === "jalali" ? format(date, "MMMM yyyy") : formatDate(date, "MMMM yyyy", "jalali");

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setDate(system === "jalali" ? jAddMonths(date, dir) : dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
    else if (view === "week") setDate(dir < 0 ? subWeeks(date, 1) : addWeeks(date, 1));
    else if (view === "day") setDate(dir < 0 ? subDays(date, 1) : addDays(date, 1));
    else setDate(system === "jalali" ? jAddMonths(date, dir) : dir < 0 ? subMonths(date, 1) : addMonths(date, 1));
  };

  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell space-y-6 pb-safe-bottom page-enter">
      <div className="flex items-start md:items-end justify-between gap-4 flex-wrap">
        <div>
          <HeaderTitlePortal title={headerLabel} />
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{altLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs dir={isEn ? "ltr" : "rtl"} value={system} onValueChange={(v) => persistSystem(v as CalendarSystem)}>
            <TabsList className="h-10 bg-muted p-1">
              <TabsTrigger value="jalali" className="text-xs h-8 rounded-md data-[state=active]:bg-background">
                {T("شمسی", "Jalali")}
              </TabsTrigger>
              <TabsTrigger value="gregorian" className="text-xs h-8 rounded-md data-[state=active]:bg-background">
                {T("میلادی", "Gregorian")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => navigate(-1)} title={T("قبلی", "Previous")}>
              <PrevIcon className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDate(new Date())}>
              {T("امروز", "Today")}
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => navigate(1)} title={T("بعدی", "Next")}>
              <NextIcon className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label={T("نمایش مناسبت‌ها", "Show occasions")} data-testid="calendar-occasion-sets">
            {([["IR", T("ایران", "Iran")], ["AU", T("استرالیا", "Australia")]] as const).map(([code, label]) => {
              const on = occasionSets.includes(code);
              return (
                <Button key={code} size="sm" variant={on ? "secondary" : "outline"} aria-pressed={on}
                  className="h-9 gap-1.5 rounded-lg border border-border/60 text-xs"
                  onClick={() => setOccasionSets(on ? occasionSets.filter((c) => c !== code) : [...occasionSets, code])}
                  data-testid={`calendar-occasions-${code}`}>
                  <span className={on ? "" : "text-muted-foreground line-through"}>{label}</span>
                </Button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant={showCompletedTasks ? "secondary" : "outline"}
            className="h-9 text-xs gap-1.5 rounded-lg border border-border/60"
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            title={showCompletedTasks ? T("مخفی‌سازی تسک‌های انجام‌شده", "Hide completed tasks") : T("نمایش تسک‌های انجام‌شده", "Show completed tasks")}
            data-testid="calendar-toggle-completed"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${showCompletedTasks ? "text-success" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">{showCompletedTasks ? T("تکمیل‌شده‌ها", "Completed") : T("فقط بازها", "Open only")}</span>
          </Button>
        </div>
      </div>

      <Tabs dir={isEn ? "ltr" : "rtl"} value={view} onValueChange={(v) => setView(v as ViewMode)} className="space-y-4">
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
            <MonthGrid month={date} tasks={visibleTasks} holidays={holidays} system={system}
              cycleProfile={cycleProfile} cycleLogs={cycleLogs}
              onDayClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card className="p-3 bg-card/60 border-border/60 shadow-sm">
            <WeekView date={date} tasks={visibleTasks} holidays={holidays} system={system}
              onDayClick={(d) => { setDate(d); setView("day"); }}
              onSlotClick={(d) => setDetailDate(d)} />
          </Card>
        </TabsContent>

        <TabsContent value="day">
          <Card className="p-4 bg-card/60 border-border/60 shadow-sm">
            <DayView date={date} tasks={visibleTasks} system={system}
              onSlotClick={() => setDetailDate(date)}
              onTaskClick={(id) => nav(`/app/tasks/${id}`)} />
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <Card className="p-4 bg-card/60 border-border/60 shadow-sm">
            <AgendaView start={startOfMonth(date)} end={endOfMonth(date)} tasks={visibleTasks}
              holidays={holidays} system={system} />
          </Card>
        </TabsContent>
      </Tabs>

      <HolidayList holidays={rangeHolidays} system={system} isEn={isEn} title={listTitle} />

      <DayDetailSheet
        date={detailDate}
        open={!!detailDate}
        onOpenChange={(v) => !v && setDetailDate(null)}
        tasks={visibleTasks}
        holidays={holidays}
        system={system}
        onTaskCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
