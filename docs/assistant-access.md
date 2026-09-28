# Per-account assistant access

Each signed-in Firebase user can create an independent assistant token in **Settings → Tasks → Assistant access**. A token is shown once. The server stores only its SHA-256 hash in `assistant_token_index`; the grant and its scopes live under `users/{uid}/assistant_grants/{grantId}`. Assistant requests resolve the account from the token index, never from a request-supplied UID.

## Deployment requirements

1. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` in the Vercel server environment with a service account for the **same Firebase project** used by `firebase-applet-config.json`. Keep the JSON secret out of the repository and client-side `VITE_` variables. Local server development can instead use `GOOGLE_APPLICATION_CREDENTIALS`.
2. Deploy `firestore.rules` to the matching Firestore database. The rules deny browser writes to assistant grants, audit records and recoverable assistant trash.
3. Deploy the Vercel app. Test with two test accounts before issuing a token for a real account. Confirm account A's token cannot read account B's tasks, a read-only token cannot write, and a revoked token returns 401.

The integration does not run on a schedule by itself. An external scheduled runner or connected Codex task needs to call the HTTPS API. A powered-off PC cannot supply its Chrome session or local files to that runner.

## API

Account owner endpoints require a current Firebase ID token:

- `GET /api/assistant-access` lists grants without secrets.
- `POST /api/assistant-access` takes `{ "name": "Codex", "scopes": ["tasks:read", "tasks:create"], "expiresInDays": 90 }` and returns the token once.
- `DELETE /api/assistant-access/{grantId}` revokes a grant immediately.

Assistant endpoints require `Authorization: Bearer arshnaz_pat_...`:

- `GET /api/assistant/tasks?search=...` and `GET /api/assistant/tasks/{taskId}` require `tasks:read`.
- `POST /api/assistant/tasks` requires `tasks:create`. `title` is required; `external_ref` is an optional stable source URL or identifier for duplicate prevention.
- `PATCH /api/assistant/tasks/{taskId}` requires `tasks:update`.
- `DELETE /api/assistant/tasks/{taskId}` requires `tasks:delete`; a backup is written to `assistant_trash` in the same Firestore batch.

Calendar entries in ARSHNAZ are tasks with dates, so these permissions also cover task-based plans shown in Calendar. Notes, goals and habits have separate data models and are outside this API. All assistant writes create audit records under the account owner.
