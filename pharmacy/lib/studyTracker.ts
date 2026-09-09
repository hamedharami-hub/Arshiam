import { UserStudyState, LastStudiedItem, MainStudyModuleId, StudyTrackId } from '@/types/studyTrack';
import { STUDY_TRACKS_DATABASE } from '@/data/studyTracksData';

export const STUDY_TRACKER_STORAGE_KEY = 'AU_PHARMACY_STUDY_TRACKER_V1';

export const DEFAULT_USER_STUDY_STATE: UserStudyState = {
  viewedMap: {},
  completedMap: {},
  itemRecords: {},
  lastStudiedGlobal: null,
  lastStudiedByModule: {},
  updatedAt: new Date().toISOString(),
};

/**
 * Safely loads user study state from localStorage
 */
export function getLocalStudyState(): UserStudyState {
  if (typeof window === 'undefined') return DEFAULT_USER_STUDY_STATE;
  try {
    const raw = localStorage.getItem(STUDY_TRACKER_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_STUDY_STATE;
    const parsed = JSON.parse(raw);
    return {
      viewedMap: parsed.viewedMap || {},
      completedMap: parsed.completedMap || {},
      itemRecords: parsed.itemRecords || {},
      lastStudiedGlobal: parsed.lastStudiedGlobal || null,
      lastStudiedByModule: parsed.lastStudiedByModule || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to load study tracker state from localStorage:', err);
    return DEFAULT_USER_STUDY_STATE;
  }
}

/**
 * Safely saves user study state to localStorage
 */
export function saveLocalStudyState(state: UserStudyState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STUDY_TRACKER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save study tracker state to localStorage:', err);
  }
}

/**
 * Calculate progress statistics for a given track
 */
export function calculateTrackProgress(
  trackId: StudyTrackId,
  state: UserStudyState
): {
  totalTargetItems: number;
  completedItems: number;
  viewedItems: number;
  percentCompleted: number;
  percentViewed: number;
  milestonesProgress: {
    milestoneId: string;
    total: number;
    completed: number;
    viewed: number;
    percent: number;
  }[];
} {
  const track = STUDY_TRACKS_DATABASE.find((t) => t.id === trackId);
  if (!track) {
    return {
      totalTargetItems: 0,
      completedItems: 0,
      viewedItems: 0,
      percentCompleted: 0,
      percentViewed: 0,
      milestonesProgress: [],
    };
  }

  const allTrackItemIds = new Set<string>();
  const milestonesProgress = track.milestones.map((m) => {
    let completed = 0;
    let viewed = 0;
    m.targetItemIds.forEach((id) => {
      allTrackItemIds.add(id);
      if (state.completedMap[id]) completed++;
      if (state.viewedMap[id]) viewed++;
    });
    const total = m.targetItemIds.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      milestoneId: m.id,
      total,
      completed,
      viewed,
      percent,
    };
  });

  const totalTargetItems = allTrackItemIds.size;
  let totalCompleted = 0;
  let totalViewed = 0;

  allTrackItemIds.forEach((id) => {
    if (state.completedMap[id]) totalCompleted++;
    if (state.viewedMap[id]) totalViewed++;
  });

  const percentCompleted =
    totalTargetItems > 0 ? Math.round((totalCompleted / totalTargetItems) * 100) : 0;
  const percentViewed =
    totalTargetItems > 0 ? Math.round((totalViewed / totalTargetItems) * 100) : 0;

  return {
    totalTargetItems,
    completedItems: totalCompleted,
    viewedItems: totalViewed,
    percentCompleted,
    percentViewed,
    milestonesProgress,
  };
}
