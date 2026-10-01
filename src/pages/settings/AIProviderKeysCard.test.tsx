import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderKeysCard } from "./AIProviderKeysCard";
import { getProviderKey } from "@/lib/aiProviders";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("AIProviderKeysCard", () => {
  it("saves a key per provider, masks it, and deletes it", () => {
    render(<AIProviderKeysCard isEn />);
    fireEvent.change(screen.getByTestId("ai-key-input-anthropic"), { target: { value: "sk-ant-secret-value-7777" } });
    fireEvent.click(screen.getByTestId("ai-key-save-anthropic"));
    expect(getProviderKey("anthropic")).toBe("sk-ant-secret-value-7777");
    expect(screen.getByTestId("ai-key-mask-anthropic")).toHaveTextContent(/^sk-•+7777$/);
    expect(screen.getByTestId("ai-key-mask-openai")).toHaveTextContent("No key saved");
    fireEvent.click(screen.getByTestId("ai-key-delete-anthropic"));
    expect(getProviderKey("anthropic")).toBe("");
    expect(screen.getByTestId("ai-key-mask-anthropic")).toHaveTextContent("No key saved");
  });
  it("shows a clear message for an invalid key and for exhausted quota", async () => {
    render(<AIProviderKeysCard isEn />);
    fireEvent.change(screen.getByTestId("ai-key-input-openai"), { target: { value: "bad-key" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "" }));
    fireEvent.click(screen.getByTestId("ai-key-test-openai"));
    await waitFor(() => expect(screen.getByTestId("ai-key-result-openai")).toHaveTextContent("invalid or lacks access"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "" }));
    fireEvent.click(screen.getByTestId("ai-key-test-openai"));
    await waitFor(() => expect(screen.getByTestId("ai-key-result-openai")).toHaveTextContent("quota or credit is exhausted"));
  });
  it("reports a valid key with a retired selected model and names the replacement", async () => {
    render(<AIProviderKeysCard isEn />);
    fireEvent.change(screen.getByTestId("ai-key-input-openai"), { target: { value: "sk-valid" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ id: "gpt-4o" }] }) }));
    fireEvent.click(screen.getByTestId("ai-key-test-openai"));
    await waitFor(() => expect(screen.getByTestId("ai-key-result-openai")).toHaveTextContent("gpt-5-mini"));
  });
});
