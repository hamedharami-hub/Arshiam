import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SleepView from "./SleepView";

const context = vi.hoisted(() => ({ isEn: true }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/SleepSoundsCard", () => ({ SleepSoundsCard: () => <div>Sound controls</div> }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: context.isEn, T: (fa: string, en: string) => context.isEn ? en : fa }) }));
afterEach(cleanup);

describe("SleepView safe presentation", () => {
  it.each([true, false])("keeps sound optional and does not promise sleep or timer outcomes (English=%s)", (isEn) => {
    context.isEn = isEn;
    render(<SleepView />);
    const section = screen.getByRole("region", { name: isEn ? "Limits and safe use" : "حدود و استفاده ایمن" });
    expect(section).toHaveTextContent(isEn ? "not insomnia treatment" : "نه درمان بی‌خوابی");
    expect(section).toHaveTextContent(isEn ? "do not guarantee" : "تضمین نمی‌کنند");
    expect(section).toHaveTextContent(isEn ? "Headphones are optional" : "استفاده از هدفون الزامی نیست");
    expect(section).toHaveTextContent(isEn ? "stop if" : "متوقف کنید");
    expect(section).toHaveTextContent(isEn ? "not that you slept or felt better" : "نه نشانهٔ خوابیدن یا بهبود حال");
    expect(screen.getByText("Sound controls")).toBeInTheDocument();
  });
});
