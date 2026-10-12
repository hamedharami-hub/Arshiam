import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LinkDialog } from "./LinkDialog";
import { LanguageSwitcher, LanguageToggle } from "./LanguageSwitcher";
import { AILangToggle } from "./AILangToggle";
import { SettingRow } from "@/pages/settings/SectionCard";
import { changeLanguage } from "@/i18n";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/i18n", () => ({ changeLanguage: vi.fn() }));

describe("settings and dialog accessibility", () => {
  it("associates invalid link input with its announced error", () => {
    render(<LinkDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const input = screen.getByRole("textbox", { name: "Link address" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", screen.getByRole("alert").id);
    fireEvent.change(input, { target: { value: "https://example.com" } });
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it.each([LanguageToggle, LanguageSwitcher])("provides one radio tab stop and arrow-key selection", (Component) => {
    render(<Component />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map(r => r.tabIndex)).toEqual([-1, 0]);
    radios[1].focus();
    fireEvent.keyDown(radios[1], { key: "ArrowLeft" });
    expect(radios[0]).toHaveFocus();
    expect(changeLanguage).toHaveBeenCalledWith("fa");
  });

  it("names the AI language selector", () => {
    render(<AILangToggle value="auto" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: /AI response language/ })).toBeInTheDocument();
  });

  it("uses a labelled group safely for arbitrary setting children", () => {
    render(<SettingRow label="Zoom" help="Choose your zoom"><button>Reset</button><button>Increase</button></SettingRow>);
    expect(screen.getByRole("group", { name: "Zoom" })).toHaveAccessibleDescription("Choose your zoom");
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(document.querySelector("label")).toBeNull();
  });

  it("offers explicit label/control and help association through its render API", () => {
    render(<SettingRow label="Size" help="Pick a size" controlId="size">{props => <input {...props} />}</SettingRow>);
    const input = screen.getByRole("textbox", { name: "Size" });
    expect(input).toHaveAccessibleDescription("Pick a size");
    expect(screen.getByText("Size")).toHaveAttribute("for", "size");
  });
});
