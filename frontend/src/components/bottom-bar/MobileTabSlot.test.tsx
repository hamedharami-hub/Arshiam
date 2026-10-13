import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ALL_MOBILE_TAB_OPTIONS, getAccessibleMobileTabs, resetMobileBottomTabs, setMobileBottomTabs, setMobileTabHoldEnabled, useMobileBottomTabs } from "@/lib/mobileBottomBarSettings";
import { useModules } from "@/lib/appModules";
import { toast } from "sonner";
import { MobileTabSlot } from "./MobileTabSlot";
import { MobileBottomBar } from "./MobileBottomBar";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: "en" } }) }));
vi.mock("@/lib/appModules", () => ({ withFeatureMetadata: (value: unknown) => value, isPathAllowed: (path: string) => !path.includes("mind") && !path.includes("knowledge"), useModules: () => ({ ready: true }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ openMobileFromSide: vi.fn() }) }));
vi.mock("./BottomQuickAddButton", () => ({ BottomQuickAddButton: () => null }));
function Fixture({ fullBar = false }: { fullBar?: boolean }) {
  const tabs = useMobileBottomTabs();
  const location = useLocation();
  const live = getAccessibleMobileTabs(tabs, useModules());
  return <>{fullBar ? <MobileBottomBar tabs={live} currentPath={location.pathname} dir="ltr" /> : <MobileTabSlot tab={live[0]} currentPath={location.pathname} />}<output data-testid="tabs">{tabs.join(",")}</output><output data-testid="path">{location.pathname}</output></>;
}
beforeEach(() => { resetMobileBottomTabs(); setMobileTabHoldEnabled(false); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it("does not offer replacement unless enabled", () => {
  render(<MemoryRouter initialEntries={["/app/today"]}><Fixture /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole("link", { name: "Today" }), { key: "F10", shiftKey: true });
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("swaps existing destinations with keyboard access without navigating", () => {
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter initialEntries={["/app/today"]}><Fixture /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole("link", { name: "Today" }), { key: "F10", shiftKey: true });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Mind" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
  expect(screen.getByTestId("tabs")).toHaveTextContent("calendar,today,notes,inbox");
  expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
});
it("suppresses navigation from a synthetic click after touch hold", () => {
  vi.useFakeTimers();
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter initialEntries={["/app/inbox"]}><Fixture /></MemoryRouter>);
  const link = screen.getByRole("link", { name: "Today" });
  fireEvent.touchStart(link, { touches: [{ clientX: 20, clientY: 20 }] });
  act(() => vi.advanceTimersByTime(450));
  fireEvent.touchEnd(link);
  fireEvent.click(link);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByTestId("path")).toHaveTextContent("/app/inbox");
});
it("replaces a fallback destination absent from persisted preferences", () => {
  setMobileBottomTabs(["mind", "knowledge", "planning", "pomodoro"]);
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter initialEntries={["/app/inbox"]}><MobileTabSlot tab={ALL_MOBILE_TAB_OPTIONS.today} liveTabs={["planning", "pomodoro", "today", "calendar"]} currentPath="/app/inbox" /><Fixture /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole("link", { name: "Today" }), { key: "ContextMenu" });
  fireEvent.click(screen.getByRole("button", { name: "Inbox" }));
  expect(screen.getByTestId("tabs")).toHaveTextContent("planning,pomodoro,inbox,calendar");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("path")).toHaveTextContent("/app/inbox");
});
it("returns focus to the same slot after replacement", async () => {
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter><Fixture fullBar /></MemoryRouter>);
  screen.getByRole("link", { name: "Today" }).focus();
  fireEvent.keyDown(document.activeElement!, { key: "ContextMenu" });
  fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Calendar" })).toHaveFocus());
});
it("does not reopen the chooser after hold is disabled and enabled again", () => {
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter><Fixture /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole("link", { name: "Today" }), { key: "ContextMenu" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  act(() => setMobileTabHoldEnabled(false));
  act(() => setMobileTabHoldEnabled(true));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("keeps the chooser and saved layout on storage failure", () => {
  setMobileTabHoldEnabled(true);
  render(<MemoryRouter><Fixture /></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole("link", { name: "Today" }), { key: "ContextMenu" });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByTestId("tabs")).toHaveTextContent("today,calendar,notes,inbox");
  expect(toast.error).toHaveBeenCalled();
});
