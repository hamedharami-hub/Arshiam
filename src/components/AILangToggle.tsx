import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AILanguage } from "@/lib/ai";

export function AILangToggle({
  value, onChange, className = "",
}: { value: AILanguage; onChange: (v: AILanguage) => void; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages className="w-3.5 h-3.5 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as AILanguage)}>
        <SelectTrigger className="h-7 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fa" className="text-xs">🇮🇷 فارسی</SelectItem>
          <SelectItem value="en" className="text-xs">🇬🇧 English</SelectItem>
          <SelectItem value="auto" className="text-xs">🌐 خودکار</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
