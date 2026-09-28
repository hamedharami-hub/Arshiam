import { Sparkles, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getOpConfig, type AIOperation } from "@/lib/aiSettings";

/**
 * Tiny badge shown next to AI actions, telling the user which model
 * will be used for that section and offering a one-tap link to change it.
 *
 * Example:
 *   <AIOpBadge op="summarize_note" />
 */
export function AIOpBadge({ op, className = "" }: { op: AIOperation; className?: string }) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const navigate = useNavigate();
  const cfg = getOpConfig(op);
  const short = cfg.model.split("/").pop() || cfg.model;
  return (
    <button
      type="button"
      onClick={() => navigate(`/app/settings#ai-op-${op}`)}
      className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition opacity-80 hover:opacity-100 ${className}`}
      title={isEn ? "Change AI model for this section" : "تغییر مدل AI این بخش"}
    >
      <Sparkles className="w-3 h-3 text-primary/70" />
      <span className="font-mono">{short}</span>
      <Settings2 className="w-3 h-3" />
    </button>
  );
}

export default AIOpBadge;
