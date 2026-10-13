import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  vi.resetModules(); // Isolate the store imported by setup.ts from real Firebase.
  return {
  auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } },
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  };
});
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("@/lib/arshApi", () => ({ arshFetch: mocks.fetch }));
vi.mock("@/lib/offlineQueue", () => ({ retireOwnedModuleData: vi.fn(async () => ({ incomplete: false })) }));
vi.mock("@/lib/retiredModuleCloudPurge", () => ({ purgeRetiredModuleCloudData: vi.fn(async () => ({ incomplete: false })) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("./ModuleCodesAdmin", () => ({ ModuleCodesAdmin: () => <div data-testid="module-admin" /> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => <button {...props} role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} />,
}));

import { APP_MODULES, getModulesState, syncModulesForUser } from "@/lib/appModules";
import { AdvancedModulesPanel } from "./AdvancedModulesPanel";
import { OPEN_MODULES_PANEL_EVENT } from "./VersionTapTarget";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function switchAccount(uid: string) {
  mocks.auth.currentUser = { uid, getIdToken: vi.fn(async () => `token:${uid}`) };
  await act(async () => { await syncModulesForUser(uid); });
}

beforeEach(async () => {
  localStorage.clear();
  mocks.fetch.mockReset().mockResolvedValue({ unlocked: ["study"], installed: [], is_admin: false, is_owner: false });
  mocks.success.mockReset(); mocks.error.mockReset();
  await switchAccount("owner-a");
});
afterEach(async () => { cleanup(); await syncModulesForUser(null); vi.restoreAllMocks(); });

function openPanel() {
  const view = render(<AdvancedModulesPanel />);
  act(() => { window.dispatchEvent(new Event(OPEN_MODULES_PANEL_EVENT)); });
  return view;
}

describe("AdvancedModulesPanel account continuations", () => {
  it.each(["redeem", "install", "uninstall"])("retains current-account %s success feedback", async (operation) => {
    if (operation === "uninstall") {
      mocks.fetch.mockResolvedValueOnce({ unlocked: ["study"], installed: ["study"] });
      await switchAccount("owner-a");
    }
    vi.spyOn(APP_MODULES.study, "prefetch").mockResolvedValue(undefined);
    mocks.fetch.mockResolvedValueOnce({ unlocked: ["study"], installed: operation === "uninstall" ? [] : ["study"], newly_unlocked: ["study"] });
    openPanel();
    if (operation === "redeem") {
      fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "CODE" } });
      fireEvent.click(screen.getByTestId("modules-code-submit"));
    } else fireEvent.click(screen.getByTestId("module-toggle-study"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith(operation === "redeem"
      ? "1 section(s) installed" : operation === "install" ? "Installed" : "Removed — your data is kept"));
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each(["redeem", "install", "uninstall"])("suppresses stale %s success and preserves B state, permissions, cache and input", async (operation) => {
    if (operation === "uninstall") {
      mocks.fetch.mockResolvedValueOnce({ unlocked: ["study"], installed: ["study"] });
      await switchAccount("owner-a");
    }
    openPanel();
    const pending = deferred<unknown>();
    mocks.fetch.mockReturnValueOnce(pending.promise);
    const calls = mocks.fetch.mock.calls.length;
    if (operation === "redeem") {
      fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "A-CODE" } });
      fireEvent.click(screen.getByTestId("modules-code-submit"));
    } else fireEvent.click(screen.getByTestId("module-toggle-study"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(calls + 1));
    await switchAccount("owner-b");
    fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "B-CODE" } });
    const bCache = localStorage.getItem("arshnaz:modules:owner-b");
    const bState = getModulesState();
    await act(async () => {
      pending.resolve({ unlocked: ["mind"], installed: ["mind"], newly_unlocked: ["mind"], is_admin: true, is_owner: true });
      await pending.promise;
    });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(getModulesState()).toBe(bState);
    expect(localStorage.getItem("arshnaz:modules:owner-b")).toBe(bCache);
    expect(screen.queryByTestId("module-admin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("module-row-mind")).not.toBeInTheDocument();
    expect(screen.getByTestId("modules-code-input")).toHaveValue("B-CODE");
    expect(screen.getByTestId("modules-code-submit")).not.toBeDisabled();
  });

  it("suppresses stale errors and does not clear B's newer busy operation", async () => {
    openPanel();
    const a = deferred<unknown>();
    mocks.fetch.mockReturnValueOnce(a.promise);
    fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "A-CODE" } });
    fireEvent.click(screen.getByTestId("modules-code-submit"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await switchAccount("owner-b");
    const b = deferred<unknown>();
    mocks.fetch.mockReturnValueOnce(b.promise);
    fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "B-CODE" } });
    fireEvent.click(screen.getByTestId("modules-code-submit"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
    await act(async () => { a.reject(new Error("old account error")); await a.promise.catch(() => undefined); });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(screen.getByTestId("modules-code-submit")).toBeDisabled();
    await act(async () => {
      b.resolve({ unlocked: ["study"], installed: [], newly_unlocked: [] });
      await b.promise;
    });
    expect(mocks.success).toHaveBeenCalledWith("Nothing new was unlocked");
    expect(screen.getByTestId("modules-code-input")).toHaveValue("");
  });

  it("suppresses success when switching away and back during module prefetch", async () => {
    openPanel();
    const prefetch = deferred<unknown>();
    const spy = vi.spyOn(APP_MODULES.study, "prefetch").mockReturnValue(prefetch.promise);
    mocks.fetch.mockResolvedValueOnce({ unlocked: ["study"], installed: ["study"], newly_unlocked: ["study"] });
    fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "A-CODE" } });
    fireEvent.click(screen.getByTestId("modules-code-submit"));
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    await switchAccount("owner-b");
    await switchAccount("owner-a");
    await act(async () => { prefetch.resolve(undefined); await prefetch.promise; });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("suppresses success after unmount", async () => {
    const view = openPanel();
    const pending = deferred<unknown>();
    mocks.fetch.mockReturnValueOnce(pending.promise);
    fireEvent.change(screen.getByTestId("modules-code-input"), { target: { value: "A-CODE" } });
    fireEvent.click(screen.getByTestId("modules-code-submit"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    view.unmount();
    await act(async () => { pending.resolve({ unlocked: [], installed: [], newly_unlocked: [] }); await pending.promise; });
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
