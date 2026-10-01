# ARSHNAZ — PRD

## Original problem statement
Vite + React + TypeScript + Firebase web app (repo: github.com/hamedharami-hub/Arshiam, cloned to /app/arshnaz). Round goal: redesign Pharmacy, Review and FRED so content can be *learned from*; upgrade BYOK AI; add F01 (cross-device FRED progress sync) and K01 (Continue learning). Out of scope: K02, Android, pte-sentence-map, Today/Notes/Diary/Tasks/Settings, new AI features. Constraint: no invented clinical/PBS numbers; rules/amounts only from repo data or a cited source and labelled "needs verification + source".

## Personas
Single user (owner) studying Australian community-pharmacy work, Persian/English, RTL/LTR, light/dark/OLED.

## Implemented (2026-10-01)
- Phase 1: baseline Gate + report (docs/ROUND_REPORT.fa.md).
- Phase 2: per-provider BYOK keys (save/test/mask/delete), new model IDs, classified errors + fallback model.
- Phase 3: Pharmacy topic column (collapsible / Sheet) with Study/Practice/Review; 3-tier drug page; lazy images + zoom/pinch + placeholders; unified Review module (`?domain=&topic=`, legacy redirect); scenario objective line; CYP legend collapsible.
- Phase 4: FRED rebuilt as 7 unlocked lessons (3 statuses), practice tools embedded, key points → review cards.
- Phase 5: F01 (`users/{uid}/fredProgress/{lessonId}`, per-uid outbox, transaction merge, attemptId idempotency, saved/queued/failed) and K01 (`/app/continue`).

## Not verified
- Real two-device sync; real Firestore transaction; real provider keys for Gemini/Anthropic; Pharmacy hub/products/scenario/CYP in a real signed-in browser.

## Backlog
- P0: user to verify PBS/Safety Net/co-payment wording against an official source.
- P1: K02 (notes attached to text); sync "last study" across devices; per-topic FRED review cards.
- P2: real two-device test; Node 22 for the dev environment; resolve 3 env-dependent test files.
