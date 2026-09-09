import { LucideIcon } from "lucide-react";

export interface BottomTabItemConfig {
  key: string;
  labelFa: string;
  labelEn: string;
  to: string;
  icon: LucideIcon;
  shortcutKey: string;
  shortcutLabel: string;
  badge?: number | string | null;
  match: (pathname: string) => boolean;
}
