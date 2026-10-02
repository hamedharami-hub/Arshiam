# Arshnaz Review Plan
## Phase 1: Bilingual + Task inline panels (COMPLETED, user approved)
## Phase 2: "My Island" penalty-free isometric game (COMPLETED - awaiting user feedback)
- src/lib/island.ts (state, materials unlock by lifetime pts, build/move/remove w/ full refund, Firestore sync "island")
- src/components/island/IslandScene.tsx (SVG isometric 8x8), src/pages/IslandView.tsx (/app/island), nav "جزیرهٔ من"
- Points: every garden drop earned (tasks/habits/check-in/focus) also credits island via saveGardenState hook
## Phase 3: Review remaining pages (Not started)
## Phase 2b: Island polish (COMPLETED)
- ZoomPan.tsx: zoom buttons/pinch/ctrl-wheel + drag pan (drag never triggers a tap), mobile starts at 150%
- IslandUnlockCelebration.tsx (global in App.tsx): confetti + chime + card when a material unlocks (ISLAND_UNLOCK_EVENT from creditIsland)
- Real-time day phases (getDayPhase): morning/day/sunset/night sea colors, sun/moon/stars, tint, night window lights
