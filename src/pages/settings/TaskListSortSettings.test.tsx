import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { TaskListSortSettings } from "./TaskListSortSettings";
import { readTaskListSort } from "@/lib/taskListSort";
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
beforeEach(() => localStorage.clear());
it("edits each list's two display rules from Settings without duplicating the criteria", async () => {
  render(<TaskListSortSettings />);
  fireEvent.change(screen.getByLabelText("First rule"), { target: { value: "title" } });
  fireEvent.change(screen.getByLabelText("Second rule"), { target: { value: "title" } });
  await waitFor(() => expect(readTaskListSort("today:_").sort_primary.key).toBe("due"));
  expect(readTaskListSort("today:_").sort_secondary.key).toBe("title");
  fireEvent.change(screen.getByLabelText("List"), { target: { value: "inbox:_" } });
  await waitFor(() => expect(screen.getByLabelText("Second rule")).toHaveValue("priority"));
  fireEvent.change(screen.getByLabelText("First rule"), { target: { value: "created" } });
  expect(readTaskListSort("inbox:_").sort_primary.key).toBe("created");
  expect(readTaskListSort("today:_").sort_secondary.key).toBe("title");
});
