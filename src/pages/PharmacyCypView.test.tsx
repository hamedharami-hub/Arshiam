import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PharmacyCypView from "./PharmacyCypView";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ lang: "en", T: (_fa: string, en: string) => en }) }));

describe("PharmacyCypView", () => {
  it("filters the matrix and adds medicines to the checker", () => {
    render(<PharmacyCypView />);
    expect(screen.getByTestId("cyp-disclaimer")).toHaveTextContent("Educational and unreviewed");
    fireEvent.change(screen.getByTestId("cyp-matrix-search"), { target: { value: "simvastatin" } });
    expect(screen.getAllByTestId("cyp-matrix-row")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("cyp-add-simvastatin"));
    expect(screen.getByTestId("cyp-add-simvastatin")).toBeDisabled();
  });

  it("checks two medicines and shows the source pair plus rule findings", () => {
    render(<PharmacyCypView />);
    fireEvent.change(screen.getByTestId("cyp-matrix-search"), { target: { value: "simvastatin" } });
    fireEvent.click(screen.getByTestId("cyp-add-simvastatin"));
    fireEvent.change(screen.getByTestId("cyp-matrix-search"), { target: { value: "clarithromycin" } });
    fireEvent.click(screen.getByTestId("cyp-add-clarithromycin"));
    fireEvent.mouseDown(screen.getByTestId("cyp-tab-checker"));
    fireEvent.click(screen.getByTestId("cyp-tab-checker"));
    expect(screen.getAllByTestId("cyp-source-pair").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("cyp-rule-finding")[0]).toHaveTextContent("Clarithromycin may raise Simvastatin exposure");
  });
});
