import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudyTaskScheduleModal } from "./StudyTaskScheduleModal";

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  createStudyTask: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));
vi.mock("@/lib/taskStudyService", () => ({ createStudyTask: mocks.createStudyTask }));
vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div /> }));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() },
}));

describe("StudyTaskScheduleModal authentication boundary", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.createStudyTask.mockReset();
    mocks.toastError.mockReset();
  });

  it("does not schedule under a synthetic user when signed out", async () => {
    render(
      <StudyTaskScheduleModal
        open
        onOpenChange={vi.fn()}
        targetType="knowledge_doc"
        targetId="doc-1"
        targetTitle="Sample lesson"
      />
    );

    await screen.findByDisplayValue("مطالعه درس: Sample lesson");
    fireEvent.click(screen.getByRole("button", { name: "ثبت تسک مطالعه" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("برای زمان‌بندی مطالعه ابتدا وارد حساب خود شوید");
    });
    expect(mocks.createStudyTask).not.toHaveBeenCalled();
  });

  it("schedules a Leitner task for the selected lesson instead of all cards", async () => {
    mocks.user = { id: "synthetic-user" };
    mocks.createStudyTask.mockResolvedValueOnce({
      ok: true,
      task: { id: "study-task-1", user_id: "synthetic-user" },
    });
    const onOpenChange = vi.fn();

    render(
      <StudyTaskScheduleModal
        open
        onOpenChange={onOpenChange}
        targetType="leitner"
        targetId="all"
        targetTitle="همهٔ کارت‌های لایتنر"
        targetOptions={[{ id: "doc-1", title: "درس نمونه" }]}
      />
    );

    const targetSelect = await screen.findByRole("combobox", { name: "مجموعهٔ مرور" });
    fireEvent.change(targetSelect, { target: { value: "doc-1" } });
    expect(screen.getByDisplayValue("مرور لایتنر: درس نمونه")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ثبت تسک مطالعه" }));

    await waitFor(() => {
      expect(mocks.createStudyTask).toHaveBeenCalledWith(expect.objectContaining({
        targetType: "leitner",
        targetId: "doc-1",
        targetTitle: "درس نمونه",
        title: "مرور لایتنر: درس نمونه",
      }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
