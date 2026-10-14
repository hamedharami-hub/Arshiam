import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ConcernNav } from "./ConcernNav";
import { beginMindSession, readMindSession } from "@/lib/mind/sessionService";
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
beforeEach(() => localStorage.clear());
it("links tools through the same opaque concern ID without placing private text in URLs", () => {
  const created = beginMindSession("a", "private concern", "en");
  if (created.ok === false) throw new Error(created.reason);
  const id = created.session.id;
  render(<MemoryRouter><ConcernNav ownerId="a" concernId={id} toolId="thoughts" slot={`thoughts:${id}`} /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Explore worry" })).toHaveAttribute("href", `/app/worry?session=${id}`);
  for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).not.toContain("private");
  expect(readMindSession("a", id)).toMatchObject({ ok: true, value: { steps: [{ slot: `thoughts:${id}`, answers: {} }] } });
});
it("does not load or attach another owner's session", () => {
  const created = beginMindSession("a", "private", "en");
  if (created.ok === false) throw new Error(created.reason);
  render(<MemoryRouter><ConcernNav ownerId="b" concernId={created.session.id} toolId="worry" slot="worry" /></MemoryRouter>);
  expect(screen.getByRole("alert")).toHaveTextContent("missing or unreadable");
  expect(screen.queryByRole("link")).toBeNull();
  expect(readMindSession("a", created.session.id)).toMatchObject({ ok: true, value: { steps: [] } });
});
it("retains an explicit optional ending without deleting tool drafts or creating actions", () => {
  const created = beginMindSession("a", "private", "en");
  if (created.ok === false) throw new Error(created.reason);
  render(<MemoryRouter><ConcernNav ownerId="a" concernId={created.session.id} toolId="thoughts" slot="thoughts" /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Set it aside" }));
  expect(readMindSession("a", created.session.id)).toMatchObject({ ok: true, value: { status: "finished", outcome: "set_aside", text: "private", actions: [], steps: [{ slot: "thoughts" }] } });
  expect(screen.getByRole("status")).toHaveTextContent("retained on this device");
});
