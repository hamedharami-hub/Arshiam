import React, { useState } from "react";
import { User } from "lucide-react";
import type { Contact, ContactAvatarShape } from "@/lib/contactTypes";
import {
  getContactSymbol,
  getContactShape,
  getContactColor,
} from "@/lib/contactSymbols";

export interface ContactAvatarProps {
  contact?: Partial<Contact> | null;
  photoUrl?: string;
  name?: string;
  avatarIcon?: string;
  avatarColor?: string;
  avatarShape?: ContactAvatarShape;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadgeWithPhoto?: boolean;
}

const sizeClasses = {
  xs: {
    container: "h-6 w-6 text-[10px]",
    icon: 12,
    badge: "h-3 w-3 text-[8px] -bottom-0.5 -end-0.5",
    badgeIcon: 7,
  },
  sm: {
    container: "h-8 w-8 text-xs",
    icon: 15,
    badge: "h-4 w-4 text-[9px] -bottom-0.5 -end-0.5",
    badgeIcon: 9,
  },
  md: {
    container: "h-9 w-9 text-xs",
    icon: 17,
    badge: "h-4 w-4 text-[10px] -bottom-0.5 -end-0.5",
    badgeIcon: 10,
  },
  lg: {
    container: "h-12 w-12 text-sm",
    icon: 22,
    badge: "h-5 w-5 text-xs -bottom-1 -end-1",
    badgeIcon: 12,
  },
  xl: {
    container: "h-16 w-16 text-base",
    icon: 28,
    badge: "h-6 w-6 text-xs -bottom-1 -end-1",
    badgeIcon: 14,
  },
};

export function ContactAvatar({
  contact,
  photoUrl: propPhotoUrl,
  name: propName,
  avatarIcon: propAvatarIcon,
  avatarColor: propAvatarColor,
  avatarShape: propAvatarShape,
  size = "md",
  className = "",
  showBadgeWithPhoto = true,
}: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const photoUrl = propPhotoUrl ?? contact?.photo_url;
  const name = propName ?? contact?.display_name ?? "";
  const avatarIcon = propAvatarIcon ?? contact?.avatar_icon;
  const avatarColor = propAvatarColor ?? contact?.avatar_color;
  const avatarShape = propAvatarShape ?? contact?.avatar_shape;

  const shapeDef = getContactShape(avatarShape);
  const colorDef = getContactColor(avatarColor);
  const symbolDef = getContactSymbol(avatarIcon);
  const s = sizeClasses[size];

  const hasPhoto = Boolean(photoUrl) && !imageError;

  // Render symbol or emoji inside
  const renderSymbolContent = (iconSize: number) => {
    if (symbolDef) {
      const IconComponent = symbolDef.icon;
      return <IconComponent style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
    }

    if (avatarIcon && avatarIcon.trim()) {
      return (
        <span
          className="leading-none select-none flex items-center justify-center"
          style={{ fontSize: Math.max(10, Math.floor(iconSize * 1.1)) }}
        >
          {avatarIcon.trim()}
        </span>
      );
    }

    const initials = name.trim().slice(0, 2);
    if (initials) {
      return <span className="font-bold select-none">{initials}</span>;
    }

    return <User style={{ width: iconSize, height: iconSize }} className="shrink-0" />;
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`relative overflow-hidden flex items-center justify-center font-bold border transition-colors select-none ${s.container} ${shapeDef.className} ${colorDef.bgClass} ${colorDef.textClass} ${colorDef.borderClass}`}
      >
        {hasPhoto ? (
          <img
            src={photoUrl}
            alt={name || "Contact"}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          renderSymbolContent(s.icon)
        )}
      </div>

      {/* Mini badge for symbol when photo is visible */}
      {hasPhoto && avatarIcon && showBadgeWithPhoto && (
        <div
          title={symbolDef ? symbolDef.labelFa : avatarIcon}
          className={`absolute rounded-full border border-background shadow-xs flex items-center justify-center z-10 ${s.badge} ${colorDef.bgClass} ${colorDef.textClass}`}
        >
          {symbolDef ? (
            <symbolDef.icon style={{ width: s.badgeIcon, height: s.badgeIcon }} />
          ) : (
            <span className="leading-none">{avatarIcon.trim()}</span>
          )}
        </div>
      )}
    </div>
  );
}
