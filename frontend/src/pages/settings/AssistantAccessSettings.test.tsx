import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantAccessSettings } from "./AssistantAccessSettings";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { getIdToken: async () => "owner-session" } } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

describe("AssistantAccessSettings", () => {
  it("shows connection failure rather than claiming there are no tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>app</html>", { headers: { "Content-Type": "text/html" } })));
    render(<AssistantAccessSettings />);
    expect(await screen.findByRole("alert")).toHaveTextContent("API is deployed");
    expect(screen.queryByText("No agent access tokens have been created yet.")).not.toBeInTheDocument();
  });

  it("uses the same remote server for listing, creating tokens and the copied API URL", async () => {
    const fetchMock = vi.fn().mockImplementation((_url, options) => Promise.resolve(new Response(JSON.stringify(options?.method === "POST" ? { token: "test-token", data: {} } : { data: [] }), { headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantAccessSettings />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("https://arshiam.vercel.app/api/assistant-access");
    expect(screen.getByText("https://arshiam.vercel.app/api/v1/agent")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("e.g. My Personal AI Agent"), { target: { value: "Codex" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Agent Token" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => url === "https://arshiam.vercel.app/api/assistant-access" && options?.method === "POST")).toBe(true));
    expect(await screen.findByDisplayValue("test-token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download OpenAPI" })).toBeInTheDocument();
  });
});
