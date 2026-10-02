import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), fade: vi.fn(), cancel: vi.fn() }));
vi.mock("@/lib/pomodoroSynth", () => ({ startSynth: mocks.start, stopSynth: mocks.stop, scheduleSleepFade: mocks.fade, cancelSleepFade: mocks.cancel, setSynthVolume: vi.fn() }));
vi.mock("@/lib/appModules", () => ({ useModules: () => ({}), isPathAllowed: () => true }));
import { SleepSoundsCard } from "./SleepSoundsCard";
describe("sleep playback controls", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); });
  afterEach(() => vi.unstubAllGlobals());
  it("updates the fade timer without restarting the chosen track and stops on exit", () => {
    const { unmount } = render(<MemoryRouter><SleepSoundsCard isEn /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("sleep-play-toggle"));
    expect(mocks.start).toHaveBeenCalledWith("sleep_music", 35);
    fireEvent.click(screen.getByTestId("sleep-timer-60"));
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.fade).toHaveBeenLastCalledWith(3600, 600, 35);
    unmount(); expect(mocks.stop).toHaveBeenCalled(); expect(mocks.cancel).toHaveBeenCalled();
  });
  it("remembers the selected sound and unlimited duration", () => {
    render(<MemoryRouter><SleepSoundsCard isEn /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("sleep-sound-sleep_brown"));
    fireEvent.click(screen.getByTestId("sleep-timer-0"));
    fireEvent.click(screen.getByTestId("sleep-play-toggle"));
    expect(mocks.start).toHaveBeenCalledWith("sleep_brown", 35);
    expect(screen.getByTestId("sleep-remaining")).toHaveTextContent("no auto stop");
    expect(JSON.parse(localStorage.getItem("sleep_sounds_prefs_v1")!)).toMatchObject({ sound: "sleep_brown", minutes: 0 });
  });
});
