import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ axis: vi.fn(), line: vi.fn(), area: vi.fn() }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  XAxis: (props: unknown) => { mocks.axis(props); return null; },
  YAxis: () => null, Tooltip: () => null,
  Line: (props: unknown) => { mocks.line(props); return null; },
  Area: (props: unknown) => { mocks.area(props); return null; },
}));
import { dateScaledTrend, heatmapScore, metricSegments, MindMetricTable, MindTrendCharts, type MindTrendDataPoint } from "./MindTrendCharts";
const T = (_fa: string, en: string) => en;
const point = (rawDate: string, mood: number | null): MindTrendDataPoint => ({ rawDate, date: rawDate, fullDate: rawDate, mood, energy: null, focus: null, stress: null });

describe("Honest trend data", () => {
  it("keeps missing and unrated days distinct from actual scores", () => {
    expect(heatmapScore()).toEqual({ status: "missing", score: null });
    expect(heatmapScore({ mood: null, energy: null, focus: null })).toEqual({ status: "unrated", score: null });
    expect(heatmapScore({ mood: 2, energy: null, focus: 6 })).toEqual({ status: "rated", score: 2 });
    expect(heatmapScore({ mood: 2, energy: null, focus: 6 }, "focus")).toEqual({ status: "rated", score: 6 });
    expect(heatmapScore({ mood: 0 })).toEqual({ status: "unrated", score: null });
  });

  it("uses elapsed dates and splits lines at unrated and unlogged days", () => {
    const trend = [point("2026-10-01", 2), point("2026-10-02", 4), point("2026-10-03", null), point("2026-10-04", 8), point("2026-10-07", 6)];
    const dated = dateScaledTrend(trend);
    expect(dated).toHaveLength(7);
    expect(dated[4]).toEqual(expect.objectContaining({ rawDate: "2026-10-05", mood: null }));
    expect(dated[6].timestamp - dated[3].timestamp).toBe(3 * 86400000);
    expect(metricSegments(trend, "mood").map((segment) => segment.map((value) => value.value))).toEqual([[2, 4], [8], [6]]);
  });

  it("provides a metric summary and semantic table with explicit no-rating cells", () => {
    render(<MindMetricTable trend={[point("2026-10-01", 3), point("2026-10-03", null)]} metrics={["mood", "stress"]} isEn T={T} />);
    expect(screen.getByTestId("mind-metric-data")).toHaveTextContent("Mood: 1 logged ratings · Stress: 0 logged ratings");
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByText("No rating")).toHaveLength(5);
  });

  it("provides actual weeks, touch/keyboard controls, detail and a fallback without a duplicate chart", () => {
    render(<MindTrendCharts showStreak={false} streak={0} thoughtCount={0} abcCount={0} topDistortions={[]} isEn T={T}
      trend={[point("2026-10-01", 3), point("2026-10-03", 8)]}
      heatmap={[
        { date: "2026-10-01", jalaliDate: "Missing day", status: "missing", score: null },
        { date: "2026-10-02", jalaliDate: "Unrated day", status: "unrated", score: null },
        { date: "2026-10-03", jalaliDate: "Rated day", status: "rated", score: 6 },
      ]} />);
    expect(screen.getByRole("button", { name: "Missing day · No entry" })).toHaveAttribute("title", "Missing day · No entry");
    expect(screen.getByRole("button", { name: "Unrated day · Entry without ratings" })).toHaveAttribute("title", "Unrated day · Entry without ratings");
    const rated = screen.getByRole("button", { name: "Rated day · 6.0/10" });
    expect(rated).toHaveAttribute("type", "button");
    fireEvent.click(rated);
    expect(screen.getByText("Mood · Rated day · 6.0/10")).toBeInTheDocument();
    expect(screen.getAllByTestId("mind-calendar-week").every((week) => week.children.length === 7)).toBe(true);
    expect(screen.getByRole("table", { hidden: true })).toBeInTheDocument();
    expect(mocks.axis).not.toHaveBeenCalled();
  });
});
