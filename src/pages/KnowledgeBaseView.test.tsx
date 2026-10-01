import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import KnowledgeBaseView from "./KnowledgeBaseView";
import { getPharmacyImportStatus, importPharmacyKnowledge } from "@/lib/pharmacyImportService";
import { getKnowledgeFolders, deleteKnowledgeDocument, KnowledgeDocumentDeletionError } from "@/lib/knowledgeService";
import { toast } from "sonner";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";

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

vi.mock("@/lib/pharmacyImportService", () => ({
  getPharmacyImportStatus: vi.fn().mockResolvedValue({
    foldersTotal: 34, docsTotal: 362, cardsTotal: 35,
    foldersMissing: 0, docsMissing: 0, docsUpgradeable: 0, cardsMissing: 0, cardsUpgradeable: 0, legacyDetected: false,
  }),
  importPharmacyKnowledge: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn().mockReturnValue("pharmacy-import-toast"),
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

const mockDocs: KnowledgeDocument[] = [
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
    }, { timeout: 10000 });
    expect(getPharmacyImportStatus).not.toHaveBeenCalled();
  });

  it("does not remove a lesson or report success when its delete was not confirmed", async () => {
    mockIsEn = true;
    vi.mocked(deleteKnowledgeDocument).mockResolvedValueOnce(false);

    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.keyDown(await screen.findByTestId("knowledge-more-menu"), { key: "Enter" });
    fireEvent.click(await screen.findByTestId("knowledge-delete"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(deleteKnowledgeDocument).toHaveBeenCalledWith(mockUser.id, "doc-1");
      expect(screen.getAllByText("Fluoxetine Guide").length).toBeGreaterThan(0);
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalledWith("Document deleted");
    });
  });

  it("explains that a lesson linked to tasks must be unlinked before deletion", async () => {
    mockIsEn = true;
    vi.mocked(deleteKnowledgeDocument).mockRejectedValueOnce(
      new KnowledgeDocumentDeletionError("linked-tasks", 0, 2),
    );

    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.keyDown(await screen.findByTestId("knowledge-more-menu"), { key: "Enter" });
    fireEvent.click(await screen.findByTestId("knowledge-delete"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("This lesson is linked to 2 tasks. Unlink it from the task first.");
      expect(screen.getAllByText("Fluoxetine Guide").length).toBeGreaterThan(0);
    });
  });

  it("loads the pharmacy source importer only after the user explicitly installs it", async () => {
    vi.mocked(importPharmacyKnowledge).mockResolvedValue({
      foldersCount: 0,
      docsCount: 0,
      cardsCount: 0,
      docsUpdated: 0,
      cardsUpdated: 0,
      status: {
        foldersTotal: 34,
        docsTotal: 432,
        cardsTotal: 35,
        foldersMissing: 0,
        docsMissing: 0,
        docsUpgradeable: 0,
        cardsMissing: 0,
        cardsUpgradeable: 0,
        legacyDetected: false,
      },
    });

    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "نصب" }));

    await waitFor(() => {
      expect(importPharmacyKnowledge).toHaveBeenCalledWith(mockUser.id, { importCards: true });
      expect(screen.queryByRole("button", { name: "نصب" })).not.toBeInTheDocument();
    });
    expect(getPharmacyImportStatus).not.toHaveBeenCalled();
  });

  it("study mode hides the desktop topic column and persists, Escape leaves it", async () => {
    localStorage.removeItem("knowledge_study_mode"); localStorage.removeItem("knowledge_sidebar_collapsed");
    render(
      <MemoryRouter initialEntries={["/app/knowledge?docId=" + mockDocs[0].id]}>
        <Routes><Route path="/app/knowledge" element={<KnowledgeBaseView />} /></Routes>
      </MemoryRouter>
    );
    const sidebar = await screen.findByTestId("knowledge-desktop-sidebar");
    const toggle = await screen.findByTestId("knowledge-study-mode-toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(sidebar).toHaveAttribute("aria-hidden", "true");
    expect(localStorage.getItem("knowledge_study_mode")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("knowledge_study_mode")).toBe("false");
  });

  it("keeps documents visible and ancestor expansion bounded for malformed folder links", async () => {
    currentFolders = [
      { ...mockFolders[0], id: "folder-a", parent_id: "folder-b", name: "Folder A" },
      { ...mockFolders[0], id: "folder-b", parent_id: "folder-a", name: "Folder B" },
    ];
    currentDocs = [
      { ...mockDocs[0], id: "doc-cycle", folder_id: "folder-b", title: "Cycle lesson" },
      { ...mockDocs[0], id: "doc-orphan", folder_id: "missing-folder", title: "Orphan lesson" },
    ];

    render(
      <MemoryRouter initialEntries={["/app/knowledge"]}>
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Folder A")).toBeInTheDocument();
    expect(screen.getAllByText("Folder B").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("اسناد بدون فولدر یا با فولدر ناموجود")).toBeInTheDocument();
    expect(screen.getAllByText("Orphan lesson").length).toBeGreaterThanOrEqual(2);
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

  it("opens linked documents in a large reader overlay with a back stack", async () => {
    currentDocs = [
      { ...mockDocs[0], preferred_language: "fa", content_html: '<p data-doc-link="doc-2">باز کردن سند دوم</p>' },
      {
        ...mockDocs[0], id: "doc-2", title: "سند دوم", title_en: "Second document", preferred_language: "fa",
        content_html: "<p>متن سند دوم</p>", content_en: '<p data-doc-link="doc-3">Open third document</p>', tags: ["SSRI"],
      },
      { ...mockDocs[0], id: "doc-3", title: "سند سوم", title_en: "Third document", content_html: "<p>متن سند سوم</p>", content_en: "<p>Third source text</p>" },
    ];

    let browserBack: (() => void) | undefined;
    const HistoryProbe = () => {
      const location = useLocation();
      const navigate = useNavigate();
      browserBack = () => navigate(-1);
      return <><output data-testid="knowledge-url">{location.search}</output>
      </>;
    };

    render(
      <MemoryRouter initialEntries={["/app/tasks", "/app/knowledge"]} initialIndex={1}>
        <HistoryProbe />
        <Routes>
          <Route path="/app/knowledge" element={<KnowledgeBaseView />} />
          <Route path="/app/tasks" element={<h1>Tasks route</h1>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /زبان مطالعه: انگلیسی/ }));
    await screen.findByText("باز کردن سند دوم");
    fireEvent.click(screen.getByText("باز کردن سند دوم"));
    await waitFor(() => {
      expect(screen.getByTestId("knowledge-url")).toHaveTextContent("");
      expect(screen.getByRole("dialog", { name: "Second document" })).toBeInTheDocument();
      expect(screen.getByTestId("knowledge-linked-document-dialog")).toHaveClass("sm:w-[94vw]");
    });

    fireEvent.click(screen.getByText("Open third document"));
    await waitFor(() => {
      expect(screen.getByTestId("knowledge-url")).toHaveTextContent("");
      expect(screen.getByRole("dialog", { name: "Third document" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "بازگشت به سند قبلی" }));
    expect(await screen.findByRole("dialog", { name: "Second document" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "بازگشت به سند قبلی" }));
    await waitFor(() => expect(screen.queryByTestId("knowledge-linked-document-dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "راهنمای فلوکستین", level: 1 })).toBeInTheDocument();

    fireEvent.click(screen.getByText("باز کردن سند دوم"));
    expect(await screen.findByRole("dialog", { name: "Second document" })).toBeInTheDocument();
    await act(async () => browserBack?.());
    await waitFor(() => expect(screen.queryByTestId("knowledge-linked-document-dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "راهنمای فلوکستین", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tasks route" })).not.toBeInTheDocument();
  }, 30000);
});


describe("Knowledge loading and navigation recovery", () => {
  beforeEach(() => {
    mockIsEn = true;
    currentFolders = [...mockFolders];
    currentDocs = [...mockDocs];
    vi.clearAllMocks();
  });

  it("shows a retry action after a load failure and recovers the lesson", async () => {
    vi.mocked(getKnowledgeFolders).mockRejectedValueOnce(new Error("Network unavailable"));
    render(<MemoryRouter><KnowledgeBaseView /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Lessons could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect((await screen.findAllByText("Fluoxetine Guide")).length).toBeGreaterThan(0);
  });

  it("reports an unavailable deep-linked lesson instead of displaying another lesson", async () => {
    render(<MemoryRouter initialEntries={["/app/knowledge?docId=missing"]}><KnowledgeBaseView /></MemoryRouter>);
    expect(await screen.findByText("This lesson is unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open library" }));
    expect((await screen.findAllByText("Fluoxetine Guide")).length).toBeGreaterThan(0);
  });

  it("lets a deep-linked reader reopen its desktop chapters sidebar", async () => {
    render(<MemoryRouter initialEntries={["/app/knowledge?docId=doc-1"]}><KnowledgeBaseView /></MemoryRouter>);
    const toggle = await screen.findByTitle("Show Chapters Sidebar (Ctrl+B)");
    fireEvent.click(toggle);
    expect(await screen.findByTitle("Hide Chapters Sidebar (Ctrl+B)")).toBeInTheDocument();
  });
});
