import { useNavigate } from "react-router-dom";
import { PackageSearch, ClipboardCheck, Keyboard, FlaskConical, Pill } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

const ITEMS = [
  {
    url: "/app/pharmacy-products",
    icon: PackageSearch,
    fa: "محصولات دارویی",
    en: "Products",
    testid: "pharm-shortcut-products",
    tint: "from-pink-500/15 to-rose-500/10 text-pink-600 dark:text-pink-300 border-pink-500/25",
  },
  {
    url: "/app/pharmacy-scenario-practice",
    icon: ClipboardCheck,
    fa: "تمرین سناریو",
    en: "Scenarios",
    testid: "pharm-shortcut-scenario",
    tint: "from-purple-500/15 to-fuchsia-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25",
  },
  {
    url: "/app/pharmacy-fred-practice",
    icon: Keyboard,
    fa: "تمرین FRED",
    en: "FRED",
    testid: "pharm-shortcut-fred",
    tint: "from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25",
  },
  {
    url: "/app/pharmacy-cyp",
    icon: FlaskConical,
    fa: "ماتریس CYP",
    en: "CYP Matrix",
    testid: "pharm-shortcut-cyp",
    tint: "from-sky-500/15 to-blue-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25",
  },
] as const;

/**
 * Quick access to pharmacy tools from the Pharmacy home page.
 */
export default function PharmacyShortcuts() {
  const navigate = useNavigate();
  const { T } = useBilingual();

  return (
    <div className="shrink-0" data-testid="pharmacy-shortcuts">
      <div className="flex items-center gap-1.5 mb-1.5 px-0.5 text-[11px] font-semibold text-muted-foreground">
        <Pill className="w-3.5 h-3.5 text-pink-500" />
        <span>{T("میان‌بر فارماسی", "Pharmacy shortcuts")}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-0.5 px-0.5">
        {ITEMS.map(({ url, icon: Icon, fa, en, testid, tint }) => (
          <button
            key={url}
            type="button"
            data-testid={testid}
            onClick={() => navigate(url)}
            className={`group shrink-0 flex items-center gap-2 rounded-xl border bg-gradient-to-bl ${tint} px-3 py-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 shadow-sm">
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold whitespace-nowrap">{T(fa, en)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
