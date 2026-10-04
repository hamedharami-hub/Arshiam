# ARSHNAZ (ارشناز) — Import, Run, and Simplify Task Scheduling

ARSHNAZ is an existing Persian/English app for tasks, notes, habits and wellbeing. It has planning, diary, health and Pomodoro pages, plus a gamified island and an angel companion.
This work brings the existing GitHub app (hamedharami-hub/Arshiam) into this workspace and runs it as-is. It then redesigns the task "When" and "Planning" pickers to be icon-led, and removes Time block, Part of day and Deadline from the whole app.

## Who it's for

- Persian- and English-speaking individuals who want one place for daily tasks, notes, habits and mental-health support.
- The repository owner, who needs the app running at the preview URL and wants a simpler task scheduling experience.

## Core features and experience

Everything below already exists in the repository and is carried over unchanged, except where the "Task scheduling changes" section says otherwise.

- Sign-in with email/password and Google, using the project's existing Firebase Authentication.
- Tasks with a detail view, notes, diary, mind, health, Pomodoro and knowledge pages.
- Gamified island: points, weekly gift progress, residents with editable names and friendly phrases, a snapshot album (stored on the device only), and an island card on the Today page.
- Angel companion with appearance and motion settings.
- Light and dark themes, RTL (Persian) and LTR (English) layouts, desktop and mobile.
- AI features keep the current bring-your-own-key model. Users enter their own key, and it stays in the browser.
- User data stays in the existing Firebase Firestore and Storage, private per user.

### Task scheduling changes (proposed design, for your approval)

**1. "When" picker, opened from the task detail.** It becomes one compact, icon-led panel. There are no text-labelled rows or sections.

- **Top row, quick day buttons (icons):** Today (sun icon), Tomorrow (sunrise icon), Next week (calendar-forward icon), No date (calendar-with-slash icon). The selected one is highlighted in rose-gold. Each icon has a small tooltip, or a long-press label on mobile, for clarity.
- **Middle, a month calendar:** shown directly in the panel and not behind a "Pick a date…" row. Tapping a day selects it. Persian users see the Jalali calendar and English users see the Gregorian one, as the app does today.
- **Bottom, two icon rows with no heading text:**
  - Clock icon followed by the chosen time (for example "۰۸:۳۰"). Tapping it opens a simple hour/minute wheel to set the exact time. A small "x" clears it. The row is disabled until a day is chosen.
  - Repeat icon followed by the current rule (for example "هر هفته"). Tapping it opens a short icon menu: none, daily, weekly, monthly, yearly, custom.
- **Reminder:** stays, and is shown as a bell icon row beneath the clock row. It is only visible once a time is set.
- **Closing:** choosing a day closes the panel. Changing time, repeat or reminder keeps it open, with a check button to finish.

**2. "Planning" picker.** It uses the same icon-led style.

- A row of period icons for Today, Tomorrow, This week, Next week, This month and Next month. Each is a small calendar icon with a short label and a muted date range beneath it.
- A custom-range icon (a calendar with a pencil) opens a mini calendar to pick a start and end date, with a check button to apply.
- The panel closes when a period is chosen, matching the "When" picker behaviour.

**3. Full removal of Time block, Part of day and Deadline, from everywhere in the app.**

- The three features disappear from the task detail, the pickers, and any lists, filters, sorting, calendar or planning views, task cards, badges and quick-add parsing.
- The related logic is removed or corrected, including overdue checks, smart reminders and any notifications, stats, island points rules and widgets that depended on them.
- Overdue status is based on the task's remaining date and time.
- Translations, settings, help text and the related automated tests are cleaned up, so no stray labels or empty options remain.
- Old values already saved on existing tasks are ignored and no longer read or shown. They are not deleted from the database.
- Task completion, repeating tasks, reminders and the island rewards must keep working after the removal.

## User flow

1. Open the preview URL and land on the login page.
2. Sign in with email/password or Google, or create an account.
3. Arrive on the Today page with the task list and island card.
4. Open a task. Tap the calendar icon to pick a day, the clock icon for an exact time, and the repeat icon for repetition. Tap the planning icon to pick a period.
5. There are no Time block, Part of day or Deadline options anywhere.
6. Complete tasks to earn island points and weekly gifts.

## UI/UX feel

- The existing look is preserved: warm paper-cream in light mode, plum-night in dark mode, with rose-gold line art.
- The new pickers follow it: quiet, uncluttered, icon-first, with soft transitions that respect reduced-motion settings.
- Fully bilingual with correct right-to-left behaviour. Icons and the calendar mirror correctly in RTL.

## Implementation phases

### Phase 1 — MVP (built now)

- Bring the repository's main app into the workspace and make it build and run at the preview URL.
- Fix only what breaks in this environment, without changing other features or design.
- Keep Firebase for login and data.
- Apply the task scheduling changes above: the new icon-led "When" and "Planning" pickers, and the full removal of Time block, Part of day and Deadline.
- Google sign-in works only if the Firebase project lists the preview domain as an authorized domain. You will need to add that domain in the Firebase Console.

### Phase 2 — Not built now

- Review and redesign the Planning, Diary, Mind, Health, Pomodoro and Knowledge pages (the repo's own "Phase 3 Review").
- Backup of the island album to the user's account, so it syncs across devices.

### Phase 3 — Not built now

- Optional move from Firebase to the platform's own backend and database.
- Island growth slideshow from the album, and resident requests that give bonus points.

## Assumptions

- Apart from the scheduling changes, "as-is" means no feature, design or data-layer changes beyond what is needed to run here.
- The main ARSHNAZ web app is the scope. The PTE Sentence Map sub-project is left out.
- The Android wrapper, Capacitor and Codemagic files, and the other build and deployment files are left out. The app is viewed as a web app only.
- The Firebase configuration already in the repository is reused. The existing Firebase project and its data are used directly.
- Google sign-in may fail on the preview domain until it is authorized in Firebase. Email/password sign-in does not depend on that.
- The AI features stay bring-your-own-key. No built-in key is added.
- Existing automated tests and CI workflows are not part of this delivery. Only the tests tied to the removed features and pickers are updated.
- "Deadline" is removed entirely. A task only has its normal date and time, and overdue is judged from those.
- The reminder and repeat options stay, because only Time block, Part of day and Deadline were marked for removal.
- The icon choices, the quick-day buttons and the wheel-style time picker are my proposal. Nothing is built until you approve this plan.
