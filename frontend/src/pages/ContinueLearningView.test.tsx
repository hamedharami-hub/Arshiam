import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ContinueLearningView from "./ContinueLearningView";
import { getLastStudy, recordLastStudy } from "@/lib/lastStudy";

const { docs, sync } = vi.hoisted(() => ({ docs: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeDocument: (...a: unknown[]) => docs(...a) }));
vi.mock("@/lib/lastStudy", async () => ({ ...(await vi.importActual<object>("@/lib/lastStudy")), syncLastStudy: (...args: unknown[]) => sync(...args) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true, lang: "en" }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
const renderPage = () => render(<MemoryRouter><ContinueLearningView /></MemoryRouter>);
beforeEach(() => {
  localStorage.clear(); docs.mockReset(); sync.mockReset();
  docs.mockResolvedValue({ id: "doc-1" }); sync.mockImplementation((uid: string) => Promise.resolve(getLastStudy(uid)));
});
describe("Continue Knowledge learning after old modules retire", () => {
  it("keeps the library and excludes retired entrypoints in the empty state", async () => {
    renderPage();
    expect(await screen.findByTestId("continue-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("continue-due")).not.toBeInTheDocument();
    expect(screen.queryByTestId("continue-fred")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/app/knowledge");
  });
  it("preserves the last Knowledge source and ignores retired practice state", async () => {
    recordLastStudy("guest", { docId: "doc-1", title: "Doc", titleEn: "Study notes" });
    localStorage.setItem("arshnaz:fred-progress:v2:guest", JSON.stringify({ label: { status: "learning" } }));
    renderPage();
    expect(await screen.findByText("Study notes")).toHaveAttribute("dir", "auto");
    expect(screen.queryByTestId("continue-fred")).not.toBeInTheDocument();
    expect(screen.queryByTestId("continue-due-count")).not.toBeInTheDocument();
  });
  it("shows a missing source without a dead link", async () => {
    recordLastStudy("guest", { docId: "gone", title: "Gone" }); docs.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByTestId("continue-last-missing")).toHaveTextContent("no longer exists");
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole("link", { name: "Gone" })).not.toBeInTheDocument();
  });
  it("waits for the shared Knowledge last-study sync", () => {
    sync.mockReturnValue(new Promise(() => undefined)); renderPage();
    expect(screen.getByTestId("continue-loading")).toBeInTheDocument();
  });
  it("retries failed shared Knowledge sync", async () => {
    sync.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null); renderPage();
    fireEvent.click(await screen.findByTestId("continue-retry"));
    await waitFor(() => expect(screen.queryByTestId("continue-error")).not.toBeInTheDocument());
    expect(sync).toHaveBeenCalledTimes(2);
  });
});
