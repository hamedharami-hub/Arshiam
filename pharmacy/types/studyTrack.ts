export type MainStudyModuleId = 1 | 2 | 3 | 4 | 5 | 6;

export type StudyTrackId =
  | 'track_1_otc_exam'
  | 'track_2_general_practice'
  | 'track_3_oral_viva'
  | 'track_4_otc_pharma'
  | 'track_5_laws_dispense';

export interface LastStudiedItem {
  itemId: string;
  moduleId: MainStudyModuleId;
  title: {
    fa: string;
    en: string;
  };
  category?: {
    fa: string;
    en: string;
  };
  routeContext?: {
    tabId?: string;
    subcategoryId?: string;
    domainId?: string;
    categoryId?: string;
    mode?: string;
    moduleId?: string;
    [key: string]: any;
  };
  timestamp: string; // ISO string
}

export interface ItemStudyRecord {
  viewed: boolean;
  completed: boolean;
  viewedAt?: string;
  completedAt?: string;
  moduleId: MainStudyModuleId;
  title?: {
    fa: string;
    en: string;
  };
  category?: {
    fa: string;
    en: string;
  };
}

export interface StudyMilestone {
  id: string;
  title: {
    fa: string;
    en: string;
  };
  description: {
    fa: string;
    en: string;
  };
  moduleId: MainStudyModuleId;
  targetItemIds: string[];
}

export interface StudyTrackDefinition {
  id: StudyTrackId;
  trackNumber: 1 | 2 | 3 | 4 | 5;
  title: {
    fa: string;
    en: string;
  };
  subtitle: {
    fa: string;
    en: string;
  };
  description: {
    fa: string;
    en: string;
  };
  iconName: string;
  badge: {
    fa: string;
    en: string;
  };
  badgeColor: string;
  primaryModule: MainStudyModuleId;
  targetFocus: {
    fa: string;
    en: string;
  };
  milestones: StudyMilestone[];
}

export interface UserStudyState {
  viewedMap: Record<string, boolean>; // itemId -> boolean
  completedMap: Record<string, boolean>; // itemId -> boolean
  itemRecords: Record<string, ItemStudyRecord>; // itemId -> details
  lastStudiedGlobal: LastStudiedItem | null;
  lastStudiedByModule: Record<number, LastStudiedItem>;
  updatedAt: string;
}

export interface StudyModuleOverviewStats {
  totalItems: number;
  viewedCount: number;
  completedCount: number;
  percentViewed: number;
  percentCompleted: number;
}
