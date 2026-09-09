'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useStudyTracker as useStudyTrackerHook } from '@/hooks/useStudyTracker';
import {
  UserStudyState,
  LastStudiedItem,
  MainStudyModuleId,
  StudyTrackId,
} from '@/types/studyTrack';
import { User } from '@/lib/firebase';

export type StudyTrackerContextValue = ReturnType<typeof useStudyTrackerHook>;

const StudyTrackerContext = createContext<StudyTrackerContextValue | null>(null);

export const StudyTrackerProvider: React.FC<{
  user?: User | null;
  userUid?: string;
  initialCloudState?: UserStudyState | null;
  children: ReactNode;
}> = ({ user, initialCloudState, children }) => {
  const tracker = useStudyTrackerHook({ user, initialCloudState });

  return (
    <StudyTrackerContext.Provider value={tracker}>
      {children}
    </StudyTrackerContext.Provider>
  );
};

// Safe fallback tracker when called outside of Provider
const DEFAULT_FALLBACK_TRACKER: StudyTrackerContextValue = {
  studyState: {
    viewedMap: {},
    completedMap: {},
    itemRecords: {},
    lastStudiedGlobal: null,
    lastStudiedByModule: {},
    updatedAt: '',
  },
  isLoaded: true,
  markItemViewed: () => {},
  toggleItemCompleted: () => {},
  setItemCompleted: () => {},
  isViewed: () => false,
  isCompleted: () => false,
  getLastStudied: () => null,
  getTrackStats: () => ({
    totalTargetItems: 0,
    completedItems: 0,
    viewedItems: 0,
    percentCompleted: 0,
    percentViewed: 0,
    milestonesProgress: [],
  }),
  getOverallStats: () => ({ viewedCount: 0, completedCount: 0 }),
  resetStudyProgress: () => {},
};

export const useStudyTrackerContext = (): StudyTrackerContextValue => {
  const context = useContext(StudyTrackerContext);
  if (!context) {
    return DEFAULT_FALLBACK_TRACKER;
  }
  return context;
};

// Convenient alias for components consuming the context
export const useStudyTracker = useStudyTrackerContext;
