import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceInputButton } from "./VoiceInputButton";

const mock = vi.hoisted(() => ({ toggle: vi.fn(), stop: vi.fn(), callbacks: null as null | { onTranscript: (text: string) => void; onListeningChange: (listening: boolean) => void } }));
vi.mock("@/lib/voiceInput", () => ({ VoiceInput: class { constructor(options: typeof mock.callbacks) { mock.callbacks = options; } toggle = mock.toggle; stop = mock.stop; start = vi.fn(); } }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ i18n: { language: "fa" }, T: (fa: string) => fa }) }));
beforeEach(() => { mock.toggle.mockClear(); mock.stop.mockClear(); localStorage.removeItem("voice_input_lang"); });
describe("explicit dictation", () => {
  it("starts Persian recognition only when the user presses the microphone", () => {
    render(<VoiceInputButton onTranscript={vi.fn()} />);
    expect(mock.toggle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "نوشتن با صدا" }));
    expect(mock.toggle).toHaveBeenCalledExactlyOnceWith("fa-IR");
  });
  it("stops when disabled and discards transcripts after disabling or unmounting", () => {
    const transcript = vi.fn();
    const view = render(<VoiceInputButton onTranscript={transcript} />);
    const callbacks = mock.callbacks!;
    view.rerender(<VoiceInputButton onTranscript={transcript} disabled />);
    act(() => callbacks.onTranscript("late disabled text"));
    expect(mock.stop).toHaveBeenCalled();
    expect(transcript).not.toHaveBeenCalled();
    view.unmount();
    act(() => callbacks.onTranscript("late closed text"));
    expect(transcript).not.toHaveBeenCalled();
  });
});
