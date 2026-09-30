import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { StudyTaskScheduleModal } from "./StudyTaskScheduleModal";

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  createStudyTask: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));
vi.mock("@/lib/taskStudyService", () => ({ createStudyTask: mocks.createStudyTask }));
vi.mock("@/components/DueDatePicker", () => ({ DueDatePicker: () => <div /> }));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess, warning: mocks.toastWarning, info: vi.fn() },
}));

describe("StudyTaskScheduleModal authentication boundary", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.createStudyTask.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastWarning.mockReset();
  });

  it("opens the created task from the success action using an existing route", async () => {
    mocks.user = { id: "synthetic-user" };
    mocks.createStudyTask.mockResolvedValueOnce({ ok: true, task: { id: "created-task" } });
    function Location() { return <output data-testid="task-location">{useLocation().pathname}</output>; }
    render(<MemoryRouter><Location /><StudyTaskScheduleModal open onOpenChange={vi.fn()} targetType="knowledge_doc" targetId="doc-1" targetTitle="Lesson" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "ثبت تسک مطالعه" }));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    const options = mocks.toastSuccess.mock.calls[0][1];
    act(() => options.action.onClick());
    expect(screen.getByTestId("task-location")).toHaveTextContent("/app/tasks/created-task");
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
    const lessonOption = screen.getByRole("option", { name: "درس نمونه" });
    fireEvent.change(targetSelect, { target: { value: lessonOption.getAttribute("value") } });
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

  it("creates a folder-scoped Leitner task for all nested lessons", async () => {
    mocks.user = { id: "synthetic-user" };
    mocks.createStudyTask.mockResolvedValueOnce({
      ok: true,
      task: { id: "folder-study-task", user_id: "synthetic-user" },
    });

    render(
      <StudyTaskScheduleModal
        open
        onOpenChange={vi.fn()}
        targetType="leitner"
        targetId="all"
        targetTitle="همهٔ کارت‌های لایتنر"
        targetOptions={[
          { id: "folder-root", title: "داروشناسی", targetType: "leitner_folder" },
          { id: "folder-child", title: "داروشناسی › قلب", targetType: "leitner_folder" },
          { id: "doc-1", title: "درس نمونه", targetType: "leitner" },
        ]}
      />,
    );

    const targetSelect = await screen.findByRole("combobox", { name: "مجموعهٔ مرور" });
    const folderOption = screen.getByRole("option", { name: "داروشناسی › قلب" });
    fireEvent.change(targetSelect, { target: { value: folderOption.getAttribute("value") } });
    expect(screen.getByDisplayValue("مرور لایتنر: داروشناسی › قلب")).toBeInTheDocument();
    expect(screen.getByText("این تسک کارت‌های موعددارِ این پوشه و همهٔ زیرپوشه‌های آن را مرور می‌کند.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ثبت تسک مطالعه" }));

    await waitFor(() => {
      expect(mocks.createStudyTask).toHaveBeenCalledWith(expect.objectContaining({
        targetType: "leitner_folder",
        targetId: "folder-child",
        targetTitle: "داروشناسی › قلب",
        title: "مرور لایتنر: داروشناسی › قلب",
      }));
    });
  });

  it("keeps a directly opened Leitner-folder task in the Leitner workflow", async () => {
    mocks.user = { id: "synthetic-user" };
    mocks.createStudyTask.mockResolvedValueOnce({
      ok: true,
      task: { id: "folder-review", user_id: "synthetic-user" },
    });
    const onOpenChange = vi.fn();

    render(
      <StudyTaskScheduleModal
        open
        onOpenChange={onOpenChange}
        targetType="leitner_folder"
        targetId="folder-cardiology"
        targetTitle="داروشناسی › قلب"
      />,
    );

    expect(await screen.findByDisplayValue("خواندن و مرور کارت‌های لایتنر")).toBeInTheDocument();
    expect(screen.getByText("برنامه‌ریزی مرور جعبه لایتنر")).toBeInTheDocument();
    expect(screen.getByText("جعبه لایتنر")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ثبت تسک مطالعه" }));

    await waitFor(() => {
      expect(mocks.createStudyTask).toHaveBeenCalledWith(expect.objectContaining({
        targetType: "leitner_folder",
        targetId: "folder-cardiology",
        targetTitle: "داروشناسی › قلب",
        title: "خواندن و مرور کارت‌های لایتنر",
      }));
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "تسک خواندن لایتنر با موفقیت در تسک‌ها ایجاد شد",
        expect.objectContaining({ action: expect.any(Object) }),
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("warns when the task is created but its lesson link fails", async () => {
    mocks.user = { id: "synthetic-user" };
    mocks.createStudyTask.mockResolvedValueOnce({
      ok: true,
      task: { id: "study-task-1", user_id: "synthetic-user" },
      linkWarning: true,
    });
    const onOpenChange = vi.fn();

    render(
      <StudyTaskScheduleModal
        open
        onOpenChange={onOpenChange}
        targetType="knowledge_doc"
        targetId="doc-1"
        targetTitle="Sample lesson"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "ثبت تسک مطالعه" }));

    await waitFor(() => {
      expect(mocks.toastWarning).toHaveBeenCalledWith(
        expect.stringContaining("تسک ساخته شد"),
        expect.objectContaining({ action: expect.any(Object) }),
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
