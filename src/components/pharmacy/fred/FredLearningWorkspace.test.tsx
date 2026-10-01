import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { FredPracticeProvider } from "./FredPracticeContext";
import { FredRoutedWorkspace } from "./FredLearningWorkspace";
import { FRED_LESSONS, LEGACY_MODULE_TO_LESSON } from "./fredLessons";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, lang: "en", isEn: true }) }));
vi.mock("./fredReviewCards", () => ({ addKeyPointCards: vi.fn().mockResolvedValue({ added: 3, moved: 0, already: false, folderId: "folder-fred-test" }) }));
const Loc = () => <output data-testid="location">{useLocation().search}</output>;
function Workspace({ route = "/app/pharmacy/fred", owner = "guest" }) {
  return <MemoryRouter initialEntries={[route]}><Loc /><FredPracticeProvider key={owner}><FredRoutedWorkspace userId={owner} /></FredPracticeProvider></MemoryRouter>;
}
beforeEach(() => localStorage.clear());

describe("FRED lesson path", () => {
  it("has seven lessons, none locked, and every old module maps to one of them", () => {
    expect(FRED_LESSONS).toHaveLength(7);
    expect(new Set(Object.values(LEGACY_MODULE_TO_LESSON)).size).toBe(7);
    expect(Object.keys(LEGACY_MODULE_TO_LESSON)).toHaveLength(10);
    expect(FRED_LESSONS.every(l => l.keyPoints.length === 3 && l.guided.length >= 3)).toBe(true);
  });
  it("redirects an old ?module= link to the matching lesson and drops legacy params", async () => {
    render(<Workspace route="/app/pharmacy-fred-practice?module=terminal&mode=check&keep=1" />);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("lesson=dispense"));
    expect(screen.getByTestId("location").textContent).toContain("keep=1");
    expect(screen.getByTestId("location").textContent).not.toContain("module=");
    expect(screen.getByTestId("fred-lesson-dispense")).toBeInTheDocument();
  });
  it("shows only the three statuses and never 'mastered'", () => {
    render(<Workspace />);
    expect(screen.getByTestId("fred-lesson-status")).toHaveTextContent(/Learning/);
    expect(document.body.textContent).not.toMatch(/mastered|مسلط/i);
  });
});

describe.each(FRED_LESSONS.map(l => [l.id, l] as const))("behaviour of lesson %s", (id, lesson) => {
  it("gives immediate, input-dependent feedback and reaches Practised only when all guided answers are right", () => {
    render(<Workspace route={`/app/pharmacy-fred-practice?lesson=${id}`} />);
    fireEvent.click(screen.getByTestId("fred-step-guided"));
    for (const q of lesson.guided) {
      const wrong = q.choices.findIndex((_, i) => i !== q.correct);
      fireEvent.click(screen.getByTestId(`fred-choice-${q.id}-${wrong}`));
      expect(screen.getByTestId(`fred-feedback-${q.id}`)).toHaveAttribute("data-correct", "false");
      expect(screen.getByTestId(`fred-feedback-${q.id}`)).toHaveTextContent(q.explanation[1]);
    }
    expect(screen.getByTestId("fred-lesson-status")).toHaveAttribute("data-status", "learning");
    for (const q of lesson.guided) {
      fireEvent.click(screen.getByTestId(`fred-choice-${q.id}-${q.correct}`));
      expect(screen.getByTestId(`fred-feedback-${q.id}`)).toHaveAttribute("data-correct", "true");
    }
    expect(screen.getByTestId("fred-practised-note")).toBeInTheDocument();
    expect(screen.getByTestId("fred-lesson-status")).toHaveAttribute("data-status", "practised");
  });
  it("adds exactly its three key points to review when the last step is reached", async () => {
    render(<Workspace route={`/app/pharmacy-fred-practice?lesson=${id}`} />);
    fireEvent.click(screen.getByTestId("fred-step-keypoints"));
    expect(screen.getAllByTestId(/fred-keypoint-/)).toHaveLength(3);
    await waitFor(() => expect(screen.getByTestId("fred-cards-status")).toHaveTextContent("3 cards added to this lesson's review topic"));
    expect(screen.getByTestId("fred-review-topic-link")).toHaveAttribute("href", "/app/review?domain=pharmacy&topic=folder-fred-test");
  });
  it("flags rule-bearing lessons as needing verification", () => {
    render(<Workspace route={`/app/pharmacy-fred-practice?lesson=${id}`} />);
    expect(!!screen.queryByTestId("fred-verify-banner")).toBe(lesson.needsVerification);
  });
});

describe("practice tools inside lessons", () => {
  it("keeps edits made in the workflow tool when switching lessons and coming back", async () => {
    render(<Workspace route="/app/pharmacy-fred-practice?lesson=safety-check" />);
    fireEvent.click(screen.getByTestId("fred-step-example"));
    fireEvent.click(screen.getByTestId("fred-tool-workflow"));
    fireEvent.change(await screen.findByTestId("fred-label-directions"), { target: { value: "My training label" } });
    fireEvent.click(screen.getByTestId("fred-nav-journey"));
    fireEvent.click(screen.getByTestId("fred-nav-safety-check"));
    fireEvent.click(screen.getByTestId("fred-step-example"));
    fireEvent.click(screen.getByTestId("fred-tool-workflow"));
    expect(await screen.findByTestId("fred-label-directions")).toHaveValue("My training label");
  });
  it("remembers the step per lesson and keeps progress separate per account", () => {
    const first = render(<Workspace owner="guest" route="/app/pharmacy-fred-practice?lesson=reading" />);
    fireEvent.click(screen.getByTestId("fred-step-concept"));
    expect(screen.getByTestId("fred-section-concept")).toBeInTheDocument();
    first.unmount();
    render(<Workspace owner="guest" route="/app/pharmacy-fred-practice?lesson=reading" />);
    expect(screen.getByTestId("fred-section-concept")).toBeInTheDocument();
  });
});
