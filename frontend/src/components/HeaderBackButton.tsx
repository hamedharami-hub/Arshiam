import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { isRTL } from "@/i18n";

// Only nested detail routes (e.g. /app/self/test/x) get a back button;
// top-level destinations are reached from the sidebar / bottom bar.
function needsBack(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || parts.length < 3) return false;
  return !["folder", "tag"].includes(parts[1]);
}

export default function HeaderBackButton() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.resolvedLanguage || i18n.language);

  if (!needsBack(loc.pathname)) return null;

  const onClick = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/app/today", { replace: true });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={t("common.back")}
      className="h-10 w-10"
      data-testid="header-back-button"
    >
      {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
    </Button>
  );
}
