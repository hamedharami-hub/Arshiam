import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { id: "owner-1" },
  params: new URLSearchParams("parent_id=parent-1&title=Draft"),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [mocks.params],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {} }));
vi.mock("@/components/ui/popover", async () => {
  const React = await import("react");
  const PopoverContext = React.createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });
  return {
    Popover: ({ open, onOpenChange, children }: any) => (
      <PopoverContext.Provider value={{ open, toggle: () => onOpenChange(!open) }}>{children}</PopoverContext.Provider>
    ),
    PopoverTrigger: ({ children }: any) => {
      const context = React.useContext(PopoverContext);
      return React.cloneElement(children, { onClick: context.toggle });
    },
    PopoverContent: ({ children }: any) => React.useContext(PopoverContext).open ? <div>{children}</div> : null,
  };
});
vi.mock("@/components/TaskDetail", async () => {
  const React = await import("react");
  const FakeTaskDetail = React.forwardRef<any, any>((props, ref) => {
    const [folderId, setFolderId] = React.useState<string | null>(null);
    React.useImperativeHandle(ref, () => ({
      getCurrentTask: () => ({ ...props.task, folder_id: folderId }),
      hasPendingChanges: () => false,
      savePendingChanges: async () => {},
      openActions: () => {},
      setFolderId: async (id: string | null) => setFolderId(id),
    }));
    React.useEffect(() => {
      props.onHeaderContextChange?.({
        folderId, parentId: "parent-1", parentTitle: "Parent task", parentFolderId: "folder-1",
        folders: [
          { id: "folder-1", name: "Work", parent_id: null, color: null },
          { id: "folder-2", name: "Personal", parent_id: null, color: null },
        ],
      });
    }, [folderId, props.onHeaderContextChange]);
    return <div data-testid="editor" />;
  });
  return { TaskDetail: FakeTaskDetail };
});

import NewTaskView from "./NewTaskView";

afterEach(() => { cleanup(); mocks.navigate.mockClear(); });

it("shows the inherited folder, updates the header after moving, and protects a parent jump", async () => {
  render(<NewTaskView />);
  expect(await screen.findByTestId("editor")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "تغییر فولدر: Work" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Parent task/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "تغییر فولدر: Work" }));
  fireEvent.click(await screen.findByRole("button", { name: "Personal" }));
  expect(await screen.findByRole("button", { name: "تغییر فولدر: Personal" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Parent task/ }));
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/app/tasks/parent-1"));
});
