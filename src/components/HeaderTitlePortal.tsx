import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BidiText } from "@/components/BidiText";

/** Renders the page title and optional subtitle/date into the sticky app header. */
export function HeaderTitlePortal({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById("app-header-title"));
  }, []);

  if (!host) {
    if (process.env.NODE_ENV === "test" || typeof window === "undefined") {
      return (
        <div data-header-title-fallback className="hidden">
          {children || (
            <BidiText
              as="h1"
              text={title || ""}
              className="text-base sm:text-lg font-bold truncate max-w-[45vw]"
            />
          )}
        </div>
      );
    }
    return null;
  }

  return createPortal(
    children || (
      <div className="flex items-center gap-2 min-w-0">
        <BidiText
          as="h1"
          text={title || ""}
          className="text-base sm:text-lg font-bold truncate shrink-0"
        />
        {subtitle && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground/30 font-light select-none">·</span>
            <div className="text-xs sm:text-sm font-semibold text-foreground/80 truncate">
              {subtitle}
            </div>
          </div>
        )}
      </div>
    ),
    host
  );
}
