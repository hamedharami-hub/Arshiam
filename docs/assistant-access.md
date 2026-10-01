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

## ChatGPT, Codex and Gemini agent connections

The personal agent API is `/api/v1/agent`, authenticated by an `arshnaz_pat_...` token. Use **`/agent-openapi.json`** for this integration. The older `/openapi.json` describes Firebase-session endpoints and is not the schema for personal agent tokens.

In **Settings → AI Agent Connections**, create a separate token per agent, choose its permissions, download the OpenAPI schema, and copy the token-free agent instructions. Verify the connection with `GET /api/v1/agent/me` before requesting changes. The token can only change account data within its scopes; it cannot edit application source code.

- **ChatGPT:** use a private custom GPT with Actions (where available), import the downloaded schema, and configure API Key authentication with Bearer. Enter the token in the authentication field, not the GPT instructions or an ordinary chat message. Keep the GPT private because its configured token accesses your account. Mutating operations are marked consequential in the schema.
- **Codex:** configure `ARSHNAZ_AGENT_TOKEN` securely in the task environment and permit HTTPS requests to the chosen server. Provide the copied instructions. A shell/HTTP-capable task can make requests using the variable without printing its value. Merely pasting a token into chat does not create a tool connection.
- **Gemini:** use a Gemini-based agent with an HTTP tool/function-calling adapter, or a Gemini CLI environment that permits the relevant HTTP tool. Store the token in secure tool configuration and provide the copied instructions/schema. Ordinary Gemini chat does not necessarily execute external API calls.

First read the relevant records, apply only requested changes, read back the result, and report the actual changes. Stop on 401/403, respect 429 retry instructions, and ask before overriding a calendar conflict. Idempotency keys apply to creates but the current server cache is instance-local; after an uncertain response or a cold start, read the records before retrying.

### Server origin and diagnostics

`VITE_AGENT_API_URL` optionally selects the HTTPS **origin** hosting the Vercel agent API, for example `https://arshiam.vercel.app`. It is a public build-time setting, not a secret. Do not use the FastAPI companion URL (`VITE_ARSH_API_URL`) for this API. Web deployments default to their own origin; localhost development and packaged native apps default to `https://arshiam.vercel.app` because Vite/static hosting cannot execute the Vercel handlers. Owner token management and the displayed agent URL use the same origin.

Publish the server handlers, web changes and `public/agent-openapi.json` together. Configure Firebase Admin credentials on the API server for the repository's Firebase project. A missing credential configuration returns 503 with `SERVICE_NOT_CONFIGURED`; an HTML/JavaScript response points to static hosting or an incorrect API origin. The UI shows an inline connection failure and retry control instead of falsely showing an empty token list. Do not treat mocked tests as proof that production credentials, Firestore access or a provider connection work.
