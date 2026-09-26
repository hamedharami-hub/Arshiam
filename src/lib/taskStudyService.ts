import { persistTask, upsertTask } from "@/lib/firestoreDataService";
import { getCachedTasks } from "@/features/tasks/taskService";
import { db, doc, getDoc } from "@/lib/firebase";
import type { Task, ReminderPlan } from "@/lib/taskTypes";
import type { Priority } from "@/lib/priority";
import type { LeitnerCard } from "@/lib/leitnerTypes";

export type StudyTargetType =
  | "knowledge_folder"
  | "knowledge_doc"
  | "mindmap_folder"
  | "mindmap_doc"
  | "mindmap_all"
  | "leitner"
  | "leitner_folder";

export function isLeitnerStudyTask(task: Partial<Task>): boolean {
  return task.source_type === "leitner" || task.source_type === "leitner_folder";
}

export interface CreateStudyTaskOptions {
  userId: string;
  targetType: StudyTargetType;
  targetId: string;
  targetTitle: string;
  title?: string;
  description?: string;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  priority?: Priority;
  reminderAt?: string | null;
  reminderPlan?: ReminderPlan | null;
  folderId?: string | null;
}

export interface RescheduleLeitnerStudyTaskOptions {
  userId: string;
  taskId: string;
  targetType: "leitner" | "leitner_folder";
  targetId: string;
  nextReviewAt: string;
}

export type RescheduleLeitnerStudyTaskResult =
  | { ok: true; status: "saved" | "queued"; dueDate: string }
  | { ok: false; error: string };

/** Finds the next scheduled card date in a deck or one selected lesson. */
export function getNextLeitnerReviewAt(
  cards: Array<Pick<LeitnerCard, "document_id" | "next_review_at">>,
  targetId: string,
): string | null {
  let earliest = Number.POSITIVE_INFINITY;

  for (const card of cards) {
    if (targetId !== "all" && card.document_id !== targetId) continue;
    const reviewTime = Date.parse(card.next_review_at);
    if (Number.isFinite(reviewTime) && reviewTime < earliest) earliest = reviewTime;
  }

  return Number.isFinite(earliest) ? new Date(earliest).toISOString() : null;
}

/**
 * Moves a linked review task to the scheduler's next date after a full session.
 * The task is read and ownership/target-checked before the write so a URL query
 * cannot turn an unrelated task into a Leitner task.
 */
export async function rescheduleLeitnerStudyTaskAfterSession(
  options: RescheduleLeitnerStudyTaskOptions,
): Promise<RescheduleLeitnerStudyTaskResult> {
  const { userId, taskId, targetId, nextReviewAt } = options;
  if (!userId?.trim() || !taskId?.trim() || !targetId?.trim() || !Number.isFinite(Date.parse(nextReviewAt))) {
    return { ok: false, error: "Invalid review task schedule." };
  }

  try {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    let task: Task | undefined;
    if (isOffline) {
      task = (await getCachedTasks(userId)).find((candidate) => candidate.id === taskId);
    } else {
      const snapshot = await getDoc(doc(db, "users", userId, "tasks", taskId));
      if (!snapshot.exists()) return { ok: false, error: "Review task not found." };
      task = snapshot.data() as Task;
    }
    if (!task) return { ok: false, error: "Review task not found." };
    if (task.source_type !== options.targetType || task.source_id !== targetId || task.completed) {
      return { ok: false, error: "Review task no longer matches this study session." };
    }

    const status = await persistTask(userId, {
      id: taskId,
      due_date: nextReviewAt,
      completed: false,
      status: "todo",
      completed_at: null,
    });
    if (status === "failed") return { ok: false, error: "Could not save the next review date." };

    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasks-changed"));
    return { ok: true, status, dueDate: nextReviewAt };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update the review task.",
    };
  }
}

/**
 * Creates a linked study/review task for a knowledge branch, document, or mind map node.
 */
