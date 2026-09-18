import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders page-specific action buttons into the sticky app header (next to search/AI buttons). */
export function HeaderActionsPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById("app-header-actions"));
  }, []);

  if (!host) {
    if (process.env.NODE_ENV === "test" || typeof window === "undefined") {
      return <div data-header-actions-fallback>{children}</div>;
    }
    return null;
  }

  return createPortal(children, host);
}
