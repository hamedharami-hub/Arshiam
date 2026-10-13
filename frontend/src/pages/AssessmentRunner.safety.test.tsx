import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssessmentRunner from "./AssessmentRunner";

const mock = vi.hoisted(() => ({
  user: { id: "owner-a" } as { id: string } | null,
  type: "ecr",
  load: vi.fn(), result: vi.fn(), progress: vi.fn(), upsert: vi.fn(), fallback: vi.fn(),
  navigate: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mock.navigate, useParams: () => ({ type: mock.type }) }));
vi.mock("sonner", () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock("@/lib/firestoreDataService", () => ({
  getAssessmentProgress: mock.load, upsertAssessmentResult: mock.result, saveAssessmentProgress: mock.progress,
}));
vi.mock("@/lib/assessments/ecr", () => ({
  ECR_ITEMS: [1, 2, 3].map(id => ({ id, text: `ECR ${id}`, text_en: `ECR ${id}` })),
  scoreEcr: () => ({}), attachmentQuadrant: () => "secure", QUADRANT_LABELS: { secure: "Secure" },
}));
vi.mock("@/lib/assessments/via", () => ({
  VIA_ITEMS: [1, 2].map(id => ({ id, text: `VIA ${id}`, text_en: `VIA ${id}` })),
  scoreVia: () => ({}), analyzeVia: () => ({}), VIA_LABELS: {},
}));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: mock.fallback, upsert: mock.upsert };
  return query;
} } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const draft = (currentIndex = 0, responses: Record<number, number> = {}) => ({ currentIndex, responses, completed: false });
const answer = () => screen.getByRole("button", { name: "1 — 1 Strongly Disagree" });
const start = async () => {
  const view = render(<AssessmentRunner />);
  await screen.findByText("ECR 1");
  return view;
};

beforeEach(() => {
  vi.resetAllMocks();
  mock.user = { id: "owner-a" };
  mock.type = "ecr";
  mock.load.mockResolvedValue(draft());
  mock.result.mockResolvedValue({ id: "saved" });
  mock.progress.mockResolvedValue(true);
  mock.upsert.mockResolvedValue({ error: null });
  mock.fallback.mockResolvedValue({ data: null, error: null });
});
afterEach(cleanup);

