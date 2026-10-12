import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./sheet";

const locale = vi.hoisted(() => ({ language: "fa" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: locale }) }));

describe("Sheet bidi", () => {
  it.each(["fa", "en"])("uses a logical end side and named 44px close control in %s", language => {
    locale.language = language;
    render(<Sheet open><SheetContent><SheetHeader data-testid="header"><SheetTitle>Details</SheetTitle><SheetDescription>Details editor</SheetDescription></SheetHeader></SheetContent></Sheet>);
    const dialog = screen.getByRole("dialog", { name: "Details" });
    expect(dialog).toHaveAttribute("dir", language === "en" ? "ltr" : "rtl");
    expect(dialog).toHaveClass("end-0", "border-s");
    expect(screen.getByTestId("header")).toHaveClass("sm:text-start");
    expect(screen.getByRole("button", { name: language === "en" ? "Close" : "بستن" })).toHaveClass("end-2", "h-11", "w-11");
  });
  it("retains explicit physical sides and permits an explicit portal direction", () => {
    render(<Sheet open><SheetContent side="left" dir="ltr"><SheetTitle>Physical</SheetTitle><SheetDescription>Physical drawer</SheetDescription></SheetContent></Sheet>);
    expect(screen.getByRole("dialog", { name: "Physical" })).toHaveClass("left-0");
    expect(screen.getByRole("dialog", { name: "Physical" })).toHaveAttribute("dir", "ltr");
  });
});
