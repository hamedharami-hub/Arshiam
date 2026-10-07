import type { Task } from "@/lib/taskTypes";

/** Calendar-only extensions are optional until the shared task model lands. */
export type CalendarTask = Pick<Task, "id" | "title" | "completed"> & Partial<Task> & {
  due_date: string | null;
  priority: string;
  deadline_date?: string | null;
  tag_ids?: string[];
};
