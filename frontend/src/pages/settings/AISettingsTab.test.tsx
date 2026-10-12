import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), clear: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@/lib/ai", () => ({ setAILanguage: vi.fn(), getAILanguage: () => "en" }));
vi.mock("@/lib/aiSettings", () => ({
  saveAISettings: mocks.save, clearAllStoredAIKeys: mocks.clear, loadAISettings: () => ({}),
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
  beforeEach(() => { mocks.save.mockReset(); mocks.clear.mockReset(); });
  it.each(["common.reset", "settings.clearAllOverrides", "Remove all locally stored AI keys", "Set as default everywhere", "settings.applyRecommendedToAll"])("cancel leaves configuration and keys unchanged: %s", (name) => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("confirmed bulk strategy changes keep custom configurations and keys", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Set as default everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ perOp: initial.perOp, useRecommended: false }));
  });
});
