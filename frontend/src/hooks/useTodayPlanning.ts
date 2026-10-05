import { useCallback, useEffect, useState } from "react";
import {
  getNextTaskIdForDay,
  clearNextTaskIf as clearSelectedNextTaskIf,
  isTaskImportantForDay,
  setNextTaskForDay,
  subscribeTodayPlanning,
  toggleImportantTaskForDay,
  updateTodayPlanning,
  type TodayPlanningData,
  type TodayPlanningSnapshot,
} from "@/lib/todayPlanning";

export function useTodayPlanning(uid: string | undefined, day: string) {
  const [ownerSnapshot, setOwnerSnapshot] = useState<{ uid: string; snapshot: TodayPlanningSnapshot } | null>(null);
  useEffect(() => {
    if (!uid) {
      setOwnerSnapshot(null);
      return;
    }
    return subscribeTodayPlanning(uid, snapshot => setOwnerSnapshot({ uid, snapshot }));
  }, [uid]);

  // A uid change takes effect during render, before the subscription effect runs.
  const data: TodayPlanningData = ownerSnapshot?.uid === uid
    ? ownerSnapshot.snapshot.data
    : { nextTaskId: null, nextTaskDate: null, importantByDay: {}, wipEnabled: false, wipLimit: 3 };

  const setNextTask = useCallback((taskId: string | null) => {
    if (!uid) return;
    updateTodayPlanning(uid, current => setNextTaskForDay(current, taskId, day));
  }, [uid, day]);
  const clearNextTaskIf = useCallback((taskId: string) => {
    if (!uid) return;
    clearSelectedNextTaskIf(uid, taskId, day);
  }, [uid, day]);
  const toggleImportant = useCallback((taskId: string) => {
    if (!uid) return;
    updateTodayPlanning(uid, current => toggleImportantTaskForDay(current, taskId, day));
  }, [uid, day]);
  const setWipEnabled = useCallback((enabled: boolean) => {
    if (!uid) return;
    updateTodayPlanning(uid, current => ({ ...current, wipEnabled: enabled }));
  }, [uid]);
  const setWipLimit = useCallback((limit: number) => {
    if (!uid) return;
    updateTodayPlanning(uid, current => ({ ...current, wipLimit: limit }));
  }, [uid]);

  return {
    data,
    nextTaskId: getNextTaskIdForDay(data, day),
    isImportant: (taskId: string) => isTaskImportantForDay(data, taskId, day),
    setNextTask,
    clearNextTaskIf,
    toggleImportant,
    setWipEnabled,
    setWipLimit,
  };
}
