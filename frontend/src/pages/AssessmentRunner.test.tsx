import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import AssessmentRunner from "./AssessmentRunner";

const mock = vi.hoisted(() => ({ user: { id: "owner" }, result: vi.fn(), progress: vi.fn(), upsert: vi.fn(), navigate: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: true, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/lib/firestoreDataService", () => ({
  getAssessmentProgress: async () => ({ currentIndex: 0, responses: {}, completed: false }),
  upsertAssessmentResult: mock.result,
  saveAssessmentProgress: mock.progress,
}));
vi.mock("@/lib/assessments/ecr", () => ({ ECR_ITEMS: [{ id: 1, text: "Question", text_en: "Question" }], scoreEcr: () => ({}), attachmentQuadrant: () => "secure", QUADRANT_LABELS: { secure: "Secure" } }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ upsert: mock.upsert }) } }));
vi.mock("react-router-dom", async importOriginal => ({ ...await importOriginal<typeof import("react-router-dom")>(), useNavigate: () => mock.navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  mock.result.mockResolvedValue({ id: "saved" });
  mock.progress.mockResolvedValueOnce(false).mockResolvedValue(true);
  mock.upsert.mockResolvedValue({ error: null });
});

it("reuses result identity after final-progress failure instead of minting duplicate results", async () => {
  render(<MemoryRouter initialEntries={["/run/ecr"]}><Routes><Route path="/run/:type" element={<AssessmentRunner />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "1 — 1 Strongly Disagree" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith("/app/self/result/ecr"));
  expect(mock.result).toHaveBeenCalledTimes(2);
  const first = mock.result.mock.calls[0][1];
  const second = mock.result.mock.calls[1][1];
  expect(second.id).toBe(first.id);
  expect(second.completed_at).toBe(first.completed_at);
  expect(mock.upsert.mock.calls.filter(([payload]) => payload.scores).map(([payload]) => payload.id)).toEqual([first.id, first.id]);
});
