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
});
