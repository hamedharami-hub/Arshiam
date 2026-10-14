import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SelfCheckView from "./SelfCheckView";
import { workspaceDraftKey } from "@/lib/mind/workspaceDraft";

const context = vi.hoisted(() => ({ owner: "A" as string | undefined, id: "stress", isEn: true, save: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: context.owner ? { id: context.owner } : null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: context.isEn, T: (fa: string, en: string) => context.isEn ? en : fa }) }));
vi.mock("react-router-dom", async (load) => ({ ...await load<typeof import("react-router-dom")>(), useParams: () => ({ id: context.id }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/needs/NeedsBits", () => ({ Back: () => null, MethodCard: () => null, SafetyNotice: () => <p>Support remains available</p> }));
vi.mock("@/lib/needs/service", () => ({ saveCheckResult: context.save }));

const view = () => <MemoryRouter><SelfCheckView /></MemoryRouter>;
function answerAll(count = 6) { for (let i = 0; i < count; i++) fireEvent.click(screen.getByTestId(`selfcheck-${i}-4`)); }
beforeEach(() => { localStorage.clear(); context.owner = "A"; context.id = "stress"; context.isEn = true; context.save.mockReset().mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("SelfCheckView account-safe descriptive review", () => {
  it("does not submit missing answers, renders responses rather than generic severity and saves the legacy payload", async () => {
    render(view());
    expect(screen.getByTestId("selfcheck-submit")).toBeDisabled();
    answerAll();
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-submit")); });
    expect(context.save).toHaveBeenCalledExactlyOnceWith("A", "stress", 83, [4, 4, 4, 4, 4, 4], expect.objectContaining({ language: "en", interpretationVersion: "reported-responses-v1", resultId: expect.stringMatching(/^stress_/) }));
    expect(screen.getByText("Your reported responses")).toBeInTheDocument();
    expect(screen.queryByTestId("selfcheck-band")).not.toBeInTheDocument();
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Answers saved to account");
    expect(screen.getByRole("link", { name: "Finish for now" })).toHaveAttribute("href", "/app/mind");
  });

  it.each(["false", "throw"])("shows %s save failure, keeps review/draft and allows retry without a false saved claim", async (failure) => {
    context.save.mockImplementationOnce(() => failure === "throw" ? Promise.reject(new Error("offline")) : Promise.resolve(false));
    render(view()); answerAll();
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-submit")); });
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Account save failed");
    expect(screen.getByTestId("selfcheck-save-status")).not.toHaveTextContent("Answers saved to account");
    expect(localStorage.getItem(workspaceDraftKey("A", "selfcheck:stress"))).toContain('"answers":[4,4,4,4,4,4]');
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-retry")); });
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Answers saved to account");
  });

  it("blocks rapid duplicate submit and preserves reflection edited while saving", async () => {
    let resolve!: (value: boolean) => void;
    context.save.mockReturnValue(new Promise<boolean>((r) => { resolve = r; }));
    render(view()); answerAll();
    const submit = screen.getByTestId("selfcheck-submit");
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    expect(context.save).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(/Optional reflection/), { target: { value: "new private reflection" } });
    expect(screen.getByTestId("selfcheck-retake")).toBeDisabled();
    await act(async () => { resolve(true); });
    expect(screen.getByLabelText(/Optional reflection/)).toHaveValue("new private reflection");
    expect(localStorage.getItem(workspaceDraftKey("A", "selfcheck:stress"))).toContain("new private reflection");
    expect(context.save.mock.calls[0]).toHaveLength(5);
    expect(context.save.mock.calls[0][4]).not.toHaveProperty("reflection");
  });

  it("remounts account A → B → A and ignores a late save from an earlier mount", async () => {
    let resolve!: (value: boolean) => void;
    context.save.mockReturnValueOnce(new Promise<boolean>((r) => { resolve = r; }));
    const rendered = render(view()); answerAll(); fireEvent.click(screen.getByTestId("selfcheck-submit"));
    context.owner = "B"; rendered.rerender(view());
    expect(screen.queryByTestId("selfcheck-result")).not.toBeInTheDocument();
    expect(screen.getByTestId("selfcheck-0-4")).toHaveAttribute("aria-pressed", "false");
    context.owner = "A"; rendered.rerender(view());
    expect(screen.getByTestId("selfcheck-result")).toBeInTheDocument();
    await act(async () => { resolve(true); });
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Account storage is not confirmed");
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.save.mock.calls[0][0]).toBe("A");
  });

  it("isolates check type and restores each unfinished draft", () => {
    const rendered = render(view()); fireEvent.click(screen.getByTestId("selfcheck-0-3"));
    context.id = "self-esteem"; rendered.rerender(view());
    expect(screen.getByTestId("selfcheck-0-3")).toHaveAttribute("aria-pressed", "false");
    context.id = "stress"; rendered.rerender(view());
    expect(screen.getByTestId("selfcheck-0-3")).toHaveAttribute("aria-pressed", "true");
  });

  it("restores all answers, selected reflection topic and text on remount without claiming account sync", async () => {
    context.owner = undefined;
    const rendered = render(view()); answerAll();
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-submit")); });
    fireEvent.click(screen.getByRole("button", { name: /I feel things are getting out of my hands/ }));
    fireEvent.change(screen.getByLabelText(/Optional reflection/), { target: { value: "context matters" } });
    rendered.unmount(); render(view());
    expect(screen.getByLabelText(/Optional reflection/)).toHaveValue("context matters");
    expect(screen.getByRole("button", { name: /I feel things are getting out of my hands/ })).toHaveAttribute("aria-pressed", "true");
    expect(context.save).not.toHaveBeenCalled();
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Account storage is not confirmed");
  });

  it("does not claim device persistence under quota failure and does not discard on failed clear", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    render(view()); answerAll();
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-submit")); });
    expect(screen.getByText(/Durable device storage is not confirmed/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("selfcheck-retake"));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not clear the draft");
    expect(screen.getByTestId("selfcheck-result")).toBeInTheDocument();
  });

  it("preserves the working copy on foreign-tab conflict and blocks account save until a choice", () => {
    render(view()); answerAll();
    const key = workspaceDraftKey("A", "selfcheck:stress");
    const remote = JSON.parse(localStorage.getItem(key)!);
    remote.updatedAt += 1; remote.value.answers[0] = 0;
    localStorage.setItem(key, JSON.stringify(remote));
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key })); });
    expect(screen.getByRole("alert")).toHaveTextContent("your working copy has not been replaced");
    expect(screen.getByTestId("selfcheck-0-4")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("selfcheck-submit")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep my version" }));
    expect(screen.getByTestId("selfcheck-submit")).toBeEnabled();
    expect(context.save).not.toHaveBeenCalled();
  });

  it("renders corrected Persian wording in the future presentation", () => {
    context.isEn = false; context.id = "self-esteem";
    render(view()); expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ارزش‌گذاری به خود");
  });

  it("invalidates the saved-answers claim only when accepting a different remote answer snapshot", async () => {
    render(view()); answerAll();
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-submit")); });
    const key = workspaceDraftKey("A", "selfcheck:stress");
    const remote = JSON.parse(localStorage.getItem(key)!);
    remote.updatedAt += 1; remote.value.answers[0] = 0;
    localStorage.setItem(key, JSON.stringify(remote));
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key })); });
    fireEvent.click(screen.getByRole("button", { name: "Accept other version" }));
    expect(screen.getByTestId("selfcheck-save-status")).toHaveTextContent("Account storage is not confirmed");
    expect(screen.getByRole("button", { name: /I feel things are getting out of my hands/ })).toHaveTextContent("Never");
    await act(async () => { fireEvent.click(screen.getByTestId("selfcheck-retry")); });
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.save.mock.calls[1][3][0]).toBe(0);
  });
});
