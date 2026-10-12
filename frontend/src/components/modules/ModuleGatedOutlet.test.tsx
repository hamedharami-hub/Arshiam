import { lazy } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ModuleGatedOutlet } from "./ModuleGatedOutlet";

vi.mock("@/lib/appModules", () => ({ useModules: () => ({ ready: true }), isPathAllowed: () => true }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));

it("keeps shell navigation rendered while a lazy child is pending", async () => {
  const Pending = lazy(() => new Promise<{ default: () => JSX.Element }>(() => {}));
  render(<MemoryRouter initialEntries={["/app/pending"]}><Routes>
    <Route path="/app" element={<><nav aria-label="Application">Navigation stays</nav><Outlet /></>}>
      <Route element={<ModuleGatedOutlet />}><Route path="pending" element={<Pending />} /></Route>
    </Route>
  </Routes></MemoryRouter>);
  expect(await screen.findByRole("status")).toHaveTextContent("Loading page…");
  expect(screen.getByRole("navigation", { name: "Application" })).toBeVisible();
});
