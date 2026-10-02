# ARSHNAZ Release Verification Checklist

This checklist defines the mandatory quality and reliability gates for every ARSHNAZ release on the `fix/core-reliability` branch before tagging or deployment.

---

## 1. Authentication & Session Management
- [ ] **Sign In / Sign Up**: Verify user registration and login with email/password via Firebase Authentication.
- [ ] **Session Persistence**: Refresh the application; confirm session restores without redirecting to `/auth`.
- [ ] **Protected Routes**: Attempt unauthenticated navigation to `/app/today`, `/app/mind`, `/app/settings`; verify immediate redirect to `/auth`.
- [ ] **Sign Out**: Verify clean token revocation and session wipe via `signOut()`. Local storage tokens cleared.
- [ ] **Admin Authorization**: Verify `/app/admin` is only accessible when `useUserRole` resolves `isAdmin === true`. Standard users receive access denial.

---

## 2. Task CRUD & Core Workflows
- [ ] **Creation**: Test task creation from QuickAddTask, QuickCapture (`lov:open-quick-capture`), and new task route.
- [ ] **Inspector & Detail**: Open task in desktop split-view inspector and mobile drawer; verify `TaskDetail` renders metadata (folder, schedule, priority, tags) without layout jitter.
- [ ] **Scheduling & Recurrence**: Set due date, timeblock, recurrence rules (`RecurrenceEditor`), and fuzzy buckets; verify accurate Jalali and Gregorian date handling.
- [ ] **Subtasks & Hierarchy**: Add parent-child task relationships; verify tree calculations (`getTaskProgress`, `buildTaskChildrenMap`) update dynamically.
- [ ] **Completion & Grace Period**: Complete a task; verify strikethrough grace period (`GRACE_MS`), water drop award, and undo availability.
- [ ] **Deletion & Undo**: Delete task; verify confirmation dialog, `pushDeleted` cache, and snackbar undo option.
- [ ] **Drag-and-Drop**: Test manual reordering using `@dnd-kit` in list and kanban views; verify ordering persists on reload.

---

## 3. Offline Replay & Queue Synchronization
- [ ] **Offline Detection**: Toggle DevTools Network to "Offline"; confirm `OfflineIndicator` displays and banner notifies the user.
- [ ] **Local Mutation Enqueueing**: Create, edit, and complete tasks while offline; verify operations are stored in IndexedDB/localStorage queue (`enqueueOp`).
- [ ] **Replay on Reconnection**: Toggle DevTools Network to "Online"; verify all queued operations replay sequentially without 400/500 errors or duplicate documents.
- [ ] **Cache Fallback**: Ensure folders, tags, and cached tasks render immediately when offline via `cacheGet`.

---

## 4. Mind Safety & Clinical Path
- [ ] **Crisis Support (SOS)**: Navigate to `/app/crisis`; verify emergency hotlines for both Australia (Lifeline 13 11 14, Suicide Call Back 1300 659 467) and Iran (123, 1480, 115) load correctly.
- [ ] **Clinical Disclaimer**: Verify that `ClinicalDisclaimer` is displayed across screening and CBT modules, stating ARSHNAZ is an evidence-based self-help tool and not medical diagnosis.
- [ ] **Deterministic Scoring**: Verify screening forms (PHQ-9, GAD-7, WHO-5, Burnout) calculate scores deterministically on client side; verify severity labels match standard psychometric scales.
- [ ] **Weekly Review Metrics**: Verify past-7-day check-in counts and completed mind actions are calculated directly from local Firestore data without AI hallucination.

---

## 5. AI BYOK Setup & Model Integrity
- [ ] **Transparent BYOK Key Management**: Verify Gemini API keys are entered by user and stored locally without transmission to unverified third-party backends.
- [ ] **Model Truthfulness**: Confirm selected model is used as specified. Never silently downgrade or substitute models (e.g., no silent fallback of Gemini 3 to 2.5).
- [ ] **Compatibility Errors**: If an unsupported model is specified, verify a clear, user-facing error message is shown prompting model selection.
- [ ] **Payload Preview & Privacy Opt-In**: Verify `MindWeeklyInsightsDialog` displays the exact JSON payload preview before submitting to AI. User must explicitly confirm before request is sent.
- [ ] **Provider & Model Attribution**: Ensure generated responses indicate the actual AI provider and model used.

---

## 6. PWA, Service Worker & Asset Caching
- [ ] **Web Manifest**: Verify `manifest.webmanifest` contains valid `name`, `icons`, `theme_color`, and `display: standalone`.
- [ ] **Service Worker Lifecycle**: Confirm service worker registers successfully without console errors.
- [ ] **Cache Invalidation**: On new version release, verify update prompt triggers without destroying offline drafts or unpersisted edits.
- [ ] **Asset Caching**: Verify critical fonts, icons, and shell HTML load while in offline mode.

---

## 7. Responsive Sidebar & Navigation
- [ ] **Desktop Expanded Mode**: Verify multi-section accordion (Do, Grow, Mind, Me, Folders, Tags) expands, collapses, and retains state in `localStorage`.
- [ ] **Desktop Compact Rail**: Collapse sidebar; verify icon rail displays pinned shortcuts (Menu, Today, Folders popover, Tags popover) and custom quick links.
- [ ] **Sidebar Width & Position**: Adjust sidebar width slider (220px–360px) and toggle left/right orientation in Settings; verify layout adapts without overlap.
- [ ] **Mobile Sheet & Gestures**: On viewport `< 768px`, open sidebar sheet; verify swipe-to-close gesture (swipe left in LTR / right in RTL) smoothly dismisses sheet.
- [ ] **Automated Layout QA**: Run `npm run qa:layout`; verify strict non-zero exit code on any geometry overlap or layout overflow.

---

## 8. Data Migration & Firestore Security
- [ ] **Rule Isolation**: Verify all Firestore operations read/write strictly under `users/{uid}/*` paths adhering to Firestore security rules.
- [ ] **Zero Supabase Relational Calls**: Audit code to ensure no lingering `firebaseStore.rpc()`, `firebaseStore.functions.invoke()`, or legacy foreign joins exist in active paths.
- [ ] **Unavailable Features**: Ensure disabled/unmigrated features (e.g. cross-user sharing) display honest "Not available in this version" notices rather than broken pages or silent errors.

---

## Verification Sign-off Commands
```bash
# 1. Type check
npm run typecheck

# 2. Linting
npm run lint

# 3. Test suites (all passing)
npm test

# 4. Production build
npm run build

# 5. Optional layout geometry QA
npm run qa:layout
```
