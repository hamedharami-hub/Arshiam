# Advanced modules on the Vercel site

The Vercel site now has its own `/api/arsh/modules/*` API backed by the same Firebase project as the web client (`firebase-applet-config.json`). The separate FastAPI/Mongo service remains in `backend/` for other integrations; it is **not** automatically deployed by Vercel. Module codes previously issued by the Mongo service are not migrated to Firestore and must be reissued on Vercel.

## Required production configuration

In Vercel project `arshiam`, add these **server-only** Production environment variables, then redeploy:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the service-account JSON for the Firebase project in `firebase-applet-config.json`. Store it as an encrypted Vercel environment variable; never prefix it with `VITE_` or commit it.
- `ARSH_SIGNING_SECRET`: a random secret of at least 32 characters, stored only on the server. Keep it stable across deployments; changing it invalidates existing codes.
- `ARSH_ADMIN_EMAILS` (optional): comma-separated additional admin emails. The two existing owner emails are built in, but admin access is granted only after Firebase verifies the signed-in email. An admin email does not create an account or set its password.

Grant the service account Firestore read/write access only to the intended Firebase project. The API uses Firebase Admin to verify ID tokens and access Firestore, so client Firestore rules alone are not a substitute for these credentials.

## Firebase Authentication setup

In the same Firebase project, enable Google and (if password login is wanted) Email/Password under Authentication → Sign-in method. Add `arshiam.vercel.app` to Authentication → Settings → Authorized domains. Confirm that the owner accounts exist in Authentication → Users. A Google-only account has no separate app password: use the Google button. For an Email/Password account, use “Forgot password?” on the sign-in screen to request a reset email. If an email/password owner account is unverified, verify its email before expecting the admin panel to appear.

After signing in, open Settings → About and tap the app version seven times quickly. The Advanced sections panel opens; verified owner accounts see Manage codes. Create a new code there and share it once. `/api/arsh/health` should return `ok: true`; `/api/arsh/modules/me` requires a Firebase ID token and must no longer return 404. If it returns 503, check the server variables and Firestore permissions before trying another code.

The code list and per-account module grants are stored in Firestore. The old Mongo `ARSH_MASTER_UNLOCK_CODE` does not apply to this Vercel API.
