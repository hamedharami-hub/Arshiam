# Test credentials
- Firebase email/password (live project): test.arshnaz@example.com / Test123456
- Login: /auth -> tick disclaimer checkbox -> email+password -> "ورود به حساب"; dismiss onboarding with "رد کن".
- Hidden modules (Knowledge/Pharmacy): backend unavailable in preview; seed localStorage key `arshnaz:modules:<uid>` with {"ready":true,"unlocked":["pharmacy","study","mind"],"installed":["pharmacy","study","mind"],"isAdmin":false,"isOwner":false} then open /app/knowledge.