describe("assessment session isolation", () => {
  it("clears answers immediately on owner switch and ignores the old late load", async () => {
    const oldLoad = deferred<ReturnType<typeof draft>>();
    const newLoad = deferred<ReturnType<typeof draft>>();
    mock.load.mockReturnValueOnce(oldLoad.promise).mockReturnValueOnce(newLoad.promise);
    const view = render(<AssessmentRunner />);
    mock.user = { id: "owner-b" };
    view.rerender(<AssessmentRunner />);
    await act(async () => { newLoad.resolve(draft()); });
    expect(screen.getByText("ECR 1")).toBeInTheDocument();
    await act(async () => { oldLoad.resolve(draft(2, { 1: 7, 2: 7 })); });
    expect(screen.getByText("ECR 1")).toBeInTheDocument();
    fireEvent.click(answer());
    await waitFor(() => expect(mock.progress).toHaveBeenCalledWith("owner-b", "ecr", { 1: 1 }, 1, false));
  });

  it("remounts on assessment type switch without reusing the old answers or cursor", async () => {
    mock.load.mockResolvedValueOnce(draft(1, { 1: 7 })).mockResolvedValueOnce(draft());
    const view = render(<AssessmentRunner />);
    await screen.findByText("ECR 2");
    mock.type = "via";
    view.rerender(<AssessmentRunner />);
    await screen.findByText("VIA 1");
    fireEvent.click(screen.getByRole("button", { name: "1 — Very Much Unlike Me" }));
    await waitFor(() => expect(mock.progress).toHaveBeenCalledWith("owner-a", "via", { 1: 1 }, 1, false));
  });

  it("does not reload or overwrite local answers when the auth object changes for the same owner", async () => {
    const view = await start();
    fireEvent.click(answer());
    await waitFor(() => expect(answer()).not.toBeDisabled());
    mock.user = { id: "owner-a" };
    view.rerender(<AssessmentRunner />);
    expect(screen.getByText("ECR 2")).toBeInTheDocument();
    expect(mock.load).toHaveBeenCalledTimes(1);
  });

  it("shows a retryable load failure instead of allowing empty-draft writes", async () => {
    mock.load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(draft(1, { 1: 5 }));
    render(<AssessmentRunner />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Progress could not be loaded");
    expect(mock.progress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("ECR 2");
    fireEvent.click(answer());
    await waitFor(() => expect(mock.progress).toHaveBeenCalledWith("owner-a", "ecr", { 1: 5, 2: 1 }, 2, false));
  });

  it("treats a fallback returned error as load failure", async () => {
    mock.load.mockResolvedValue(null);
    mock.fallback.mockResolvedValue({ data: null, error: new Error("denied") });
    render(<AssessmentRunner />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Progress could not be loaded");
    expect(mock.progress).not.toHaveBeenCalled();
  });

  it("does not launch an old fallback after a stale primary load resolves", async () => {
    const pending = deferred<null>();
    mock.load.mockReturnValueOnce(pending.promise);
    const view = render(<AssessmentRunner />);
    mock.user = null;
    view.rerender(<AssessmentRunner />);
    await act(async () => { pending.resolve(null); });
    expect(mock.fallback).not.toHaveBeenCalled();
    expect(screen.getByText("Sign in to continue.")).toBeInTheDocument();
  });

  it("ignores a stale fallback response after assessment type switch", async () => {
    const pending = deferred<{ data: ReturnType<typeof draft>; error: null }>();
    mock.load.mockResolvedValueOnce(null).mockResolvedValueOnce(draft());
    mock.fallback.mockReturnValueOnce(pending.promise);
    const view = render(<AssessmentRunner />);
    await waitFor(() => expect(mock.fallback).toHaveBeenCalledTimes(1));
    mock.type = "via";
    view.rerender(<AssessmentRunner />);
    await screen.findByText("VIA 1");
    await act(async () => { pending.resolve({ data: draft(2, { 1: 7 }), error: null }); });
    expect(screen.getByText("VIA 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 — Very Much Unlike Me" })).toHaveAttribute("aria-pressed", "false");
  });

  it("does not resurrect an incomplete mirror when primary progress is completed", async () => {
    mock.load.mockResolvedValue({ ...draft(2, { 1: 7, 2: 7, 3: 7 }), completed: true });
    mock.fallback.mockResolvedValue({ data: draft(2, { 1: 7 }), error: null });
    await start();
    expect(mock.fallback).not.toHaveBeenCalled();
    expect(answer()).toHaveAttribute("aria-pressed", "false");
  });

  it("renders invalid types immediately without loading or writing", () => {
    mock.type = "unknown";
    render(<AssessmentRunner />);
    expect(screen.getByText("Invalid assessment")).toBeInTheDocument();
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.progress).not.toHaveBeenCalled();
  });
});

describe("serialized assessment writes", () => {
  it("blocks rapid answers, cursor controls and exit until both primary and mirror settle", async () => {
    const primary = deferred<boolean>();
    const mirror = deferred<{ error: null }>();
    mock.progress.mockReturnValueOnce(primary.promise);
    mock.upsert.mockReturnValueOnce(mirror.promise);
    await start();
    act(() => { fireEvent.click(answer()); fireEvent.click(answer()); });
    expect(mock.progress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("ECR 2")).toBeInTheDocument();
    for (const name of ["Back", "Previous", "Next", "Save & Continue Later"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    await act(async () => { primary.resolve(true); });
    expect(answer()).toBeDisabled();
    await act(async () => { mirror.resolve({ error: null }); });
    fireEvent.click(answer());
    await waitFor(() => expect(mock.progress).toHaveBeenCalledTimes(2));
    expect(mock.progress.mock.calls[1]).toEqual(["owner-a", "ecr", { 1: 1, 2: 1 }, 2, false]);
  });

  it("keeps rejected progress retryable and Back cannot bypass repeated failure", async () => {
    mock.progress.mockRejectedValue(new Error("offline"));
    await start();
    fireEvent.click(answer());
    expect(await screen.findByRole("alert")).toHaveTextContent("Progress was not saved");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(mock.error).toHaveBeenCalledTimes(1));
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.upsert).not.toHaveBeenCalled();
    mock.progress.mockResolvedValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith("/app/self"));
    expect(mock.progress.mock.calls[mock.progress.mock.calls.length - 1]).toEqual(["owner-a", "ecr", { 1: 1 }, 1, false]);
  });

  it("suppresses an old progress continuation after owner switch", async () => {
    const pending = deferred<boolean>();
    mock.progress.mockReturnValueOnce(pending.promise);
    const view = await start();
    fireEvent.click(answer());
    mock.user = { id: "owner-b" };
    view.rerender(<AssessmentRunner />);
    await screen.findByText("ECR 1");
    await act(async () => { pending.resolve(false); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.error).not.toHaveBeenCalled();
  });

  it("suppresses save-exit success, mirror and navigation after owner switch", async () => {
    const pending = deferred<boolean>();
    mock.progress.mockReturnValueOnce(pending.promise);
    const view = await start();
    fireEvent.click(screen.getByRole("button", { name: "Save & Continue Later" }));
    mock.user = { id: "owner-b" };
    view.rerender(<AssessmentRunner />);
    await screen.findByText("ECR 1");
    await act(async () => { pending.resolve(true); });
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.success).not.toHaveBeenCalled();
  });

  it("does not mark progress completed or permit draft exit when the final result failed", async () => {
    mock.load.mockResolvedValue(draft(2, { 1: 2, 2: 3 }));
    mock.result.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "saved" });
    render(<AssessmentRunner />);
    fireEvent.click(await screen.findByRole("button", { name: "1 — 1 Strongly Disagree" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Results were not saved");
    expect(mock.progress).not.toHaveBeenCalled();
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save & Continue Later" })).toBeDisabled();
    expect(answer()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith("/app/self/result/ecr"));
    expect(mock.result.mock.calls[1][1].id).toBe(mock.result.mock.calls[0][1].id);
    expect(mock.progress).toHaveBeenCalledWith("owner-a", "ecr", { 1: 2, 2: 3, 3: 1 }, 2, true);
  });

  it("blocks final-answer/save-exit overlap and stops downstream writes after result owner changes", async () => {
    const pending = deferred<{ id: string }>();
    mock.load.mockResolvedValue(draft(2, { 1: 1, 2: 1 }));
    mock.result.mockReturnValueOnce(pending.promise);
    const view = render(<AssessmentRunner />);
    fireEvent.click(await screen.findByRole("button", { name: "1 — 1 Strongly Disagree" }));
    fireEvent.click(screen.getByRole("button", { name: "Save & Continue Later" }));
    fireEvent.click(answer());
    expect(mock.result).toHaveBeenCalledTimes(1);
    expect(mock.progress).not.toHaveBeenCalled();
    mock.user = { id: "owner-b" };
    mock.load.mockResolvedValue(draft());
    view.rerender(<AssessmentRunner />);
    await screen.findByText("ECR 1");
    await act(async () => { pending.resolve({ id: "saved" }); });
    expect(mock.progress).not.toHaveBeenCalled();
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.success).not.toHaveBeenCalled();
  });

  it("keeps a rejected result retryable without leaking the operation lock", async () => {
    mock.load.mockResolvedValue(draft(2, { 1: 1, 2: 1 }));
    mock.result.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "saved" });
    render(<AssessmentRunner />);
    fireEvent.click(await screen.findByRole("button", { name: "1 — 1 Strongly Disagree" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Results were not saved");
    expect(mock.progress).not.toHaveBeenCalled();
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).not.toBeDisabled();
    act(() => { fireEvent.click(retry); fireEvent.click(retry); });
    await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith("/app/self/result/ecr"));
    expect(mock.result).toHaveBeenCalledTimes(2);
    expect(mock.result.mock.calls[1][1].id).toBe(mock.result.mock.calls[0][1].id);
  });

  it("suppresses final completion callbacks after switching owner during completed-progress write", async () => {
    const pending = deferred<boolean>();
    mock.load.mockResolvedValue(draft(2, { 1: 1, 2: 1 }));
    mock.progress.mockReturnValueOnce(pending.promise);
    const view = render(<AssessmentRunner />);
    fireEvent.click(await screen.findByRole("button", { name: "1 — 1 Strongly Disagree" }));
    await waitFor(() => expect(mock.progress).toHaveBeenCalledTimes(1));
    mock.user = { id: "owner-b" };
    mock.load.mockResolvedValue(draft());
    view.rerender(<AssessmentRunner />);
    await screen.findByText("ECR 1");
    await act(async () => { pending.resolve(true); });
    expect(mock.upsert).toHaveBeenCalledTimes(1); // Only the old result mirror, before switching.
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.success).not.toHaveBeenCalled();
  });
});
