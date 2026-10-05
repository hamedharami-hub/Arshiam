import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import InstallPrompt from "./InstallPrompt";

let language = "en";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language } }) }));

beforeEach(() => {
  localStorage.clear();
  language = "en";
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

describe("InstallPrompt", () => {
  it("shows English copy and an accessible dismiss control when the app language is English", () => {
    render(<InstallPrompt />);
    act(() => window.dispatchEvent(new Event("beforeinstallprompt")));

    expect(screen.getByText("Install ARSHNAZ on your device")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss install prompt" }));
    expect(screen.queryByText("Install ARSHNAZ on your device")).not.toBeInTheDocument();
  });

  it("shows Persian copy when the app language is Persian", () => {
    language = "fa";
    render(<InstallPrompt />);
    act(() => window.dispatchEvent(new Event("beforeinstallprompt")));

    expect(screen.getByText("نصب ARSHNAZ روی دستگاه")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بستن پیشنهاد نصب" })).toBeInTheDocument();
  });
});
