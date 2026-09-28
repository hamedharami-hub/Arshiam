# ARSHNAZ (ارشناز) — PRD & Progress

## Original Problem Statement (this job)
پلن نهایی ارشناز: ۸ مورد، ۶ فاز — PWA موبایل‌محور + اندروید (Capacitor) روی همین کد فعلی (بدون بازنویسی).
تصمیم‌ها: روز اول هفته قابل انتخاب (شنبه پیش‌فرض / دوشنبه)، تعطیلات میلادی استرالیا (پیش‌فرض ایالت: NSW)،
پیوست‌های Drive/Photos در Object Storage اپ، FSRS اجباری برای مرور. معماری: React+TS (Vite) + Firestore برای تسک‌ها،
سرویس جدید FastAPI + MongoDB برای پیوست‌ها، کش هواشناسی، مناسبت‌ها و توکن‌های گوگل.
فازها: ۰ پایدارسازی CI · ۱ حذف کامنت + بازنویسی پیوست · ۲ Time Bucket · ۳ تقویم و هواشناسی · ۴ Review + FSRS · ۵ Drive/Photos.
User choices: work on GitHub repo hamedharami-hub/Arshiam; tasks stay in Firestore (existing firebase-applet-config.json);
first delivery = phases 0+1+2+4; NSW default state; Phase 5 postponed.

## Architecture
- Frontend: Vite 7 + React 18 + TS + Tailwind/shadcn at `/app` (served by supervisor `expo` program through
  `/app/frontend/start-vite.sh` bridge → Vite on :3000). Vite proxies `/api/arsh` → :8001 for localhost dev.
- Firebase Auth/Firestore (tasks, folders, tags, Leitner cards).
- Backend `/app/backend` FastAPI, prefix `/api/arsh`: `attachments.py` (sign-upload → signed PUT → list → signed view → soft delete),
  `auth.py` (Firebase ID-token verify via Google certs), `storage.py` (Emergent Object Storage), `signing.py` (HMAC URLs), `db.py` (Mongo BaseDocument).
- Env: backend `.env` has EMERGENT_LLM_KEY, FIREBASE_PROJECT_ID, ARSH_SIGNING_SECRET, ARSH_APP_NAME.
  Android/Vercel builds need `VITE_ARSH_API_URL` = deployed backend origin.

## Implemented (2026-09-28)
- Phase 0: CI green locally (typecheck, eslint 0 errors, vitest ~1000 tests, vite build). Fixed QuickAddTask test mock.
- Phase 1: Add-comment removed from task rail/action sheet/detail; one-time migration merges logged comments with date into task text
  (`src/lib/commentMigration.ts`). Attachments rewritten (`TaskAttachments.tsx`, `lib/attachmentUpload.ts`): signed-URL upload with
  XHR progress, retry, IndexedDB offline queue auto-flush, 25 MB + type limits, image lightbox, pdf.js PDF preview (works on Android),
  delete removes from app/storage access (Object Storage has no hard-delete API → soft delete, never served again). Legacy Firebase attachments still listed.
- Phase 2: `lib/timeHorizon.ts` (horizon/period_start/period_end/due_at/is_exact/postpone_count, DST-safe local-date math, week start sat/mon,
  seasons toggle, Q1–Q4 gregorian / seasons jalali, nested children with shared weeks, overdue, postpone), `lib/quickTaskParser.ts`
  (FA/EN no-AI parser), `lib/horizonFilters.ts` (per-bucket filters/sort + unambiguous inheritance). New `/app/buckets` UI: zoomable
  timeline (tap/pinch/ctrl-wheel), period nav + progress, overdue section + postpone all, smart add with live preview/multi-line/text drop,
  drag-and-drop between sub-periods (dnd-kit), settings card in Settings › Tasks.
- Phase 4: FSRS mandatory (legacy SM-2/Leitner cards migrate from box number, history kept), Desired Retention (70–97%), 14-day forecast,
  streak, daily goal, configurable gestures (swipe R/L/U/D, double-tap flip, long-press edit) with Framer Motion flip/throw + haptics +
  reduced-motion; Review is its own sidebar section under Pharmacy (`/app/review/pharmacy`); old `/app/review?...` links redirect.
- Unit tests added: timeHorizon (week start, jalali, nesting, overdue, postpone, Sydney DST), quickTaskParser, horizonFilters,
  attachmentUpload, commentMigration, reviewFsrs (migration, retention, gestures, forecast/streak DST). Backend pytest: `backend/tests/test_attachments.py`.

## Backlog
- P0 Phase 3: Calendar (Jalali @doranjs/holidays + approximate lunar badge, Nager.Date AU + state [default NSW], colours, events list, offline cache)
  and Open-Meteo weather (today/tomorrow hourly, weekly strip, bottom sheet, GPS/manual city, last-updated) with backend cache.
- P1 Mind map: layout settings exist; add focus mode polish + progressive branch reveal.
- P1 Phase 5: Google OAuth (system browser on Android), encrypted tokens, Drive Picker + "Arshnaz" folder upload, Photos Picker API copy.
- P2 Per-phase branches/tags + GitHub CI verification (use "Save to GitHub"); Android device QA of attachments.
