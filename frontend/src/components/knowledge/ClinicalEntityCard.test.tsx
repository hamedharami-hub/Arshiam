import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClinicalEntityCard } from "./ClinicalEntityCard";
import type { ConnectedEntity } from "@/lib/pharmacyRelationsHelper";

const makeEntity = (overrides: Partial<ConnectedEntity> = {}): ConnectedEntity => ({
  id: "clinical:medicine:paracetamol",
  title: "پاراستامول",
  titleEn: "Paracetamol",
  type: "product",
  badgeFa: "مادهٔ مؤثره",
  badgeEn: "Active ingredient",
  colorClass: "text-primary",
  ...overrides,
});

describe("ClinicalEntityCard", () => {
  it("opens the mapped document ID, not the registry node ID", () => {
    const onSelect = vi.fn();
    render(<ClinicalEntityCard item={makeEntity({ documentId: "doc-product-panadol" })} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /پاراستامول/i }));

    expect(onSelect).toHaveBeenCalledWith("doc-product-panadol");
  });

  it("does not create a clickable link for an unmapped graph node", () => {
    render(<ClinicalEntityCard item={makeEntity()} onSelect={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/سند مستقلی در ARSHNAZ نگاشت نشده/i)).toBeInTheDocument();
  });
});
