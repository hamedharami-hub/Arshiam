# Test credentials
- Firebase email/password (live project): test.arshnaz@example.com / Test123456
- Login: /auth -> tick disclaimer checkbox -> email+password -> "ورود به حساب"; dismiss onboarding with "رد کن".
- Hidden modules (Knowledge/Pharmacy): backend unavailable in preview; seed localStorage key `arshnaz:modules:<uid>` with {"ready":true,"unlocked":["pharmacy","study","mind"],"installed":["pharmacy","study","mind"],"isAdmin":false,"isOwner":false} then open /app/knowledge.

## QA without spending the real Firebase quota (preferred)
- Emulators: `sh /app/tests/emulator/start.sh` (auth :9099, firestore :8085, seeds the same test user + a cascading plan).
- In the browser open http://localhost:3000/auth, run `localStorage.setItem('arsh_use_emulator','1')`, reload, then log in with test.arshnaz@example.com / Test123456.
- Only works on the dev server (localhost:3000); the live project's daily read quota was exhausted on 2026-10-02.
