import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AngelCompanion, MascotCharacter } from "./AngelCompanion";
import { setMascotMode, setMascotLook, showMascotMoment } from "@/lib/mascot";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); setMascotMode("full"); setMascotLook("blonde"); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("angel companion controls", () => {
  it("switches all character poses to the chosen hair style immediately", () => {
    const { container } = render(<><MascotCharacter pose="celebrate" /><MascotCharacter pose="thinking" /></>);
    act(() => setMascotLook("black"));
    for (const character of container.querySelectorAll<HTMLElement>(".companion-character")) {
      expect(character.dataset.look).toBe("black");
      expect(character.style.backgroundImage).toContain("angel-companion-black.png");
    }
    expect(localStorage.getItem("arshnaz-mascot-look")).toBe("black");
  });
  it("keeps celebrations brief and avoids interrupting a burst of task edits", () => {
    render(<AngelCompanion />);
    act(() => showMascotMoment("celebrate"));
    expect(screen.getByRole("status").textContent).toContain("One lovely step forward");
    act(() => showMascotMoment("tomorrow"));
    expect(screen.getByRole("status").textContent).toContain("One lovely step forward");
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("turning off immediately hides both celebrations and AI companions", () => {
    const { container } = render(<><AngelCompanion /><MascotCharacter pose="thinking" busy /></>);
    act(() => showMascotMoment("celebrate"));
    act(() => setMascotMode("off"));
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector(".companion-character")).toBeNull();
    act(() => { vi.advanceTimersByTime(7000); showMascotMoment("garden"); });
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("changing modes dismisses an existing moment instead of leaving it stuck", () => {
    render(<AngelCompanion />);
    act(() => showMascotMoment("garden"));
    act(() => setMascotMode("calm"));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => { vi.advanceTimersByTime(7000); showMascotMoment("tomorrow"); });
    expect(screen.getByRole("status").getAttribute("data-mode")).toBe("calm");
    act(() => vi.advanceTimersByTime(1900));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
