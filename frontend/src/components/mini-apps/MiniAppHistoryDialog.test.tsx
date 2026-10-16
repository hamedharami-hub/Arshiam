import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MiniAppHistoryDialog } from "./MiniAppHistoryDialog";
import type { MiniApp } from "@/lib/miniAppsStore";
import type { MiniAppVersion } from "@/lib/miniAppsHistory";

const app: MiniApp = { id: "one", name: "Tool", emoji: "", description: "", aiRequest: "", html: "<p>Original</p>", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const version: MiniAppVersion = { id: "v1", appId: app.id, app, savedAt: 1_000, kind: "initial" };
const t = (_fa: string, en: string) => en;

describe("HTML history comparison dialog", () => {
  it("offers capture and restore actions without performing side effects itself", () => {
    const capture = vi.fn();
    const restore = vi.fn();
    const close = vi.fn();
    render(<MiniAppHistoryDialog versions={[version]} draft={app} isEn t={t} onClose={close} onCheckpoint={capture} onRestore={restore} canCheckpoint />);
    fireEvent.click(screen.getByRole("button", { name: "Capture version" }));
    expect(capture).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Restore to draft" }));
    expect(restore).toHaveBeenCalledWith(version);
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(close).toHaveBeenCalledOnce();
  });
  it("shows metadata differences and hides unchanged code on request", () => {
    render(<MiniAppHistoryDialog versions={[version]} draft={{ ...app, name: "Renamed", description: "New detail" }} isEn t={t} onClose={vi.fn()} onCheckpoint={vi.fn()} onRestore={vi.fn()} canCheckpoint />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Renamed");
    expect(screen.getByRole("dialog")).toHaveTextContent("New detail");
    fireEvent.click(screen.getByLabelText("Changes only"));
    expect(screen.getByTestId("html-version-diff")).toHaveTextContent("No code changes");
  });
  it("pages the complete diff instead of rendering or silently truncating all lines", () => {
    const before = Array.from({ length: 300 }, (_, i) => `old${i}`).join("\n");
    const after = Array.from({ length: 300 }, (_, i) => `new${i}`).join("\n");
    render(<MiniAppHistoryDialog versions={[{ ...version, app: { ...app, html: before } }]} draft={{ ...app, html: after }} isEn t={t} onClose={vi.fn()} onCheckpoint={vi.fn()} onRestore={vi.fn()} canCheckpoint />);
    expect(screen.getByTestId("html-version-diff").querySelectorAll("code")).toHaveLength(150);
    for (let i = 0; i < 10; i++) {
      const next = screen.getByRole("button", { name: "Next diff page" });
      if (next.hasAttribute("disabled")) break;
      fireEvent.click(next);
    }
    expect(screen.getByTestId("html-version-diff")).toHaveTextContent("new299");
    expect(screen.getByRole("button", { name: "Next diff page" })).toBeDisabled();
  });
  it("supports Persian RTL and disabled capture for invalid source", () => {
    render(<MiniAppHistoryDialog versions={[]} draft={app} isEn={false} t={fa => fa} onClose={vi.fn()} onCheckpoint={vi.fn()} onRestore={vi.fn()} canCheckpoint={false} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("button", { name: "ثبت نسخه" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "بازگردانی به پیش‌نویس" })).toBeDisabled();
  });
});
