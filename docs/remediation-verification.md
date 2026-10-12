# Remediation verification

This document describes reproducible checks, not a claim that every design-audit finding is closed.

## Consolidated verification checkpoint (before main integration)

- Direct TypeScript check (`node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`) completed without diagnostics.
- Responsive script: all 26 synthetic fixture cases passed after the follow-up edits; output is in the external `arshiam-responsive-consolidated` directory.
- Desktop layout script: all 10 scenarios passed after the follow-up edits; zero obscured task rows; output is in the external `arshiam-layout-consolidated` directory.
- Production build passed (`BUILD_EXIT=0`), including PWA generation (210 precache entries). Chunk-size warnings remain; this is not an end-to-end performance pass.
- Full Vitest run failed: 292 files passed / 12 failed; 1906 tests passed / 48 failed (1954 total), plus three worker RPC errors. This is a failed verification gate, not an accepted pass. Failures are being reproduced in isolated batches.
- Initial concrete mismatches: a legacy Back test expected the removed synthetic sentinel; mobile navigation tests still expected buttons instead of destination links; Life Architect tests used the renamed pace action. Tests now check the intended history/link/truthful-copy contracts. Isolated validation remains required.
- Isolated retries passed all 12 previously failing files: batch A, 7 files / 39 tests; batch B, 5 files / 72 tests. Worker/load-related timeouts did not reproduce in these batches. This does not retroactively turn the first full-suite result into a pass.
- Additional calendar failed-save/rewrite recovery checks passed: 2 files / 6 tests. Collapsed sidebar creation and explicit management checks passed: 1 file / 3 tests.
- A second full run on frozen source is in progress, with one worker and no concurrent build, browser matrix, or typecheck. Its result must be recorded before main integration.
- Second controlled run completed: 304 files passed / 1 failed; 1959 tests passed / 1 failed. The sole failure was the resumed-practice save debounce assertion. Its entire file passed in isolation (13 tests), then passed again after replacing wall-clock debounce waiting with controlled timer advancement and explicit pre/post-debounce assertions. No production timer was shortened.
- Typecheck and production build were rerun after the final calendar/sidebar edits and passed; final build log: `arshiam-build-final-gate.log` (`BUILD_EXIT=0`).
- A third full run, incorporating the deterministic test, is in progress in `arshiam-full-suite-final-gate.log`. Main integration still awaits its result.
- Final gate completed successfully: **305 files / 1960 tests passed**, `SUITE_EXIT=0`, in `arshiam-full-suite-final-gate.log`. The earlier failed runs remain recorded above; only this final frozen-source run is the full-suite pass.
- These checks occurred on `design-remediation`, not after integration into `main`. The requested post-integration visual audit remains a separate verification step.

## Automated checks

From `frontend/`:

```powershell
npm run typecheck
npm run build
npx vitest run
```

The two original suite failures were investigated on the original `82aa321` baseline. Settings navigation generated duplicate history entries on repeated Radix activation events. The calendar test left the Windows runtime timezone changed after a DST case. Both now have regression coverage; no calendar assertion was weakened.

## Desktop geometry fixtures

Start Vite, then set its actual URL and an external artifact directory:

```powershell
$env:DEV_SERVER_URL='http://127.0.0.1:3001/src/test/layout-test.html'
$env:LAYOUT_ARTIFACT_DIR='C:\Users\hamed\AppData\Local\Temp\opencode\arshiam-layout-final'
$env:LAYOUT_DEBUG_PORT='0'
npm run qa:layout
```

Port `0` asks Chrome for an available DevTools port; the script reads `DevToolsActivePort`. This avoids the unavailable fixed port on this Windows machine. `LAYOUT_USER_DATA_DIR` optionally controls the disposable Chrome profile directory (the layout script removes this directory on completion; never point it at a personal profile).

Ten desktop fixture cases passed: Persian/English direction, left/right sidebar, expanded/collapsed, and widths 1280/1440/2048. This fixture uses synthetic tasks and is not a complete authenticated Today test.

## Responsive fixtures and performance samples

```powershell
$env:QA_BASE_URL='http://127.0.0.1:3001'
$env:QA_ARTIFACT_DIR='C:\Users\hamed\AppData\Local\Temp\opencode\arshiam-responsive-final'
node scripts/verify_remediation.mjs
```

The script runs production RichEditor/settings components in headless Chrome, saves screenshots and `results.json`, and checks horizontal document overflow. Cases include widths 320/390/820, Persian/English, six accents in light/dark/OLED, and a 500-section editor document. It checks keyboard focus after Tab, but this is **not** a complete keyboard or screen-reader walkthrough.

Benchmarks use synthetic content only. They measure actual `markdownToHtml`, `filterNotesForList`, and `noteListPreview` functions after warm-up (seven samples, median and maximum). They do **not** measure full NotesView loading, React reconciliation, Firestore latency, device input latency, or end-to-end large-list scrolling. Concurrent tests and development-server overhead affect results; comparisons require the same machine and load.

Observed example: 500-note filter/preview median ~9 ms; 5000-note median ~76 ms; 5000-paragraph conversion median ~69 ms. These numbers justify avoiding full-list preview recomputation on every keystroke; they are not production performance guarantees.

## Still requires external validation

- Authenticated mobile end-to-end flows with representative accounts.
- Actual iOS/Android virtual keyboards, safe-area behavior, and install prompts.
- NVDA/VoiceOver/TalkBack walkthroughs, including nested dialogs and learning practice.
- Human usability/tree tests and controlled rollout monitoring.
- Full large-list render/interaction benchmarks on representative low-end devices.

No customer content or credentials are used in the QA fixtures. Generated logs, Chrome profiles, screenshots, and results belong outside the source tree.
