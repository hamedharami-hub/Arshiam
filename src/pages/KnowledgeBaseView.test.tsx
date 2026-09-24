import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import KnowledgeBaseView from "./KnowledgeBaseView";

const mockUser = { id: "test-user-123", email: "test@example.com" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

let mockIsEn = false;
vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    T: (fa: string, en: string) => (mockIsEn ? en : fa),
    isEn: mockIsEn,
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockFolders = [
  {
    id: "f-1",
    user_id: "test-user-123",
    parent_id: null,
    name: "فولدر داروها",
    icon: "Pill",
    color: "#10b981",
    position: 1,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
  },
];

const mockDocs = [
  {
    id: "doc-1",
    user_id: "test-user-123",
    folder_id: "f-1",
    title: "راهنمای فلوکستین",
    title_en: "Fluoxetine Guide",
    content_html: "<h1>فلوکستین</h1><p>داروی ضد افسردگی SSRI</p>",
    content_en: "<h1>Fluoxetine</h1><p>SSRI antidepressant</p>",
    plain_text: "فلوکستین داروی ضد افسردگی SSRI",
    tags: ["SSRI", "Depression"],
    source_url: "",
    is_favorite: false,
    view_count: 0,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
  },
];

let currentFolders = [...mockFolders];
let currentDocs = [...mockDocs];

vi.mock("@/lib/knowledgeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/knowledgeService")>();
  return {
    ...actual,
    getKnowledgeFolders: vi.fn().mockImplementation(() => Promise.resolve([...currentFolders])),
    getKnowledgeDocuments: vi.fn().mockImplementation(() => Promise.resolve([...currentDocs])),
    createKnowledgeFolder: vi.fn().mockImplementation((userId, data) =>
      Promise.resolve({
        id: `f-${Date.now()}`,
        user_id: userId,
        parent_id: data.parent_id || null,
        name: data.name,
        icon: data.icon || "Folder",
        color: data.color || "#10b981",
        position: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),
    deleteKnowledgeFolder: vi.fn().mockResolvedValue(true),
    createKnowledgeDocument: vi.fn().mockImplementation((userId, data) =>
      Promise.resolve({
        id: `doc-${Date.now()}`,
        user_id: userId,
        folder_id: data.folder_id || null,
        title: data.title,
        content_html: data.content_html,
        plain_text: data.title,
        tags: data.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),
    updateKnowledgeDocument: vi.fn().mockImplementation((userId, docId, patch) =>
      Promise.resolve({ ...mockDocs[0], ...patch, id: docId })
    ),
    deleteKnowledgeDocument: vi.fn().mockResolvedValue(true),
  };
});

describe("KnowledgeBaseView (/app/knowledge) Page Verification", { timeout: 15000 }, () => {
  beforeEach(() => {
    mockIsEn = false;
    currentFolders = [...mockFolders];
    currentDocs = [...mockDocs];
    vi.clearAllMocks();
  });

  it("renders without crashing or throwing ReferenceError when documents exist", async () => {
    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("فولدر داروها").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("راهنمای فلوکستین").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders empty state cleanly without crashing when user has no documents", async () => {
    currentFolders = [];
    currentDocs = [];

    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("یک سند را انتخاب یا اضافه کنید")).toBeDefined();
    });
  });

  it("opens document editor modal when Add Document button is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("فولدر داروها").length).toBeGreaterThanOrEqual(1);
    });

    const addBtns = screen.getAllByRole("button", { name: /افزودن سند/i });
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });
});
