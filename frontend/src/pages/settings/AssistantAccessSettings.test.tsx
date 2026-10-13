import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantAccessSettings } from "./AssistantAccessSettings";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { getIdToken: async () => "owner-session" } } }));
const owner = vi.hoisted(() => ({ id: "owner-1" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: owner.id } }) }));
beforeEach(() => { owner.id = "owner-1"; });
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

describe("AssistantAccessSettings", () => {
  it("never reveals an old owner's newly created secret after an account switch", async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation((_url, options) => options?.method === "POST" ? new Promise<Response>(done => { resolve = done; }) : Promise.resolve(new Response(JSON.stringify({ data: [] }), { headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<AssistantAccessSettings />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText("e.g. My Personal AI Agent"), { target: { value: "Owner one agent" } });
    fireEvent.click(screen.getByRole("button", { name: "Review & create token" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create token" }));
    await waitFor(() => expect(resolve).toBeDefined());
    owner.id = "owner-2";
    rerender(<AssistantAccessSettings />);
    await act(async () => resolve(new Response(JSON.stringify({ token: "old-owner-secret", data: {} }), { headers: { "Content-Type": "application/json" } })));
    expect(screen.queryByDisplayValue("old-owner-secret")).toBeNull();
    expect(screen.getByPlaceholderText("e.g. My Personal AI Agent")).toHaveValue("");
  });
  it("shows connection failure rather than claiming there are no tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>app</html>", { headers: { "Content-Type": "text/html" } })));
    render(<AssistantAccessSettings />);
    expect(await screen.findByRole("alert")).toHaveTextContent("API is deployed");
    expect(screen.queryByText("No agent access tokens have been created yet.")).not.toBeInTheDocument();
  });

  it("uses the same remote server for listing, creating tokens and the copied API URL", async () => {
    const fetchMock = vi.fn().mockImplementation((url, options) => Promise.resolve(new Response(JSON.stringify(url.endsWith("/me") ? { data: { scopes: ["tasks:read"] } } : options?.method === "POST" ? { token: "test-token", data: {} } : { data: [] }), { headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantAccessSettings />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("https://arshiam.vercel.app/api/assistant-access");
    expect(screen.getByText("https://arshiam.vercel.app/api/v1/agent")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("e.g. My Personal AI Agent"), { target: { value: "Codex" } });
    // Creating a token now goes through a plain-language review step before the request.
    fireEvent.click(screen.getByRole("button", { name: "Review & create token" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create token" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => url === "https://arshiam.vercel.app/api/assistant-access" && options?.method === "POST")).toBe(true));
    expect(await screen.findByDisplayValue("test-token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download OpenAPI" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test token connection" }));
    await screen.findByText(/Token connection verified/);
    expect(fetchMock).toHaveBeenCalledWith("https://arshiam.vercel.app/api/v1/agent/me", expect.objectContaining({ headers: { Authorization: "Bearer test-token" }, cache: "no-store" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide secret" }));
    expect(screen.queryByDisplayValue("test-token")).not.toBeInTheDocument();
  });
});
