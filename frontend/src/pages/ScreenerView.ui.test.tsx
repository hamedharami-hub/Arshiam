import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScreenerView from "./ScreenerView";
import { SCREENERS, SCREENER_INTERPRETATION_VERSION, type ScreenerType } from "@/lib/assessments/screeners";

const context = vi.hoisted(() => ({
  owner: "A" as string | undefined, type: "phq9" as ScreenerType, isEn: true,
  save: vi.fn(), success: vi.fn(), error: vi.fn(), history: [] as any[], callbacks: [] as Array<(items: any[]) => void>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: context.owner ? { id: context.owner } : null }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: context.isEn, T: (fa: string, en: string) => context.isEn ? en : fa }) }));
vi.mock("react-router-dom", async (load) => ({ ...await load<typeof import("react-router-dom")>(), useParams: () => ({ type: context.type }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/firestoreDataService", () => ({
  upsertAssessmentResult: context.save,
  subscribeAssessmentResults: (_owner: string, _type: string, callback: (items: any[]) => void) => {
    context.callbacks.push(callback); callback(context.history); return () => {};
  },
}));
vi.mock("sonner", () => ({ toast: { success: context.success, error: context.error } }));
vi.mock("recharts", () => ({
  XAxis: () => null, YAxis: () => null, Tooltip: () => null, Area: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>, AreaChart: ({ children }: any) => <svg>{children}</svg>,
}));

const view = () => <MemoryRouter><ScreenerView /></MemoryRouter>;
const draftKey = (owner = context.owner, type = context.type) => `screener_draft_${owner || "guest"}_${type}`;
function answerAll(value = 0) {
  fireEvent.click(screen.getByRole("button", { name: "Start New Screener" }));
  for (let i = 0; i < SCREENERS[context.type].items.length; i++) {
    const label = SCREENERS[context.type].labels_en[value];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label} ${value}$`) }));
  }
}
const submit = () => screen.getByRole("button", { name: "Submit & View Result" });
beforeEach(() => {
  localStorage.clear(); context.owner = "A"; context.type = "phq9"; context.isEn = true;
  context.history = []; context.callbacks = []; context.success.mockReset(); context.error.mockReset();
  context.save.mockReset().mockImplementation(async (owner, payload) => ({ ...payload, user_id: owner }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ScreenerView scoped runner and truthful reviewed results", () => {
  it("shows unverified translation and actual version/source/timeframe without changing standard items", () => {
    render(view());
    expect(screen.getByTestId("screener-provenance")).toHaveTextContent("1.0 is an app identifier");
    expect(screen.getByTestId("screener-provenance")).toHaveTextContent("have not been verified");
    expect(screen.getByRole("link", { name: "Listed reference" })).toHaveAttribute("href", "https://www.phqscreeners.com");
    fireEvent.click(screen.getByRole("button", { name: "Start New Screener" }));
    expect(screen.getByText(SCREENERS.phq9.items[0].text_en!)).toBeInTheDocument();
    expect(screen.getByText("Reference period: Last 2 weeks")).toBeInTheDocument();
  });

  it("saves zero responses truthfully, adds optional future metadata and never calls zero symptom-free", async () => {
    render(view()); answerAll();
    await act(async () => { fireEvent.click(submit()); });
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.save.mock.calls[0][0]).toBe("A");
    const payload = context.save.mock.calls[0][1];
    expect(payload.scores).toMatchObject({ raw: 0, normalized: 0, interpretation_version: SCREENER_INTERPRETATION_VERSION, translation_validation: "unknown", permission_status: "unknown", language: "en" });
    expect(Object.values(payload.scores.answers)).toEqual(Array(9).fill(0));
    expect(context.success).toHaveBeenCalledWith("Result saved to your account");
    expect(localStorage.getItem(draftKey())).toBeNull();
    expect(screen.getByText(/A low score does not prove there is no problem/)).toBeInTheDocument();
  });

  it.each(["null", "throw", "wrong-owner", "wrong-type"])("does not claim success for %s service outcomes and keeps the draft", async (failure) => {
    context.save.mockImplementationOnce((owner, payload) => {
      if (failure === "throw") return Promise.reject(new Error("offline"));
      return Promise.resolve(failure === "null" ? null : { ...payload, user_id: failure === "wrong-owner" ? "B" : owner, assessment_type: failure === "wrong-type" ? "gad7" : payload.assessment_type });
    });
    render(view()); answerAll();
    await act(async () => { fireEvent.click(submit()); });
    expect(context.success).not.toHaveBeenCalled();
    expect(context.error).toHaveBeenCalled();
    expect(submit()).toBeEnabled();
    expect(localStorage.getItem(draftKey())).toContain('"9":0');
  });

  it("locks rapid submit and retries the same snapshot using the same ID and completion time", async () => {
    let resolve!: (value: any) => void;
    context.save.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(view()); answerAll();
    const button = submit(); act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Back to Questions" })).toBeDisabled();
    await act(async () => { resolve(null); });
    await act(async () => { fireEvent.click(submit()); });
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.save.mock.calls[1][1]).toEqual(context.save.mock.calls[0][1]);
    expect(context.success).toHaveBeenCalledTimes(1);
  });

  it.each(["owner", "type"])("isolates %s transitions and ignores old save/subscription callbacks", async (transition) => {
    let resolve!: (value: any) => void;
    context.save.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const rendered = render(view()); answerAll(); fireEvent.click(submit());
    const payload = context.save.mock.calls[0][1];
    const oldCallback = context.callbacks[0];
    if (transition === "owner") context.owner = "B"; else context.type = "gad7";
    rendered.rerender(view());
    expect(screen.getByRole("button", { name: "Start New Screener" })).toBeInTheDocument();
    await act(async () => { oldCallback([{ ...payload, user_id: "A" }]); resolve({ ...payload, user_id: "A" }); });
    expect(context.success).not.toHaveBeenCalled();
    expect(screen.queryByText("Assessment Summary")).not.toBeInTheDocument();
    expect(localStorage.getItem(draftKey("A", "phq9"))).toContain('"9":0');
    if (transition === "owner") context.owner = "A"; else context.type = "phq9";
    rendered.rerender(view());
    expect(screen.getByRole("button", { name: "Continue Screener" })).toBeInTheDocument();
    expect(screen.getByTestId("screener-draft-status")).toHaveTextContent("not an account-save confirmation");
  });

  it("gives edited answers a new retry ID rather than overwriting an earlier possibly saved snapshot", async () => {
    context.save.mockResolvedValueOnce(null);
    render(view()); answerAll(); await act(async () => { fireEvent.click(submit()); });
    const oldPayload = context.save.mock.calls[0][1];
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Several days 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Answers" }));
    await act(async () => { fireEvent.click(submit()); });
    expect(context.save.mock.calls[1][1].id).not.toBe(oldPayload.id);
    expect(context.save.mock.calls[1][1].scores.answers[1]).toBe(1);
    expect(oldPayload.scores.answers[1]).toBe(0);
  });

  it("does not discard answers on device clear failure or claim persistent drafts under quota failure", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    render(view()); answerAll();
    expect(screen.getByTestId("screener-draft-status")).toHaveTextContent("Durable device draft storage is not confirmed");
    await act(async () => { fireEvent.click(submit()); });
    expect(context.success).toHaveBeenCalledWith("Result saved to your account");
    expect(context.error).toHaveBeenCalledWith("Result saved to your account, but the device draft could not be cleared.");
    fireEvent.click(screen.getByRole("button", { name: "Start again (clear draft)" }));
    expect(screen.getByText("Assessment Summary")).toBeInTheDocument();
  });

  it("uses the personal form's actual timeframe and reviews burnout responses, not medical bands", async () => {
    context.type = "burnout";
    render(view());
    expect(screen.getByTestId("screener-provenance")).toHaveTextContent("not a version of MBI or CBI");
    answerAll(4);
    await act(async () => { fireEvent.click(submit()); });
    const responses = screen.getByTestId("burnout-reported-responses");
    expect(responses).toHaveTextContent("Always");
    expect(responses).toHaveTextContent("creates no task");
    const topic = screen.getByRole("button", { name: /I feel worn out and chronically exhausted/ });
    fireEvent.click(topic); expect(topic).toHaveAttribute("aria-pressed", "true");
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.save.mock.calls[0][1].scores.timeframe).toBe("Recent days");
    expect(screen.getByTestId("screener-legacy-interpretation")).toHaveTextContent("High Fatigue / Exhaustion");
  });

  it("preserves old WHO data/text, keeps unknown metadata unknown and viewing separate from the draft", () => {
    context.type = "who5";
    const old = { id: "old", assessment_type: "who5", scores: { raw: 0 }, created_at: "2020-01-01T12:00:00Z", analysis: { severityLabel_en: "Old exact band", recommendation_en: "Old exact recommendation" } };
    context.history = [old];
    localStorage.setItem(draftKey(), JSON.stringify({ answers: { 1: 5 } }));
    const rendered = render(view());
    expect(rendered.container.querySelector("p p")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View saved result" }));
    expect(rendered.container.querySelector("p p")).toBeNull();
    expect(screen.getByTestId("screener-record-metadata")).toHaveTextContent("unknown / unknown / unknown");
    expect(screen.getByText(/Historical version unknown/)).toBeInTheDocument();
    expect(screen.getByTestId("screener-legacy-interpretation")).toHaveTextContent("Old exact recommendation");
    expect(screen.getByText(/Completion date unknown/)).toBeInTheDocument();
    expect(context.save).not.toHaveBeenCalled();
    expect(old.analysis.recommendation_en).toBe("Old exact recommendation");
    fireEvent.click(screen.getByRole("button", { name: "Back to Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue Screener" }));
    expect(screen.getByRole("button", { name: /All of the time 5/ }).className).toContain("border-primary");
  });

  it("keeps independent PHQ item-9 support visible after a failed account save", async () => {
    context.save.mockResolvedValueOnce(null);
    render(view()); answerAll(1);
    expect(screen.getByTestId("self-harm-support-card")).toBeInTheDocument();
    await act(async () => { fireEvent.click(submit()); });
    expect(screen.getByTestId("self-harm-support-card")).toBeInTheDocument();
    expect(screen.getByTestId("sos-button")).toHaveAttribute("href", "/app/crisis");
  });

  it("saves an incomplete form without a fabricated score and preserves continuation", async () => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "Start New Screener" }));
    fireEvent.click(screen.getByRole("button", { name: "Not at all 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Answers" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save Incomplete Form to Account" })); });
    expect(context.save.mock.calls[0][1].scores).toMatchObject({ raw: null, normalized: null, is_complete: false, answered_count: 1 });
    expect(context.success).toHaveBeenCalledWith("Incomplete form saved to your account; no complete score");
    expect(localStorage.getItem(draftKey())).toContain('"1":0');
    fireEvent.click(screen.getByRole("button", { name: "Back to Overview" }));
    expect(screen.getByRole("button", { name: "Continue Screener" })).toBeInTheDocument();
  });

  it("does not silently submit guest responses", () => {
    context.owner = undefined; render(view()); answerAll();
    expect(submit()).toBeDisabled();
    expect(screen.getByText(/Sign in to save to your account/)).toBeInTheDocument();
    expect(context.save).not.toHaveBeenCalled();
  });
});
