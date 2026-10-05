import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";
import { MakeChildDialog } from "./MakeChildDialog";

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ update: mocks.update.mockReturnValue({ eq: mocks.eq }) }) } }));

const task = (id: string, parent_id: string | null = null): Task => ({ id, title: id, parent_id, priority: "none", completed: false, status: "todo" });

describe("MakeChildDialog parent_id cycle guard", () => {
  it("excludes self and descendants and saves a valid parent_id link", async () => {
    mocks.update.mockReset();
    mocks.eq.mockReset().mockResolvedValue({ error: null });
    const onDone = vi.fn();
    render(<MakeChildDialog open onOpenChange={vi.fn()} task={task("child", "old")} allTasks={[
      task("root"), task("old", "root"), task("child", "old"), task("descendant", "child"), task("other"),
    ]} onDone={onDone} />);

    expect(screen.queryByRole("button", { name: "child" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "descendant" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "root" }));
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith("id", "child"));
    expect(mocks.update).toHaveBeenCalledWith({ parent_id: "root" });
    expect(onDone).toHaveBeenCalledWith("root");
  });
});
