import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AIPanel } from "./AIPanel";

const mocks = vi.hoisted(() => ({
  callAI: vi.fn(),
  persistTask: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({ callAI: mocks.callAI, getAILanguage: () => "en" }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: mocks.persistTask }));
vi.mock("@/lib/firebaseStore", () => ({ from: vi.fn(), firebaseStore: { from: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/AILangToggle", () => ({ AILangToggle: () => null }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ i18n: { language: "en" } }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe("AIPanel suggestion retries", () => {
  beforeEach(() => {
    mocks.callAI.mockReset().mockResolvedValue({ data: { items: [
      { title: "First suggested task" },
      { title: "Second suggested task" },
    ] } });
    mocks.persistTask.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
  });

  it("reuses each suggestion's task ID when retrying a partially failed save", async () => {
    mocks.persistTask
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("saved")
      .mockResolvedValueOnce("saved");

    render(<AIPanel open onOpenChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "پیشنهاد" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByPlaceholderText("مثال: راه‌اندازی کسب‌وکار آنلاین"), { target: { value: "Launch a shop" } });
    fireEvent.click(screen.getByRole("button", { name: "پیشنهاد بگیر" }));
    await screen.findByText("First suggested task");
    fireEvent.click(screen.getByText("First suggested task"));
    fireEvent.click(screen.getByText("Second suggested task"));

    const add = screen.getByRole("button", { name: "افزودن انتخاب‌شده‌ها به تسک‌ها" });
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(2));
    fireEvent.click(add);
    await waitFor(() => expect(mocks.persistTask).toHaveBeenCalledTimes(4));

    const initialIds = mocks.persistTask.mock.calls.slice(0, 2).map(([_, task]) => task.id);
    const retryIds = mocks.persistTask.mock.calls.slice(2).map(([_, task]) => task.id);
    expect(retryIds).toEqual(initialIds);
  });
});
