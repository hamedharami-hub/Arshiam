# Firestore Rules regression tests

These tests evaluate the repository's actual `firestore.rules` in the real Firestore emulator. No production credentials or live Firebase project are needed.

## Run

Prerequisites: Node >=22.12, Java 17+ for the installed Firebase CLI 13.x, and project dependencies installed with Yarn.

```sh
yarn test:rules
```

The command starts and stops the emulator via `firebase emulators:exec`, targets only `demo-arshnaz-rules`, and runs the Node-only Vitest config. `GCE_METADATA_HOST=0.0.0.0` prevents automatic credential discovery from hanging on an unavailable metadata server in this container. This is a POSIX shell command; Windows users can run it in WSL or set that environment variable before executing the Firebase command.

The root application Vitest config intentionally does not include these emulator tests. They run separately. Calling their Vitest config without `FIRESTORE_EMULATOR_HOST` fails rather than connecting to a live project.

## Verified coverage

The current 59 tests cover owner reads / prohibited writes for `user_roles`, prohibited client access to assistant collections, representative recursive paths, other-user and anonymous access, ordinary owner CRUD, top-level default denial, and an actual atomic mixed batch rejection. This is targeted coverage, not an exhaustive Cartesian matrix.

Rules use OR semantics across every matching allow expression. A specific `false` cannot cancel a broader `true`; reordering matches does not fix the vulnerability.

The original baseline had 60 tests, 22 failures: 21 permission assertions demonstrated the vulnerability, and one test had an invalid document path. The final suite corrects that issue and includes a real `writeBatch` test instead of the original sequential-write check.

## Publication is separate

Passing these tests does not publish Rules. No comparison with deployed Rules or publication has occurred because administrative credentials are unavailable. No production Firebase data was touched. See `test_reports/firestore_rules_final_verification.json` for the final local result.
