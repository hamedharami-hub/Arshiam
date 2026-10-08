export type FocusReportSession = {
  id?: string;
  task_id: string | null;
  duration_minutes: number;
  ended_at: string | null;
  completed?: boolean;
};

export type FocusReportTask = {
  id: string;
  title: string;
  folder_id?: string | null;
};

export type FocusReportFolder = { id: string; name: string };

export type FocusBreakdownItem = { id: string; label: string; minutes: number };

export type FocusMonthReport = {
  minutes: number;
  sessions: number;
  byTask: FocusBreakdownItem[];
  byFolder: FocusBreakdownItem[];
};

export type FocusReportLabels = {
  deletedTask: string;
  noTask: string;
  deletedFolder: string;
  noFolder: string;
  unknownTaskFolder: string;
};

export type FocusHistoryCursor = { endedAt: string; id: string };
export type FocusHistoryRequest = { ownerId: string; generation: number };

export function focusHistoryStateForOwner<T extends { ownerId: string | null }>(
  state: T,
  ownerId: string | null,
): T | null {
  return state.ownerId === ownerId ? state : null;
}

/** Prevents a late history page from an account or superseded reload from replacing current data. */
export function isCurrentFocusHistoryRequest(
  request: FocusHistoryRequest,
  currentOwnerId: string | null,
  currentGeneration: number,
): boolean {
  return request.ownerId === currentOwnerId && request.generation === currentGeneration;
}

export function buildFocusHistoryPage<T extends FocusReportSession>(
  rows: T[],
  pageSize: number,
): { rows: T[]; cursor: FocusHistoryCursor | null; hasMore: boolean } {
  const page = rows.slice(0, pageSize);
  const last = page[page.length - 1];
  return {
    rows: page,
    cursor: last?.ended_at && last.id ? { endedAt: last.ended_at, id: last.id } : null,
    hasMore: rows.length > pageSize,
  };
}

export function buildFocusMonthReport(
  sessions: FocusReportSession[],
  tasks: FocusReportTask[],
  folders: FocusReportFolder[],
  labels: FocusReportLabels,
): FocusMonthReport {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const taskTotals = new Map<string, FocusBreakdownItem>();
  const folderTotals = new Map<string, FocusBreakdownItem>();
  let minutes = 0;

  for (const session of sessions) {
    const duration = Number.isFinite(session.duration_minutes) ? Math.max(0, session.duration_minutes) : 0;
    minutes += duration;

    const task = session.task_id ? taskById.get(session.task_id) : undefined;
    const taskId = session.task_id || "__free__";
    const taskLabel = task ? task.title : session.task_id ? labels.deletedTask : labels.noTask;
    const taskItem = taskTotals.get(taskId) || { id: taskId, label: taskLabel, minutes: 0 };
    taskItem.minutes += duration;
    taskTotals.set(taskId, taskItem);

    const folderId = task?.folder_id || (session.task_id ? "__unknown_task_folder__" : "__unfiled__");
    const folder = folderId === "__unfiled__" ? undefined : folderById.get(folderId);
    const folderLabel = folder ? folder.name
      : folderId === "__unfiled__" ? labels.noFolder
      : folderId === "__unknown_task_folder__" ? labels.unknownTaskFolder
      : labels.deletedFolder;
    const folderItem = folderTotals.get(folderId) || { id: folderId, label: folderLabel, minutes: 0 };
    folderItem.minutes += duration;
    folderTotals.set(folderId, folderItem);
  }

  const byMinutes = (a: FocusBreakdownItem, b: FocusBreakdownItem) => b.minutes - a.minutes || a.label.localeCompare(b.label);
  return {
    minutes,
    sessions: sessions.length,
    byTask: Array.from(taskTotals.values()).sort(byMinutes),
    byFolder: Array.from(folderTotals.values()).sort(byMinutes),
  };
}
