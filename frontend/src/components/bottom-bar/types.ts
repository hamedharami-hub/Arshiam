import type { LucideIcon } from "lucide-react";
import { findFeature } from "@/lib/featureRegistry";

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

/** Keep tab-specific shortcuts/matching/descriptions while sharing feature metadata. */
export function withFeatureMetadata<T extends BottomTabItemConfig>(tab: T): T {
  const feature = findFeature(tab.to);
  return feature
    ? { ...tab, to: feature.to, labelFa: feature.nameFa, labelEn: feature.nameEn, icon: feature.icon }
    : tab;
}
