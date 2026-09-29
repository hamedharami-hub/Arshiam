import { useRef } from "react";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";

export const OPEN_MODULES_PANEL_EVENT = "arshnaz:open-modules-panel";
const TAPS_NEEDED = 7;

/** Android-style: tap the version 7 times to open the hidden modules panel. */
export function VersionTapTarget({ children }: { children: React.ReactNode }) {
  const { T } = useBilingual();
  const taps = useRef({ count: 0, last: 0 });

  const onTap = () => {
    const now = Date.now();
    taps.current.count = now - taps.current.last > 1500 ? 1 : taps.current.count + 1;
    taps.current.last = now;
    const left = TAPS_NEEDED - taps.current.count;
    if (left <= 0) {
      taps.current.count = 0;
      window.dispatchEvent(new Event(OPEN_MODULES_PANEL_EVENT));
    } else if (left <= 4) {
      toast.message(T(`${left} ضربهٔ دیگر…`, `${left} more taps…`), { id: "version-taps", duration: 1200 });
    }
  };

  return (
    <button type="button" onClick={onTap} className="inline-flex items-center gap-1 select-none" data-testid="settings-version-tap">
      {children}
    </button>
  );
}
