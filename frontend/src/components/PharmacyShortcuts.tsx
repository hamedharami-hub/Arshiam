import { Link } from "react-router-dom";
import { PackageSearch, ClipboardCheck, Keyboard, FlaskConical, ChevronLeft } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

const ITEMS = [
  {
    url: "/app/pharmacy-products",
    icon: PackageSearch,
    fa: "محصولات دارویی",
    descFa: "جست‌وجوی سریع مدخل‌ها",
    descEn: "Quick product lookup",
    en: "Products",
    testid: "pharm-shortcut-products",
  },
  {
    url: "/app/pharmacy-scenario-practice",
    icon: ClipboardCheck,
    fa: "تمرین سناریو",
    descFa: "پرونده‌های مرحله‌به‌مرحله",
    descEn: "Step-by-step cases",
    en: "Scenarios",
    testid: "pharm-shortcut-scenario",
  },
  {
    url: "/app/pharmacy-fred-practice",
    icon: Keyboard,
    fa: "تمرین FRED",
    descFa: "یادگیری کار داروخانه",
    descEn: "Learn the dispensing flow",
    en: "FRED",
    testid: "pharm-shortcut-fred",
  },
  {
    url: "/app/pharmacy-cyp",
    icon: FlaskConical,
    fa: "ماتریس CYP",
    descFa: "آنزیم‌ها و تداخل‌ها",
    descEn: "Enzymes and interactions",
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
        {ITEMS.map(({ url, icon: Icon, fa, en, descFa, descEn, testid }) => (
          <Link
            key={url}
            to={url}
            data-testid={testid}
            className="pharmacy-shortcut"
          >
            <Icon className="pharmacy-shortcut-icon" aria-hidden="true" />
            <span className="pharmacy-shortcut-text"><b>{T(fa, en)}</b><small>{T(descFa, descEn)}</small></span>
            <ChevronLeft className="pharmacy-shortcut-arrow" aria-hidden="true" />
          </Link>
        ))}
    </nav>
  );
}
