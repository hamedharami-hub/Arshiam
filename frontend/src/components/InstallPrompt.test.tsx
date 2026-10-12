import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("keeps a permanent trigger and captures a real event even after session dismissal", async () => {
    const first = render(<InstallPrompt />);
    act(() => window.dispatchEvent(new Event("beforeinstallprompt")));
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    first.unmount();
    render(<InstallPrompt />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    act(() => window.dispatchEvent(event));
    expect(screen.queryByText("Install ARSHNAZ on your device")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install app or view instructions" }));
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Install app or view instructions" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Install app or view instructions" }));
    expect(screen.getByText(/Open your browser menu/)).toBeInTheDocument();
  });

  it("offers fallback instructions after an install failure without an unhandled rejection", async () => {
    render(<InstallPrompt />);
    const event = Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn().mockRejectedValue(new Error("unsupported")), userChoice: Promise.resolve({ outcome: "dismissed" }) });
    act(() => window.dispatchEvent(event));
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Installation failed");
    expect(screen.getByText(/Open your browser menu/)).toBeInTheDocument();
  });

  it("allows opening instructions without a browser install event and hides after installation", () => {
    render(<InstallPrompt />);
    act(() => window.dispatchEvent(new Event("arshnaz:open-install")));
    expect(screen.getByText(/Open your browser menu/)).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event("appinstalled")));
    expect(screen.queryByRole("region", { name: "App installation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Install app or view instructions" })).not.toBeInTheDocument();
  });

  it("places the permanent entry in existing header actions without covering page controls", () => {
    const host = document.createElement("div");
    host.id = "app-header-actions";
    document.body.appendChild(host);
    try {
      const view = render(<InstallPrompt />);
      const trigger = screen.getByRole("button", { name: "Install app or view instructions" });
      expect(host).toContainElement(trigger);
      expect(trigger.className).not.toContain("fixed");
      view.unmount();
    } finally { host.remove(); }
  });
});
