/**
 * Universal Mobile Haptic Feedback Engine
 * Provides tactile vibration feedback for native-like mobile feel.
 */

export const triggerHaptic = (pattern: number | number[] = 15) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore if not supported or permission denied
    }
  }
};

export const haptic = {
  /** Ultra-light tap for navigation, chip clicks, and minor toggles */
  light: () => triggerHaptic(10),

  /** Standard tap for button presses, card expands, and modal opens */
  medium: () => triggerHaptic(25),

  /** Distinct bump for important actions, toggles, or drawer switches */
  heavy: () => triggerHaptic(40),

  /** Two-step celebratory pulse for correct answers, successful saves, or study streak */
  success: () => triggerHaptic([15, 60, 25]),

  /** Warning vibration for red flags, incorrect quiz answers, or invalid inputs */
  warning: () => triggerHaptic([35, 70, 35]),

  /** Rapid double-tap for favorites/starred items */
  star: () => triggerHaptic([12, 40, 18]),

  /** Tactile click for card flip in flashcards */
  flip: () => triggerHaptic(18),
};
