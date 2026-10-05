import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";
import { TaskListItem } from "./TaskListItem";

describe("TaskListItem subtasks progress rendering", () => {
  const parentTask: Task = {
    id: "parent-1",
    user_id: "user-1",
    title: "Parent Task",
    completed: false,
    status: "todo",
    priority: "none",
    folder_id: null,
    parent_id: null,
    due_date: null,
  };

  const subTask: Task = {
    id: "sub-1",
    user_id: "user-1",
    title: "Subtask 1",
    completed: true,
    status: "done",
    priority: "none",
    folder_id: null,
    parent_id: "parent-1",
    due_date: null,
  };

  it("renders parent task with subtasks safely even when progress prop is omitted", () => {
    const html = renderToString(
      <TaskListItem
        t={parentTask}
        subs={[subTask]}
        open={true}
        onToggleExpand={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleTask={vi.fn()}
        onActionTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onPatchTask={vi.fn()}
        onMoveTask={vi.fn()}
        isSelected={false}
        splitView={false}
        layout="compact"
        isEn={true}
        T={(_fa, en) => en}
        navigate={vi.fn()}
        outcomeByTaskId={{}}
        outcomeById={{}}
        childrenMap={{ "parent-1": [subTask] }}
        expanded={{}}
        getProgress={() => ({ done: 1, total: 1 })}
        taskMap={new Map([["parent-1", parentTask], ["sub-1", subTask]])}
      />
    );

    expect(html).toContain("Parent Task");
    expect(html).toContain("1/1");
  });

  it("shows waiting state and its optional reason without marking the task done", () => {
    const html = renderToString(
      <TaskListItem
        t={{ ...parentTask, status: "waiting", waiting_reason: "Waiting for review" }}
        subs={[]}
        open={false}
        onToggleExpand={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleTask={vi.fn()}
        onActionTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onPatchTask={vi.fn()}
        onMoveTask={vi.fn()}
        isSelected={false}
        splitView={false}
        layout="compact"
        isEn={true}
        T={(_fa, en) => en}
        navigate={vi.fn()}
        outcomeByTaskId={{}}
        outcomeById={{}}
        childrenMap={{}}
        expanded={{}}
        getProgress={() => ({ done: 0, total: 0 })}
        taskMap={new Map()}
      />,
    );
    expect(html).toContain("Waiting");
    expect(html).toContain("Waiting for review");
    expect(html).not.toContain("line-through");
  });

  it("renders when both progress prop and getProgress return undefined without crashing", () => {
    const html = renderToString(
      <TaskListItem
        t={parentTask}
        subs={[subTask]}
        open={true}
        onToggleExpand={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleTask={vi.fn()}
        onActionTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onPatchTask={vi.fn()}
        onMoveTask={vi.fn()}
        isSelected={false}
        splitView={false}
        layout="compact"
        isEn={true}
        T={(_fa, en) => en}
        navigate={vi.fn()}
        outcomeByTaskId={{}}
        outcomeById={{}}
        childrenMap={{}}
        expanded={{}}
        getProgress={(() => undefined as any)}
        taskMap={new Map()}
      />
    );

    expect(html).toContain("Parent Task");
    expect(html).toContain("0/1");
  });

  it("hides completed subtasks while keeping their completion in the progress total", () => {
    const activeSubtask = { ...subTask, id: "sub-2", title: "Active Subtask", completed: false, status: "todo" as const };
    const html = renderToString(
      <TaskListItem
        t={parentTask}
        subs={[subTask, activeSubtask]}
        open={true}
        onToggleExpand={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleTask={vi.fn()}
        onActionTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onPatchTask={vi.fn()}
        onMoveTask={vi.fn()}
        isSelected={false}
        splitView={false}
        layout="compact"
        isEn={true}
        T={(_fa, en) => en}
        navigate={vi.fn()}
        outcomeByTaskId={{}}
        outcomeById={{}}
        childrenMap={{ "parent-1": [subTask, activeSubtask] }}
        expanded={{}}
        getProgress={() => ({ done: 1, total: 2 })}
        taskMap={new Map([["parent-1", parentTask], ["sub-1", subTask], ["sub-2", activeSubtask]])}
        showCompletedTasks={false}
      />,
    );

    expect(html).toContain("Active Subtask");
    expect(html).not.toContain("Subtask 1");
    expect(html).toContain("1/2");
  });

  it("routes active Leitner reviews instead of allowing ordinary completion", () => {
    const html = renderToString(
      <TaskListItem
        t={{ ...parentTask, id: "leitner-1", title: "Review lesson", source_type: "leitner", source_id: "doc-1" }}
        subs={[]}
        open={false}
        onToggleExpand={vi.fn()}
        onSelectTask={vi.fn()}
        onToggleTask={vi.fn()}
        onActionTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onPatchTask={vi.fn()}
        onMoveTask={vi.fn()}
        isSelected={false}
        splitView={false}
        layout="compact"
        isEn={true}
        T={(_fa, en) => en}
        navigate={vi.fn()}
        outcomeByTaskId={{}}
        outcomeById={{}}
        childrenMap={{}}
        expanded={{}}
        getProgress={() => ({ done: 0, total: 0 })}
        taskMap={new Map()}
      />,
    );

    expect(html).toContain('aria-label="Open Leitner review"');
    expect(html).not.toContain('role="checkbox"');
  });
});
