import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import ChatGPTConnectView from "./ChatGPTConnectView";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "u", getIdToken: async () => "firebase-session" } } }));
beforeEach(() => { vi.restoreAllMocks(); });
it("shows exact permissions and disables consent for unsupported scopes", () => {
  render(<MemoryRouter initialEntries={["/app/connect/chatgpt?scope=diary:read"]}><ChatGPTConnectView /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Allow and connect" })).toBeDisabled();
  expect(screen.getByText("diary:read")).toBeInTheDocument();
});
it("submits consent only explicitly and displays a rejected OAuth request without redirect", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "invalid_client" }) } as Response);
  render(<MemoryRouter initialEntries={["/app/connect/chatgpt?scope=tasks:read&client_id=test"]}><ChatGPTConnectView /></MemoryRouter>);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Allow and connect" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("invalid_client");
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/oauth?action=consent"), expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer firebase-session" }) }));
});
