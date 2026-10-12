import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactEditorDialog } from "./ContactEditorDialog";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/hooks/useDeviceFormFactor", () => ({ useDeviceFormFactor: () => ({ prefersDialog: true }) }));
vi.mock("@/lib/contactService", () => ({ createContact: vi.fn(), updateContact: vi.fn(), uploadContactPhoto: vi.fn(), findDuplicateSuggestions: vi.fn() }));
vi.mock("./ContactOccasionsEditor", () => ({ ContactOccasionsEditor: () => null }));

describe("ContactEditorDialog field associations", () => {
  it("links identity, notes and repeated contact labels by ID, including display-name help", () => {
    render(<ContactEditorDialog open userId="user" onOpenChange={vi.fn()} initialValues={{ emails: [{ label: "Work", value: "work@example.com" }] }} />);
    const display = screen.getByRole("textbox", { name: "Display Name *" });
    expect(display).toHaveAccessibleDescription("Enter a display name, first and last name, or company.");
    for (const name of ["First Name", "Last Name", "Company", "Job Title / Role", "Phone label 1", "Phone number 1", "Email label 1", "Email address 1", "Notes"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input.id).not.toBe("");
      expect(Array.from(document.querySelectorAll("label")).some(label => label.htmlFor === input.id)).toBe(true);
    }
    expect(screen.getByRole("button", { name: "Remove phone 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove email 1" })).toBeInTheDocument();
  });
});
