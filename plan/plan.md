# ARSHNAZ (ارشناز) — Unified Design, Bug Fixes and Feature Upgrade

ARSHNAZ is an existing Persian (RTL) app for tasks, notes, habits, mental wellbeing and learning, imported from the GitHub repository hamedharami-hub/Arshiam. The work gives the whole app one consistent TickTick-inspired look, fixes the reported bugs, and upgrades Time Buckets, Life Architect, the calendar, and the Knowledge section. The uploaded handoff document (ARSHIAM_REMAINING_WORK_HANDOFF.fa.md) is the master backlog for the later phases.

## Who it's for
Persian-speaking individuals who manage daily tasks, notes, habits, wellbeing and study (including pharmacy study material) in one place. They use it on desktop, phone and foldable (including the Android build), and want a calm, fast, TickTick-like experience.

## Core features and experience

**Reported bugs to fix (Phase 1)**
- **Top search bar** on Today and the other task pages does not work. It must search tasks and open results.
- **Attachments in Description / Notes**: attaching a link or an image fails. Attaching must work, show upload status, allow retry, and never lose the typed text.
- **Tags**: opening a tag shows all tasks, including ones without that tag. A tag page must show only the tasks that carry it.
- **Planning section** bugs (calendar/schedule, task placement, dates, ordering, task details) are reproduced and fixed. Existing planning features are kept.

**Upgrades (Phase 1)**
- **Time Buckets**: a deep review. The many errors are found and fixed, and the screen is redesigned to be simpler and more useful, with a clear purpose per bucket (daily, weekly, monthly, seasonal, yearly), easy assignment of tasks, and a clear view of what sits in each bucket. Its connection to Smart Lists and filters is kept consistent.
- **Life Architect**: a significant improvement of this section, covering clearer structure from values to goals to plans to tasks/habits, easier creation, progress visibility, and a cleaner layout.
- **Calendar occasions**: Australian occasions (public holidays and notable days) are added next to the Iranian occasions. The user can show or hide each set.
- **Page backgrounds**: each page's background color is saved and kept after reload. A folder can also have a background image, shown faintly behind its content.
- **Knowledge (نالج) — second, deeper review across every part** (notes, diary, pharmacy/lesson reader, folders and topics, tags, search, editor, practice and review links): the whole section is re-examined for usability gaps and bugs, and each part is optimized. This means easier creation, clearer organization and retrieval, better search and filter, tidier cards, a more comfortable editor, faster navigation between folder, lesson and related items, and the same look across all Knowledge screens.
- **Compact lesson/topic header (the toolbar shown in the Knowledge reader screenshot)**: today it takes a lot of vertical space (breadcrumb row, a full row of large buttons, then a tag row). It becomes smaller, minimal and takes much less space:
  - One slim line holding the breadcrumb/title on one side and small icon-only buttons on the other (language, study mode, translate, AI, games/practice, add to calendar, text size, edit, delete), each with a tooltip.
  - Rarely used actions (delete, text size, calendar, and similar) move into a single "more" menu. Only the few most-used actions stay visible.
  - Tags become a single small, scrollable or collapsible line instead of large pills. Tapping expands them.
  - The top "Pharmacy / Practice / Review this topic" strip is merged into the same slim header.
  - The header scrolls away or shrinks while reading, so the lesson text gets the screen. Works on phone, foldable panel and desktop in both languages.
  - All existing actions and tags are kept. Only their size, grouping and placement change.
- **Consistent design across every screen**: one shared set of colors, spacing, type sizes, corner radii, buttons, cards, lists, dialogs, empty states and icons, with correct RTL/LTR behavior, mobile layout and foldable-panel widths.

**Unchanged**: Firebase auth and data, Firestore rules and data structure, storage, the BYOK AI setup, and the Android/Capacitor setup.

## User flow
1. User signs in as today (Firebase).
2. Lands on a refreshed home with the same sections in the sidebar.
3. Searches from the top bar and opens a result.
4. Opens a tag and sees only that tag's tasks.
5. Opens Time Buckets, places tasks into buckets, and reviews each bucket.
6. Opens the calendar and sees Iranian and Australian occasions.
7. Opens Planning, Life Architect and Knowledge, and works with the same look and interaction patterns on every page.
8. Sets a page color or a folder background image, which stays after reload.
9. Attaches images or links in task description and notes.

