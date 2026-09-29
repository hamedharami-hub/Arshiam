# Test Credentials

## Firebase Email/Password (live project gen-lang-client-0845891098)
- Email: test.arshnaz@example.com
- Password: Test123456

Google sign-in may not work on the preview domain unless it is added to Firebase Authorized domains.

## Hidden modules (pharmacy / study / mind)
- Master access code (unlocks all): ARSHNAZ-2026  (env ARSH_MASTER_UNLOCK_CODE, stored hashed in Mongo `module_codes`)
- Open panel: Settings > About > tap the version text 7 times
- Admins (can create/revoke codes): emails in backend env ARSH_ADMIN_EMAILS (currently test.arshnaz@example.com) or Firebase custom claim admin=true
- QA seed for review/mind map: `python3 /app/scripts/seed_review_demo.py`
