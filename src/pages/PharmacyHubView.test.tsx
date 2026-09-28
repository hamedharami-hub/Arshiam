import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { KnowledgeFolder } from "@/lib/knowledgeTypes";
import PharmacyHubView from "./PharmacyHubView";

const { getFoldersMock } = vi.hoisted(() => ({ getFoldersMock: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-123" } }) }));
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }),
}));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeFolders: getFoldersMock }));

function folder(id: string, parent_id: string | null, name: string, position: number): KnowledgeFolder {
  return { id, parent_id, name, position, user_id: "user-123", created_at: "", updated_at: "" };
}

describe("PharmacyHubView", () => {
  it("shows saved disease and medicine folders and keeps practice shortcuts within Pharmacy", async () => {
    getFoldersMock.mockResolvedValueOnce([
      folder("folder-pharmacy-root", null, "Pharmacy Knowledge", 1),
      folder("diseases", "folder-pharmacy-root", "Diseases", 2),
      folder("respiratory", "diseases", "Respiratory", 3),
      folder("medicines", "folder-pharmacy-root", "Medicines", 4),
    ]);

    render(
      <MemoryRouter initialEntries={["/app/pharmacy"]}>
        <Routes>
          <Route path="/app/pharmacy" element={<PharmacyHubView />} />
          <Route path="/app/pharmacy-cyp" element={<p>CYP destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("link", { name: /Diseases/ })).toHaveAttribute("href", "/app/knowledge?folderId=diseases"));
    expect(screen.getByRole("link", { name: /Respiratory/ })).toHaveAttribute("href", "/app/knowledge?folderId=respiratory");
    expect(screen.getByRole("link", { name: /Medicines/ })).toHaveAttribute("href", "/app/knowledge?folderId=medicines");
    expect(screen.getByRole("link", { name: /Browse all folders and lessons/ })).toHaveAttribute("href", "/app/knowledge?folderId=folder-pharmacy-root");
    expect(screen.getByTestId("pharmacy-shortcuts")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pharm-shortcut-cyp"));
    expect(screen.getByText("CYP destination")).toBeInTheDocument();
  });
});