export async function createStudyTask(
  opts: CreateStudyTaskOptions
): Promise<{ ok: boolean; task?: Task; error?: string }> {
  try {
    if (!opts.userId?.trim()) {
      return { ok: false };
    }
    if (!opts.targetId?.trim()) {
      return { ok: false };
    }

    const taskId = `task_study_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Generate smart default title if not provided
    let defaultTitle = opts.title?.trim();
    if (!defaultTitle) {
      if (opts.targetType === "leitner" || opts.targetType === "leitner_folder") {
        defaultTitle = "خواندن و مرور کارت‌های لایتنر";
      } else if (opts.targetType === "knowledge_folder") {
        defaultTitle = `مطالعه شاخه: ${opts.targetTitle}`;
      } else if (opts.targetType === "knowledge_doc") {
        defaultTitle = `مطالعه درس: ${opts.targetTitle}`;
      } else if (opts.targetType === "mindmap_folder" || opts.targetType === "mindmap_doc") {
        defaultTitle = `مرور نقشه ذهنی: ${opts.targetTitle}`;
      } else {
        defaultTitle = "مرور نقشه ذهنی پایگاه دانش";
      }
    }

    const taskData: Task = {
      id: taskId,
      user_id: opts.userId,
      title: defaultTitle.slice(0, 200),
      description: opts.description?.trim().slice(0, 2000) || null,
      priority: opts.priority || "medium",
      due_date: opts.dueDate || null,
      completed: false,
      status: "todo",
      folder_id: opts.folderId || null,
      reminder_at: opts.reminderAt || null,
      reminder_plan: opts.reminderPlan || null,
      recurrence: "none",
      recurrence_rule: null,
      parent_id: null,
      pinned: false,
      start_at: null,
      end_at: null,
      estimated_minutes: opts.estimatedMinutes ?? 30,
      source_type: opts.targetType,
      source_id: opts.targetId,
    };

    const ok = await upsertTask(opts.userId, taskData);
    if (!ok) {
      return { ok: false };
    }

    // If it's a knowledge document, also try to add a task-knowledge link
    if (opts.targetType === "knowledge_doc" || opts.targetType === "mindmap_doc") {
      try {
        const { linkTaskToDocument } = await import("@/lib/taskKnowledgeService");
        await linkTaskToDocument(taskId, opts.targetId, opts.userId, "Study Task");
      } catch {
        // Non-blocking if link table fails
      }
    }

    return { ok: true, task: taskData };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Returns navigation URL and metadata for a study-linked task.
 */
export function getStudyTaskNavigation(task: Partial<Task>): {
  isStudyTask: boolean;
  isMindMap: boolean;
  isKnowledge: boolean;
  navUrl: string;
  badgeLabelFa: string;
  badgeLabelEn: string;
  actionTextFa: string;
  actionTextEn: string;
} {
  const type = task.source_type as StudyTargetType | undefined;
  const id = task.source_id || "";

  if (!type || (!type.startsWith("knowledge_") && !type.startsWith("mindmap_") &&
    type !== "leitner" && type !== "leitner_folder")) {
    return {
      isStudyTask: false,
      isMindMap: false,
      isKnowledge: false,
      navUrl: "",
      badgeLabelFa: "",
      badgeLabelEn: "",
      actionTextFa: "",
      actionTextEn: "",
    };
  }

  if (type === "leitner" || type === "leitner_folder") {
    const targetQuery = !id || id === "all"
      ? ""
      : type === "leitner_folder"
        ? `&studyFolderId=${encodeURIComponent(id)}`
        : `&studyDocId=${encodeURIComponent(id)}`;
    const taskQuery = task.id ? `&studyTaskId=${encodeURIComponent(task.id)}` : "";
    return {
      isStudyTask: true,
      isMindMap: false,
      isKnowledge: false,
      navUrl: `/app/review?tab=leitner${targetQuery}${taskQuery}`,
      badgeLabelFa: "مرور لایتنر",
      badgeLabelEn: "Leitner Review",
      actionTextFa: "شروع مرور کارت‌های لایتنر",
      actionTextEn: "Start Leitner Review",
    };
  }

  if (type === "knowledge_folder") {
    return {
      isStudyTask: true,
      isMindMap: false,
      isKnowledge: true,
      navUrl: `/app/knowledge?folderId=${encodeURIComponent(id)}`,
      badgeLabelFa: "مطالعه شاخه",
      badgeLabelEn: "Study Branch",
      actionTextFa: "ورود به شاخه و مطالعه",
      actionTextEn: "Open Branch to Study",
    };
  }

  if (type === "knowledge_doc") {
    return {
      isStudyTask: true,
      isMindMap: false,
      isKnowledge: true,
      navUrl: `/app/knowledge?docId=${encodeURIComponent(id)}`,
      badgeLabelFa: "مطالعه درس",
      badgeLabelEn: "Study Lesson",
      actionTextFa: "باز کردن درس و مطالعه",
      actionTextEn: "Open Lesson to Study",
    };
  }

  if (type === "mindmap_folder") {
    return {
      isStudyTask: true,
      isMindMap: true,
      isKnowledge: false,
      navUrl: `/app/review?tab=mindmap&folderId=${encodeURIComponent(id)}`,
      badgeLabelFa: "مرکز نقشه ذهنی",
      badgeLabelEn: "Mind Map Center",
      actionTextFa: "مشاهده در مرکز نقشه ذهنی",
      actionTextEn: "View Centered in Mind Map",
    };
  }

  if (type === "mindmap_doc") {
    return {
      isStudyTask: true,
      isMindMap: true,
      isKnowledge: false,
      navUrl: `/app/review?tab=mindmap&docId=${encodeURIComponent(id)}`,
      badgeLabelFa: "مرکز نقشه ذهنی",
      badgeLabelEn: "Mind Map Center",
      actionTextFa: "مشاهده در مرکز نقشه ذهنی",
      actionTextEn: "View Centered in Mind Map",
    };
  }

  // mindmap_all
  return {
    isStudyTask: true,
    isMindMap: true,
    isKnowledge: false,
    navUrl: `/app/review?tab=mindmap`,
    badgeLabelFa: "نقشه ذهنی",
    badgeLabelEn: "Mind Map",
    actionTextFa: "مرور کامل نقشه ذهنی",
    actionTextEn: "Review Mind Map",
  };
}
