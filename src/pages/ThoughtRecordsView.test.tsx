import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ThoughtRecordsView from "./ThoughtRecordsView";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: (() => {
    const user = { id: "synthetic-user" };
    return () => ({ user, loading: false });
  })(),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({ isEn: false, T: (fa: string) => fa }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}));

vi.mock("@/lib/firestoreDataService", () => ({
  subscribeThoughtRecords: (_userId: string, onChange: (records: unknown[]) => void) => {
    onChange([]);
    return vi.fn();
  },
  upsertThoughtRecord: vi.fn(),
}));

describe("ThoughtRecordsView route", () => {
  it("renders when opened directly at /app/thoughts", () => {
    render(
      <MemoryRouter initialEntries={["/app/thoughts"]}>
        <Routes>
          <Route path="/app/thoughts" element={<ThoughtRecordsView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "ثبت افکار (CBT)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ثبت جدید" })).toBeInTheDocument();
  });
});
