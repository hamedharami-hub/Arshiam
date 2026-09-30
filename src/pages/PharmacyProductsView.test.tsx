import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyProductsView from "./PharmacyProductsView";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const { languageState } = vi.hoisted(() => ({ languageState: { lang: "en" as "en" | "fa" } }));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => languageState.lang === "en" ? en : fa,
  }),
}));

describe("PharmacyProductsView", () => {
  beforeEach(() => { languageState.lang = "en"; });
  const renderView = () => render(<MemoryRouter><PharmacyProductsView /></MemoryRouter>);

  it("renders bilingual catalogue controls without the introductory warning", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Pharmacy product catalogue" })).toBeInTheDocument();
    expect(screen.queryByText(/This snapshot was imported/)).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by subcategory" })).toBeInTheDocument();
    expect(screen.getByText("121 of 121 products")).toBeInTheDocument();
  });

  it("uses right-to-left layout and Persian labels when Persian is selected", () => {
    languageState.lang = "fa";
    renderView();
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "فهرست محصولات دارویی" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "جست‌وجوی محصولات" })).toBeInTheDocument();
  });

  it("filters results and opens a detail panel linked to its full article", () => {
    renderView();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Panadol" } });

    const productButton = screen.getByRole("button", { name: "View Panadol 500mg" });
    expect(productButton).toBeInTheDocument();
    expect(screen.getByText(/^\d+ of 121 products$/)).toBeInTheDocument();
    fireEvent.click(productButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read full article in the app" })).toHaveAttribute("href", "/app/knowledge?docId=doc-product-prod-panadol-500");
    expect(screen.queryByText(/This panel shows index metadata only/)).not.toBeInTheDocument();
  });

  it("shows an empty state for a missing search and can reset search", () => {
    renderView();
    const search = screen.getByRole("searchbox", { name: "Search products" });
    fireEvent.change(search, { target: { value: "no product with this name" } });
    expect(screen.getByRole("heading", { name: "No products found" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("121 of 121 products")).toBeInTheDocument();
  });

  it("restores the filtered catalogue after reading a linked article and going back", () => {
    const Article = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate(-1)}>Back to catalogue</button>;
    };
    render(
      <MemoryRouter initialEntries={["/app/pharmacy-products"]}>
        <Routes>
          <Route path="/app/pharmacy-products" element={<PharmacyProductsView />} />
          <Route path="/app/knowledge" element={<Article />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Panadol" } });
    fireEvent.click(screen.getByRole("button", { name: "View Panadol 500mg" }));
    fireEvent.click(screen.getByRole("link", { name: "Read full article in the app" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to catalogue" }));
    expect(screen.getByRole("searchbox", { name: "Search products" })).toHaveValue("Panadol");
    expect(screen.getByRole("button", { name: "View Panadol 500mg" })).toBeInTheDocument();
  });
});
