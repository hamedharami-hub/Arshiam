# Follow-up browser verification

From `frontend`, start the dedicated **test-only** server:

```powershell
npx vite --config scripts/design-followup.vite.config.mjs
```

In another terminal:

```powershell
$env:QA_ARTIFACT_DIR='C:\Users\hamed\AppData\Local\Temp\opencode\arshiam-followup-qa'
node scripts/verify_design_followup.mjs
```

Optional: `QA_BASE_URL`, `CHROME_BIN`, `QA_VITE_CACHE`. Artifacts and the dedicated
Vite cache stay outside the repository. Do not use this Vite config for the app:
it substitutes synthetic auth, and rewrites only NotesView's data-service imports.

## What is measured

- The actual production `NotesView`, `SwipeableRow`, buttons, filtering, preview
  cache and editor render in Chrome. Each of three English/Persian runs supplies
  5,000 notes (1,600 content characters each), verifies 50 initial rows, renders
  100 after load-more, searches a content marker unique to note 4,999, opens its
  editor, clears search, filters to 2,500 folder notes and restores all notes.
  Timings cover event dispatch through asserted DOM state plus two animation
  frames. Initial mount begins after imports/language initialization. Editor
  imports are prewarmed. These are development-build desktop timings, not a
  production-build performance budget, cloud latency, or 5,000 simultaneous rows.
- 20 text/background pairs × light/dark/OLED × six accents. Production Card and
  Button plus eight exact legacy gradient surface specimens use computed CSS
  colors. Alpha compositing follows ancestors; gradient interpolation uses
  premultiplied alpha. Minimum ratios sample all stops and 20 interpolants per
  segment, conservatively across the whole surface. This is not screenshot pixel
  sampling at glyph positions or an audit of every legacy page. Multiple/image
  backgrounds fail as unsupported rather than silently passing.
- Actual `HeaderSecondaryActions` with mounted portal hosts and a real
  `HeaderActionsPortal` action: long fa/en titles at 320/390; closed/open overflow,
  panel bounds, focus on opening, Escape closure and return focus.
- Three synthetic fixed panels register through actual `useOverlaySlot`, with a
  bottom nav. Actual bounding rectangles must be disjoint and inside 390×844,
  844×390 and 390×300 viewports. The last is **keyboard-sized viewport emulation**,
  not a real IME or a distinct visualViewport/layoutViewport keyboard inset.

Exit status is nonzero for contrast, DOM or keyboard assertions and runtime
exceptions. Inspect `results.json`: a failed fixture is not a passing audit.
No account/device, screen reader, IME, overlay contents or full AppLayout behavior
is verified here. Shared-machine timing variance is expected; retain raw runs.