## UI/UX feel
- Keeps the current color mood, tightened into a consistent system. TickTick is the layout and interaction reference: neat lists, soft cards, subtle dividers, clear priority/date accents, a quiet sidebar.
- Light, dark and OLED appearance stay supported.
- Persian-first typography with good line height. English and Persian are equally well handled.
- Subtle motion only. Every screen has one clear title and one main action, with no duplicated headings or nested boxes.
- After the work, optional visual changes are offered. Nothing beyond the agreed look is changed without approval.

## Implementation phases

**Phase 1 — MVP (built now)**
- Import the repository and run it as-is.
- Reproduce and fix: search bar, attachments (link/image), tag filtering, Planning bugs.
- Time Buckets deep review, fix and simplified redesign.
- Life Architect improvement.
- Iranian + Australian calendar occasions.
- Saved page colors and folder background images.
- Knowledge section: a second full review of all its parts, then optimization of each part.
- Compact, minimal lesson/topic header that uses far less space.
- Unified design pass and mobile/RTL polish across all sections.
- Each handoff item is first checked against the latest code before being changed. Items already done are not rebuilt.

**Phase 2 — Reliability and shared foundations (from the handoff document, not built now)**
- Honest save results ("saved on device / queued / saved to cloud / failed"), protection against old responses overwriting new edits, account-switch safety.
- Multi-step Undo/Redo and draft recovery in note, task description and diary editors, plus versioned backup and restore.
- Reliable AI: provider/key/model settings, test connection, preview → apply/reject → undo, no hidden paid calls.
- Task and planning consistency: one shared definition of dates and filters across lists, Kanban, calendar, Smart Lists and widgets. Pinned and ordered lists applied in Today, Tomorrow, Inbox and This Week. Correct habit statistics, Pomodoro saving, and calendar behavior on fast month changes.
- Notes and diary: fixed toolbar clutter, inline images and files with upload state, full-text search that opens the exact document.
- Mind, self-knowledge, values and goals: step-by-step forms that never lose text, check-in/thought records → tasks → back to the record, personality-test resume, periodic goal review.
- Focus, sleep, contacts and occasions: shared audio controls, focus and breathing sessions feeding stats and Garden, occasion → calendar → reminder, vCard import with preview.
- Settings regrouped into six groups: appearance/language, planning, reminders, AI, account/data/connections, app/updates.

**Phase 3 — Pharmacy learning and final integration (from the handoff document, not built now)**
- Review of the remaining pharmacy lesson groups (clinical, drug and scenario lessons; pharmacology and supplementary collections), checking card titles, order, layout, duplicates and warnings without changing source text, doses, warnings or references.
- Permanent learning-card model: book → collection → branch → lesson → card group → named card, with safe versioned migration, rollback, and no overwriting of user data.
- Notes and annotations anchored to cards, direct image/file upload from phone or Windows with compression, continue-learning position, direct links to cards in both languages, optional review cards created from lessons.
- A reusable template so other (non-medical) books can use the same card system.
- Final integration of learning/review, FRED progress, mind map performance, and release checks.
- Out of scope: the handoff's "future" and "rejected" items (long-term version history, saved task filters, new drug comparison, error-analysis practice), real-account testing, and enabling Shared/Admin features.

## Assumptions
- The repo is imported and runs unchanged first. Only agreed areas are modified.
- Firebase stays as backend and database, with no migration, no change to rules or data shape, and no new backend.
- "Planning" means the planning/scheduling area. Exact bugs are identified by using it, and the user is told what was found and fixed.
- "Knowledge (نالج)" means the notes/knowledge area, including the pharmacy lesson reader. Improvements focus on usability, organization and space, not new storage formats.
- Which header actions stay visible versus go into the "more" menu is decided by how common they are (language, study mode, AI and edit stay visible). The user can adjust this after seeing it.
- Australian occasions use the national public holidays plus well-known observances. State-specific holidays are not included unless asked.
- A folder background image is shown faintly (low opacity) so text stays readable. Page color is chosen per page and saved per user.
- Time Buckets keeps its purpose and its link with Smart Lists, but screen layout and interaction may change substantially for simplicity.
- Life Architect keeps its existing data. Its structure and layout are redesigned, and new fields are added only where needed.
- The existing color mood and current font are kept unless a font renders Persian poorly.
- Testing uses test/sample data only. Real-account testing is excluded, and any limit is reported.
- Pharmacy lesson text, doses, warnings and scientific references are never edited without a valid source.
- Work is delivered step by step, and the user reviews each step before the next.
