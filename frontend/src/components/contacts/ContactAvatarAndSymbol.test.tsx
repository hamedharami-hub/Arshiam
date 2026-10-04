import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactAvatar } from "./ContactAvatar";
import { ContactSymbolPicker } from "./ContactSymbolPicker";
import { createContact, updateContact } from "@/lib/contactService";
import type { Contact } from "@/lib/contactTypes";

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

vi.mock("@/lib/firestoreSync", () => ({
  saveEntityToFirestore: vi.fn().mockResolvedValue(true),
  deleteEntityFromFirestore: vi.fn().mockResolvedValue(true),
}));

describe("Contact Shape and Symbol Feature", () => {
  describe("contactService persistence for avatar_icon, avatar_color, avatar_shape", () => {
    it("creates contact with custom shape, symbol, and color", async () => {
      const contact = await createContact("test-user-id", {
        display_name: "Dr. Alavi",
        avatar_icon: "stethoscope",
        avatar_color: "emerald",
        avatar_shape: "hexagon",
      });

      expect(contact.id).toBeDefined();
      expect(contact.display_name).toBe("Dr. Alavi");
      expect(contact.avatar_icon).toBe("stethoscope");
      expect(contact.avatar_color).toBe("emerald");
      expect(contact.avatar_shape).toBe("hexagon");
    });

    it("updates contact shape and symbol", async () => {
      const contact = await createContact("test-user-id", {
        display_name: "Sara Tech",
        avatar_icon: "laptop",
        avatar_shape: "circle",
      });

      const updated = await updateContact(contact.id, "test-user-id", {
        avatar_icon: "briefcase",
        avatar_color: "purple",
        avatar_shape: "rounded",
      });

      expect(updated.avatar_icon).toBe("briefcase");
      expect(updated.avatar_color).toBe("purple");
      expect(updated.avatar_shape).toBe("rounded");
    });
  });

  describe("ContactAvatar component", () => {
    it("renders initials and default shape when no symbol is provided", () => {
      render(<ContactAvatar name="Maryam Rad" size="md" />);
      expect(screen.getByText("Ma")).toBeInTheDocument();
    });

    it("renders custom emoji when avatar_icon is an emoji string", () => {
      render(
        <ContactAvatar
          name="Amir"
          avatarIcon="👨‍⚕️"
          avatarColor="blue"
          avatarShape="square"
          size="lg"
        />
      );
      expect(screen.getByText("👨‍⚕️")).toBeInTheDocument();
    });

    it("applies the selected geometric shape class", () => {
      const { container: hexContainer } = render(
        <ContactAvatar name="Test" avatarShape="hexagon" />
      );
      expect(hexContainer.querySelector("[class*='clip-path']")).toBeTruthy();

      const { container: roundedContainer } = render(
        <ContactAvatar name="Test" avatarShape="rounded" />
      );
      expect(roundedContainer.querySelector(".rounded-2xl")).toBeTruthy();
    });

    it("applies the selected color theme classes", () => {
      const { container } = render(
        <ContactAvatar name="Test" avatarColor="emerald" />
      );
      expect(container.querySelector(".bg-emerald-500\\/15")).toBeTruthy();
    });
  });

  describe("ContactSymbolPicker interactions", () => {
    it("allows switching tabs and selecting a symbol, shape, and color", () => {
      const onChangeIcon = vi.fn();
      const onChangeShape = vi.fn();
      const onChangeColor = vi.fn();

      render(
        <ContactSymbolPicker
          displayName="Ali"
          avatarIcon="briefcase"
          avatarColor="blue"
          avatarShape="circle"
          onChangeIcon={onChangeIcon}
          onChangeColor={onChangeColor}
          onChangeShape={onChangeShape}
        />
      );

      // Verify symbol tab is open initially and emojis are displayed
      expect(screen.getByText("نماد و اموجی")).toBeInTheDocument();
      const starEmojiBtn = screen.getByText("⭐️");
      fireEvent.click(starEmojiBtn);
      expect(onChangeIcon).toHaveBeenCalledWith("⭐️");

      // Switch to Shape tab
      const shapeTab = screen.getByText("شکل کادر");
      fireEvent.click(shapeTab);
      expect(screen.getByText("شش‌ضلعی")).toBeInTheDocument();
      fireEvent.click(screen.getByText("شش‌ضلعی"));
      expect(onChangeShape).toHaveBeenCalledWith("hexagon");

      // Switch to Color tab
      const colorTab = screen.getByText("رنگ");
      fireEvent.click(colorTab);
      expect(screen.getByText("بنفش")).toBeInTheDocument();
      fireEvent.click(screen.getByText("بنفش"));
      expect(onChangeColor).toHaveBeenCalledWith("purple");
    });
  });
});
