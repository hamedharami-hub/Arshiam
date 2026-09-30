import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { KnowledgeFolder } from "@/lib/knowledgeTypes";
import PharmacyHubView from "./PharmacyHubView";

const { getFoldersMock, getDocumentsMock } = vi.hoisted(() => ({ getFoldersMock: vi.fn(), getDocumentsMock: vi.fn(() => Promise.resolve([])) }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-123" } }) }));
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }),
}));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeFolders: getFoldersMock, getKnowledgeDocuments: getDocumentsMock }));

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

    const diseases = await screen.findByRole("button", { name: /^Diseases/ });
    const medicines = screen.getByRole("button", { name: "Choose Medicines" });
    expect(diseases).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("pharmacy-subcategory-respiratory")).not.toBeInTheDocument();
    fireEvent.click(diseases);
    expect(diseases).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("pharmacy-subcategory-respiratory")).toBeInTheDocument();
    fireEvent.click(medicines);
    expect(screen.queryByTestId("pharmacy-category-diseases")).not.toBeInTheDocument();
    expect(medicines).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Choose Diseases" }));
    fireEvent.click(screen.getByTestId("pharmacy-subcategory-respiratory").querySelector("summary")!);
    expect(screen.getByTestId("pharmacy-subcategory-respiratory").querySelector("a")).toHaveAttribute("href", "/app/knowledge?folderId=respiratory");
    expect(screen.getByRole("link", { name: /Open Diseases folder/ })).toHaveAttribute("href", "/app/knowledge?folderId=diseases");
    expect(screen.getByRole("link", { name: /Full library/ })).toHaveAttribute("href", "/app/knowledge?folderId=folder-pharmacy-root");
    expect(screen.getByTestId("pharmacy-shortcuts")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pharm-shortcut-cyp"));
    expect(screen.getByText("CYP destination")).toBeInTheDocument();
  });

  it("separates earlier folders from the current category grid", async () => {
    getFoldersMock.mockResolvedValueOnce([
      folder("folder-pharmacy-root", null, "Pharmacy Knowledge", 1),
      folder("folder-pharmacy-diseases", "folder-pharmacy-root", "Older disease atlas", 2),
      folder("folder-pharmacy-cat-clinical-atlas", "folder-pharmacy-root", "Current disease atlas", 3),
    ]);
    render(<MemoryRouter><PharmacyHubView /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("button", { name: /^Current disease atlas/ })).toBeInTheDocument());
    expect(screen.getByText("Earlier and other collections (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Earlier and other collections (1)"));
    expect(screen.getByRole("link", { name: "Older disease atlas" })).toHaveAttribute(
      "href", "/app/knowledge?folderId=folder-pharmacy-diseases",
    );
  });

  it("filters by subcategory name without changing saved folders", async () => {
    getFoldersMock.mockResolvedValueOnce([
      folder("folder-pharmacy-root", null, "Pharmacy Knowledge", 1),
      folder("diseases", "folder-pharmacy-root", "Diseases", 2),
      folder("respiratory", "diseases", "Respiratory", 3),
      folder("medicines", "folder-pharmacy-root", "Medicines", 4),
    ]);
    render(<MemoryRouter><PharmacyHubView /></MemoryRouter>);
    await screen.findByRole("button", { name: /^Diseases/ });
    fireEvent.change(screen.getByRole("textbox", { name: "Search categories" }), { target: { value: "respiratory" } });
    expect(screen.getByRole("button", { name: /^Diseases/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Medicines/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: /^Medicines/ })).toBeInTheDocument();
  });
  it("opens matching lessons directly without expanding their folder", async () => {
    getFoldersMock.mockResolvedValueOnce([
      folder("diseases", "folder-pharmacy-root", "Diseases", 1),
      folder("respiratory", "diseases", "Respiratory", 2),
    ]);
    getDocumentsMock.mockResolvedValueOnce([{ id: "asthma", folder_id: "respiratory", title: "Asthma" }] as never[]);
    render(<MemoryRouter><PharmacyHubView /></MemoryRouter>);
    await screen.findByRole("button", { name: /^Diseases/ });
    fireEvent.change(screen.getByRole("textbox", { name: "Search categories" }), { target: { value: " asthma " } });
    expect(screen.getByRole("link", { name: "Asthma" })).toHaveAttribute("href", "/app/knowledge?docId=asthma");
    expect(screen.getByText("1 matching lessons")).toBeInTheDocument();
  });

});
