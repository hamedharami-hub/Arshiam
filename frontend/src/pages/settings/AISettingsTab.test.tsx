import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), clear: vi.fn(), load: vi.fn(), language: vi.fn(), success: vi.fn(), pushUndo: vi.fn(), auth: { currentUser: { uid: "owner-a" } as { uid: string } | null }, authListener: undefined as ((user: { uid: string } | null) => void) | undefined }));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: (_auth: unknown, callback: (user: { uid: string } | null) => void) => { mocks.authListener = callback; return () => { mocks.authListener = undefined; }; } }));
vi.mock("@/lib/undoStack", () => ({ pushUndo: mocks.pushUndo }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn(), info: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@/lib/ai", () => ({ setAILanguage: mocks.language, getAILanguage: () => "en" }));
vi.mock("@/lib/aiSettings", () => ({
  saveAISettings: mocks.save, clearAllStoredAIKeys: mocks.clear, loadAISettings: mocks.load,
  defaultConfig: () => ({ provider: "openai", model: "test-model", apiKey: "" }),
  PROVIDER_INFO: { openai: { label: "OpenAI", models: ["test-model"], defaultModel: "test-model", baseUrl: "https://api.openai.com/v1", help: "" } },
  OPERATIONS: [{ key: "chat", group: "General", groupEn: "General", labelEn: "Chat" }],
  MODEL_DESCRIPTIONS: {}, OP_RECOMMENDED: { chat: { model: "test-model" } },
  resolveOpStrategy: (s: any, op: string) => s.opStrategies?.[op] || "global",
  resolveOpConfig: (s: any, op: string) => s.perOp[op] || s.default,
}));
vi.mock("@/lib/fetchModels", () => ({ fetchProviderModels: vi.fn(), getMergedModels: () => ["test-model"], getAllKnownModels: () => ["test-model"] }));
vi.mock("./AIProviderKeysCard", () => ({ AIProviderKeysCard: () => null }));
vi.mock("@/components/OfflineIntelligenceSettings", () => ({ OfflineIntelligenceSettings: () => null }));
import { AISettingsTab } from "./AISettingsTab";
import { defaultConfig, type AIPerOpSettings } from "@/lib/aiSettings";

const initial: AIPerOpSettings = { default: { ...defaultConfig(), apiKey: "private-key" }, perOp: { chat: { ...defaultConfig(), apiKey: "custom-key" } }, opStrategies: { chat: "custom" } };
function Harness() {
  const [settings, setSettings] = useState(initial);
  return <AISettingsTab settings={settings} setSettings={setSettings} lang="en" setLang={() => {}} isEn />;
}
describe("AI settings destructive changes", () => {
  beforeEach(() => {
    mocks.save.mockReset(); mocks.clear.mockReset(); mocks.success.mockReset(); mocks.load.mockReturnValue(initial);
    mocks.pushUndo.mockReset(); mocks.auth.currentUser = { uid: "owner-a" }; mocks.authListener = undefined;
    mocks.save.mockImplementation(next => mocks.load.mockReturnValue(next));
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());
  it.each(["common.reset", "settings.clearAllOverrides", "Remove all locally stored AI keys", "Set as default everywhere", "settings.applyRecommendedToAll"])("cancel leaves configuration and keys unchanged: %s", (name) => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.pushUndo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("confirmed bulk strategy changes keep custom configurations and keys", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ perOp: initial.perOp, useRecommended: false }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved on this device");
  });
  it("failed routine save keeps the previous configuration and does not claim success", () => {
    mocks.save.mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    render(<Harness />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "replacement-key" } });
    expect(input).toHaveValue("private-key");
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.pushUndo).not.toHaveBeenCalled();
  });
  it("failed bulk save leaves settings unchanged and can be retried", () => {
    mocks.save.mockImplementationOnce(() => { throw new Error("blocked"); });
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.pushUndo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved on this device");
  });
  it("does not report complete key removal when a checked storage removal fails", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Remove all locally stored AI keys" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("detects a silently failed language write instead of announcing a saved language", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("combobox")[0], { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "settings.persian" }));
    expect(mocks.language).toHaveBeenCalledWith("fa");
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each(["Set as default everywhere", "settings.applyRecommendedToAll"])("undoes only strategy fields and preserves newer configuration: %s", name => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    const entry = mocks.pushUndo.mock.calls[0][0];
    expect(entry.importance).toBe("bulk");
    const current = mocks.load();
    const newer = { ...current, default: { ...current.default, apiKey: "newer-private-key" }, perOp: {}, providerHiddenModels: { openai: ["hidden-model"] }, personalizationOptIn: true };
    mocks.load.mockReturnValue(newer);
    act(() => entry.undo());
    expect(mocks.save).toHaveBeenLastCalledWith({ ...newer, opStrategies: initial.opStrategies, useRecommended: undefined });
    expect(screen.getByPlaceholderText("sk-...")).toHaveValue("newer-private-key");
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1);
  });
  it.each(["opStrategies", "useRecommended"])("rejects undo after stored %s changes, even when visible settings are unchanged", field => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    const entry = mocks.pushUndo.mock.calls[0][0];
    mocks.load.mockReturnValue({ ...mocks.load(), ...(field === "opStrategies" ? { opStrategies: { chat: "recommended" } } : { useRecommended: true }) });
    expect(() => act(() => entry.undo())).toThrow("strategies changed");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("throws failed undo persistence to the stack and keeps the applied strategy available for retry", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    const entry = mocks.pushUndo.mock.calls[0][0];
    mocks.save.mockImplementationOnce(() => { throw new Error("storage-full"); });
    expect(() => act(() => entry.undo())).toThrow("storage-full");
    expect(mocks.load().opStrategies).toEqual({ chat: "global" });
    expect(mocks.success).not.toHaveBeenCalled();
    act(() => entry.undo());
    expect(mocks.load().opStrategies).toEqual(initial.opStrategies);
  });
  it.each(["unmount", "different owner", "owner switches away and back"])("rejects undo outside its mounted account session: %s", scenario => {
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    const entry = mocks.pushUndo.mock.calls[0][0];
    if (scenario === "unmount") view.unmount();
    else {
      mocks.auth.currentUser = { uid: "owner-b" };
      mocks.authListener?.(mocks.auth.currentUser);
      if (scenario === "owner switches away and back") {
        mocks.auth.currentUser = { uid: "owner-a" };
        mocks.authListener?.(mocks.auth.currentUser);
      }
    }
    expect(() => entry.undo()).toThrow("same Settings session and account");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it.each(["common.reset", "settings.clearAllOverrides", "Remove all locally stored AI keys"])("does not register credential-bearing destructive recovery: %s", name => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(mocks.pushUndo).not.toHaveBeenCalled();
  });
  it("does not register routine autosave recovery", () => {
    render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText("sk-..."), { target: { value: "new-key" } });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.pushUndo).not.toHaveBeenCalled();
  });
});
