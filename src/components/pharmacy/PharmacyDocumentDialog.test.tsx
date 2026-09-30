import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PharmacyDocumentDialog } from "./PharmacyDocumentDialog";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ lang: "en", T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeDocument: vi.fn() }));
vi.mock("@/lib/pharmacyImportService", () => ({
  getPharmacySeedDocument: async (id: string) => ({
    id, title: id === "source" ? "Source lesson" : "Linked lesson",
    content_html: id === "source"
      ? '<p>Keep the introduction warning.</p><h2>Interactions</h2><p>Original interaction text.</p><a data-doc-link="linked">Related lesson</a><h2>References</h2><p>Original reference text.</p>'
      : '<p>Linked original text.</p>',
  }),
}));

describe("PharmacyDocumentDialog", () => {
  it("uses section navigation and preserves lesson links and Back", async () => {
    render(<MemoryRouter><PharmacyDocumentDialog documentId="source" onClose={() => {}} /></MemoryRouter>);
    await screen.findByText("Original interaction text.");
    expect(screen.getByText("Keep the introduction warning.")).toBeInTheDocument();
    expect(screen.queryByText("Original reference text.")).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "References" }), { button: 0, ctrlKey: false });
    await screen.findByText("Original reference text.");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "All sections" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("Original interaction text.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Related lesson"));
    await screen.findByText("Linked original text.");
    fireEvent.click(screen.getByTestId("pharmacy-document-back-btn"));
    await screen.findByText("Original interaction text.");
    expect(screen.getByTestId("pharmacy-document-title")).toHaveTextContent("Source lesson");
  });
});
