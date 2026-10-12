import { LucideIcon } from "lucide-react";

export interface BottomTabItemConfig {
  key: string;
  labelFa: string;
  labelEn: string;
  /**
   * Optional compact label shown under the icon in the mobile bottom bar.
   * Falls back to `labelFa`/`labelEn` when omitted.
   */
  shortLabelFa?: string;
  shortLabelEn?: string;
  to: string;
  icon: LucideIcon;
  shortcutKey: string;
  shortcutLabel: string;
  badge?: number | string | null;
  match: (pathname: string) => boolean;
}
