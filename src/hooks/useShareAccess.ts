import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export type ShareableType = "task" | "note" | "folder";
export type SharePermission = "view" | "comment" | "edit" | "owner" | null;

export interface ShareAccess {
  permission: SharePermission;
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  isOwner: boolean;
  loading: boolean;
  shares: ShareRow[];
}

export interface ShareRow {
  id: string;
  owner_id: string;
  recipient_id: string | null;
  recipient_email: string;
  permission: Exclude<SharePermission, "owner" | null>;
  accepted_at: string | null;
  created_at: string;
}

export function useShareAccess(
  _resourceType: ShareableType,
  _resourceId: string | undefined,
  resourceOwnerId?: string | null,
): ShareAccess {
  const { user } = useAuth();

  const isOwner = useMemo(() => {
    if (!resourceOwnerId) return true;
    return !!user && user.id === resourceOwnerId;
  }, [user, resourceOwnerId]);

  return useMemo(() => {
    const permission: SharePermission = isOwner ? "owner" : null;
    return {
      permission,
      canView: isOwner,
      canComment: isOwner,
      canEdit: isOwner,
      isOwner,
      loading: false,
      shares: [],
    };
  }, [isOwner]);
}
