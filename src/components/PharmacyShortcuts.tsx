import { Link } from "react-router-dom";
import { PackageSearch, ClipboardCheck, Keyboard, FlaskConical, ChevronLeft } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

const ITEMS = [
  {
    url: "/app/pharmacy-products",
    icon: PackageSearch,
    fa: "محصولات دارویی",
    en: "Products",
    testid: "pharm-shortcut-products",
  },
  {
    url: "/app/pharmacy-scenario-practice",
    icon: ClipboardCheck,
    fa: "تمرین سناریو",
    en: "Scenarios",
    testid: "pharm-shortcut-scenario",
  },
  {
    url: "/app/pharmacy-fred-practice",
    icon: Keyboard,
    fa: "تمرین FRED",
    en: "FRED",
    testid: "pharm-shortcut-fred",
  },
  {
    url: "/app/pharmacy-cyp",
    icon: FlaskConical,
    fa: "ماتریس CYP",
    en: "CYP Matrix",
    testid: "pharm-shortcut-cyp",
  },
] as const;

/**
 * Quick access to pharmacy tools from the Pharmacy home page.
 */
export default function PharmacyShortcuts() {
  const { T } = useBilingual();

  return (
    <nav className="pharmacy-shortcuts" data-testid="pharmacy-shortcuts" aria-label={T("ابزارهای فارماسی", "Pharmacy tools")}>
        {ITEMS.map(({ url, icon: Icon, fa, en, testid }) => (
          <Link
            key={url}
            to={url}
            data-testid={testid}
            className="pharmacy-shortcut"
          >
            <Icon className="pharmacy-shortcut-icon" aria-hidden="true" />
            <span>{T(fa, en)}</span>
            <ChevronLeft className="pharmacy-shortcut-arrow" aria-hidden="true" />
          </Link>
        ))}
    </nav>
  );
}
