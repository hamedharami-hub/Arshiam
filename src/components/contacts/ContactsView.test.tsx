import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactEditorDialog } from "./ContactEditorDialog";
import { ContactDetailDialog } from "./ContactDetailDialog";
import { DeviceContactImportModal } from "./DeviceContactImportModal";
import { ContactPickerModal } from "./ContactPickerModal";
import type { Contact } from "@/lib/contactTypes";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/contactService", () => ({
  createContact: vi.fn().mockImplementation((userId, data) =>
    Promise.resolve({ id: "mock-new-id", user_id: userId, ...data, created_at: new Date().toISOString() })
  ),
  updateContact: vi.fn().mockResolvedValue({}),
  deleteContact: vi.fn().mockResolvedValue(undefined),
  getContacts: vi.fn().mockResolvedValue([]),
  getContact: vi.fn().mockResolvedValue(null),
  getContactTasks: vi.fn().mockResolvedValue([]),
  getTaskContacts: vi.fn().mockResolvedValue([]),
  unlinkTaskContact: vi.fn().mockResolvedValue(undefined),
  findDuplicateSuggestions: vi.fn().mockResolvedValue([]),
  uploadContactPhoto: vi.fn().mockResolvedValue("https://example.com/photo.jpg"),
}));

describe("Contacts Responsive UI & Modals", () => {
  const userId = "user-test-456";
  const dummyContact: Contact = {
    id: "contact-1",
    user_id: userId,
    display_name: "Sara Ahmadi",
    phones: [{ label: "موبایل", value: "09121112233" }],
    emails: [{ label: "کاری", value: "sara@work.com" }],
    created_at: new Date().toISOString(),
    source: "manual",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("ContactEditorDialog responsive presentation", () => {
    it("renders inside bounded Dialog on Windows / Desktop / Foldable", () => {
      localStorage.setItem("arshnaz_nav_mode", "windows");

      render(
        <ContactEditorDialog
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
          contact={dummyContact}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).toContain("max-w-md");
      expect(dialog.className).toContain("max-h-[75vh]");
      expect(dialog.className).not.toContain("rounded-t-2xl");
    });

    it("renders inside bottom Sheet on Phone", () => {
      localStorage.setItem("arshnaz_nav_mode", "phone");

      render(
        <ContactEditorDialog
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
          contact={dummyContact}
        />
      );

      const sheet = screen.getByRole("dialog");
      expect(sheet).toBeInTheDocument();
      expect(sheet.className).toContain("rounded-t-2xl");
      expect(sheet.className).toContain("max-h-[85vh]");
    });
  });

  describe("ContactDetailDialog responsive presentation", () => {
    it("renders inside bounded Dialog on Windows", () => {
      localStorage.setItem("arshnaz_nav_mode", "windows");

      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
          contact={dummyContact}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).toContain("max-w-md");
      expect(dialog.className).toContain("max-h-[75vh]");
    });

    it("renders inside bottom Sheet on Phone", () => {
      localStorage.setItem("arshnaz_nav_mode", "phone");

      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
          contact={dummyContact}
        />
      );

      const sheet = screen.getByRole("dialog");
      expect(sheet).toBeInTheDocument();
      expect(sheet.className).toContain("rounded-t-2xl");
    });
  });

  describe("DeviceContactImportModal platform limitation notice", () => {
    it("renders informative notice on Web/Windows when device import is unsupported", () => {
      localStorage.setItem("arshnaz_nav_mode", "windows");

      render(
        <DeviceContactImportModal
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
        />
      );

      // In non-Android environments, shows the Android limitation note
      expect(screen.getByText(/فقط در نسخهٔ Android|Only available on Android/i)).toBeInTheDocument();
      expect(
        screen.getByText(/برنامهٔ اندروید ARSHNAZ|Android ARSHNAZ app/i)
      ).toBeInTheDocument();
    });
  });

  describe("ContactPickerModal functionality", () => {
    it("renders contact search and custom role input", async () => {
      const { getContacts } = await import("@/lib/contactService");
      vi.mocked(getContacts).mockResolvedValueOnce([dummyContact]);

      render(
        <ContactPickerModal
          open={true}
          onOpenChange={vi.fn()}
          userId={userId}
          taskId="task-xyz"
        />
      );

      expect(await screen.findByText("Sara Ahmadi")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/مسئول پیگیری|Follow-up/i)).toBeInTheDocument();
    });
  });
});
