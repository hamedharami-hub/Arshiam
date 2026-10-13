import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CrisisSupportSettings } from "./CrisisSupportSettings";
import { CRISIS_REGION_STORAGE_KEY, resolveSupportRegion } from "@/lib/crisisResources";
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => <select aria-label="Support Region" value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null, SelectValue: () => null,
}));
beforeEach(() => { localStorage.clear(); toast.success.mockClear(); toast.error.mockClear(); });
afterEach(() => vi.restoreAllMocks());
it("keeps the saved region and reports error if a Settings write fails", () => {
  localStorage.setItem(CRISIS_REGION_STORAGE_KEY, "au");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
  render(<MemoryRouter><CrisisSupportSettings /></MemoryRouter>);
  fireEvent.change(screen.getByRole("combobox", { name: "Support Region" }), { target: { value: "ir" } });
  expect(screen.getByRole("combobox", { name: "Support Region" })).toHaveValue("au");
  expect(resolveSupportRegion("en")).toBe("au");
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledOnce();
});
it("shows the selected region after persistence succeeds", () => {
  render(<MemoryRouter><CrisisSupportSettings /></MemoryRouter>);
  fireEvent.change(screen.getByRole("combobox", { name: "Support Region" }), { target: { value: "ir" } });
  expect(screen.getByRole("combobox", { name: "Support Region" })).toHaveValue("ir");
  expect(resolveSupportRegion("en")).toBe("ir");
  expect(toast.success).toHaveBeenCalledOnce();
});
