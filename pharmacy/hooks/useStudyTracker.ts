'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserStudyState,
  LastStudiedItem,
  MainStudyModuleId,
  StudyTrackId,
  ItemStudyRecord,
} from '@/types/studyTrack';
import {
  getLocalStudyState,
  saveLocalStudyState,
  DEFAULT_USER_STUDY_STATE,
  calculateTrackProgress,
} from '@/lib/studyTracker';
import { User, saveUserDataToFirestore } from '@/lib/firebase';

interface UseStudyTrackerProps {
  user?: User | null;
  initialCloudState?: UserStudyState | null;
}

export function useStudyTracker({ user, initialCloudState }: UseStudyTrackerProps = {}) {
  const [studyState, setStudyState] = useState<UserStudyState>(DEFAULT_USER_STUDY_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceCloudTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize local study state on mount to prevent SSR hydration mismatches
  useEffect(() => {
    const local = getLocalStudyState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudyState(local);
    setIsLoaded(true);
  }, []);

  // 2. Sync incoming cloud state if available
  useEffect(() => {
    if (!initialCloudState) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudyState((prev) => {
      // Merge strategy: newer timestamp or union of completed items
      const mergedViewed = { ...prev.viewedMap, ...(initialCloudState.viewedMap || {}) };
      const mergedCompleted = { ...prev.completedMap, ...(initialCloudState.completedMap || {}) };
      const mergedRecords = { ...prev.itemRecords, ...(initialCloudState.itemRecords || {}) };
      const mergedByModule = {
        ...prev.lastStudiedByModule,
        ...(initialCloudState.lastStudiedByModule || {}),
      };

      const newState: UserStudyState = {
        viewedMap: mergedViewed,
        completedMap: mergedCompleted,
        itemRecords: mergedRecords,
        lastStudiedGlobal: initialCloudState.lastStudiedGlobal || prev.lastStudiedGlobal,
        lastStudiedByModule: mergedByModule,
        updatedAt: new Date().toISOString(),
      };

      saveLocalStudyState(newState);
      return newState;
    });
  }, [initialCloudState, isLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceCloudTimer.current) {
        clearTimeout(debounceCloudTimer.current);
      }
    };
  }, []);

  // Helper to persist state to LocalStorage and optionally schedule cloud sync
  const commitState = useCallback(
    (updater: (prev: UserStudyState) => UserStudyState) => {
      setStudyState((prev) => {
        const next = updater(prev);
        saveLocalStudyState(next);

        // Debounce Firestore save if user is logged in
        if (user) {
          if (debounceCloudTimer.current) {
            clearTimeout(debounceCloudTimer.current);
          }
          debounceCloudTimer.current = setTimeout(() => {
            saveUserDataToFirestore(user.uid, {
              studyTracker: next,
            }).catch((err) => {
              console.error('Failed to sync study tracker to Firestore:', err);
            });
          }, 1200);
        }

        return next;
      });
    },
    [user]
  );

  /**
   * Automatically marks an item as viewed (e.g. when opened or clicked)
   */
  const markItemViewed = useCallback(
    (
      moduleId: MainStudyModuleId,
      itemId: string,
      title: { fa: string; en: string },
      category?: { fa: string; en: string },
      routeContext?: LastStudiedItem['routeContext']
    ) => {
      if (!itemId) return;
      const now = new Date().toISOString();

      commitState((prev) => {
        const currentRecord = prev.itemRecords[itemId] || {
          viewed: false,
          completed: false,
          moduleId,
        };

        const newRecord: ItemStudyRecord = {
          ...currentRecord,
          viewed: true,
          viewedAt: currentRecord.viewedAt || now,
          moduleId,
          title,
          category,
        };

        const lastItem: LastStudiedItem = {
          itemId,
          moduleId,
          title,
          category,
          routeContext,
          timestamp: now,
        };

        return {
          ...prev,
          viewedMap: {
            ...prev.viewedMap,
            [itemId]: true,
          },
          itemRecords: {
            ...prev.itemRecords,
            [itemId]: newRecord,
          },
          lastStudiedGlobal: lastItem,
          lastStudiedByModule: {
            ...prev.lastStudiedByModule,
            [moduleId]: lastItem,
          },
          updatedAt: now,
        };
      });
    },
    [commitState]
  );

  /**
   * Toggles the completed / mastered status of an item
   */
  const toggleItemCompleted = useCallback(
    (
      moduleId: MainStudyModuleId,
      itemId: string,
      title: { fa: string; en: string },
      category?: { fa: string; en: string }
    ) => {
      if (!itemId) return;
      const now = new Date().toISOString();

      commitState((prev) => {
        const currentlyCompleted = !!prev.completedMap[itemId];
        const nextCompleted = !currentlyCompleted;

        const currentRecord = prev.itemRecords[itemId] || {
          viewed: true,
          completed: false,
          moduleId,
        };

        const newRecord: ItemStudyRecord = {
          ...currentRecord,
          viewed: true,
          viewedAt: currentRecord.viewedAt || now,
          completed: nextCompleted,
          completedAt: nextCompleted ? now : undefined,
          moduleId,
          title,
          category,
        };

        const lastItem: LastStudiedItem = {
          itemId,
          moduleId,
          title,
          category,
          timestamp: now,
        };

        return {
          ...prev,
          viewedMap: {
            ...prev.viewedMap,
            [itemId]: true,
          },
          completedMap: {
            ...prev.completedMap,
            [itemId]: nextCompleted,
          },
          itemRecords: {
            ...prev.itemRecords,
            [itemId]: newRecord,
          },
          lastStudiedGlobal: lastItem,
          lastStudiedByModule: {
            ...prev.lastStudiedByModule,
            [moduleId]: lastItem,
          },
          updatedAt: now,
        };
      });
    },
    [commitState]
  );

  /**
   * Explicitly sets completed status
   */
  const setItemCompleted = useCallback(
    (
      moduleId: MainStudyModuleId,
      itemId: string,
      completed: boolean,
      title: { fa: string; en: string },
      category?: { fa: string; en: string }
    ) => {
      if (!itemId) return;
      const now = new Date().toISOString();

      commitState((prev) => {
        const currentRecord = prev.itemRecords[itemId] || {
          viewed: true,
          completed: false,
          moduleId,
        };

        const newRecord: ItemStudyRecord = {
          ...currentRecord,
          viewed: true,
          viewedAt: currentRecord.viewedAt || now,
          completed,
          completedAt: completed ? now : undefined,
          moduleId,
          title,
          category,
        };

        return {
          ...prev,
          viewedMap: {
            ...prev.viewedMap,
            [itemId]: true,
          },
          completedMap: {
            ...prev.completedMap,
            [itemId]: completed,
          },
          itemRecords: {
            ...prev.itemRecords,
            [itemId]: newRecord,
          },
          updatedAt: now,
        };
      });
    },
    [commitState]
  );

  /**
   * Check whether an item was viewed
   */
  const isViewed = useCallback(
    (itemId: string) => {
      return !!studyState.viewedMap[itemId];
    },
    [studyState.viewedMap]
  );

  /**
   * Check whether an item is mastered/completed
   */
  const isCompleted = useCallback(
    (itemId: string) => {
      return !!studyState.completedMap[itemId];
    },
    [studyState.completedMap]
  );

  /**
   * Get the last studied item (global or module-specific)
   */
  const getLastStudied = useCallback(
    (moduleId?: MainStudyModuleId) => {
      if (moduleId) {
        return studyState.lastStudiedByModule[moduleId] || null;
      }
      return studyState.lastStudiedGlobal || null;
    },
    [studyState.lastStudiedByModule, studyState.lastStudiedGlobal]
  );

  /**
   * Get progress for a specific study track
   */
  const getTrackStats = useCallback(
    (trackId: StudyTrackId) => {
      return calculateTrackProgress(trackId, studyState);
    },
    [studyState]
  );

  /**
   * Get overall summary statistics
   */
  const getOverallStats = useCallback(() => {
    const viewedCount = Object.values(studyState.viewedMap).filter(Boolean).length;
    const completedCount = Object.values(studyState.completedMap).filter(Boolean).length;
    return {
      viewedCount,
      completedCount,
    };
  }, [studyState]);

  /**
   * Reset all study tracking
   */
  const resetStudyProgress = useCallback(() => {
    commitState(() => ({
      ...DEFAULT_USER_STUDY_STATE,
      updatedAt: new Date().toISOString(),
    }));
  }, [commitState]);

  return {
    studyState,
    isLoaded,
    markItemViewed,
    toggleItemCompleted,
    setItemCompleted,
    isViewed,
    isCompleted,
    getLastStudied,
    getTrackStats,
    getOverallStats,
    resetStudyProgress,
  };
}
