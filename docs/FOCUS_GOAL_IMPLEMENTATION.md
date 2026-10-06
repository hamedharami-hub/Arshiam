# Focus lifecycle implementation

Baseline: main f2d9975. Visual timer and modal styles retained; only necessary finish/volume/sync-status controls added.

- One account-scoped external store for all timer renderings. Root integration: import `FocusRuntime` from `@/components/FocusRuntime` and mount `<FocusRuntime />` once in authenticated AppLayout, outside the route outlet.
- Runtime owns ticking, sound, browser-tab title and bottom in-app controller across navigation/task-modal closure. No OS-notification claim.
- Active duration is a session snapshot; pause excludes paused seconds. Live wall-clock changes rebase from monotonic `performance.now()`. After full process closure, persisted wall deadline determines recovery; wall-clock changes made while the process is fully closed cannot be distinguished from elapsed real time.
- Completed and early-ended focus records retain deterministic ids in an account-local outbox before session transition. Failed writes remain pending and retry on online/visibility events and every 30 seconds; repeated writes upsert the same document. Durable-storage failure retains the session and exposes retry.
- Account switches isolate sessions/preferences/outboxes, guard manual actions/ticks, and cancel/filter stale history/statistics responses.
- Completed rounds use completion deadline/date; early endings save active minutes without increasing completed-round count. Four completed rounds trigger a long break independently of midnight's daily count.
- Focus choices reduced to off, existing generated rain, existing generated pink noise; existing unrelated sleep catalog preserved. Preview is five seconds; ambience and end-bell volume are separate. These generated sources are not claimed to be higher-quality recordings.

Validation: 14 focus lifecycle tests plus existing timer recovery/statistics tests (17 total) cover pause, early finish, clock jump, duration snapshot, retry-idempotency, recovery, completion date, break cycle, account separation, storage failure, preference validation and cross-tab storage-loop prevention. No real Firebase/device validation performed.

External limitations:
- This baseline has Capacitor browser/plugin wrappers but no Android native project/source. A genuine persistent notification with live countdown/actions and locked-device sound requires native foreground-service source/build/device validation; not implementable by labelling the mini controller a notification.
- No audio recordings/music assets with provenance/licensing exist in the baseline. Licensed high-quality rain and instrumental files are still required; no arbitrary download or fabricated license added.
- Account deletion must purge `pomodoro_pending_v1:<uid>` and `pomodoro_prefs_v2:<uid>` alongside existing session/count keys; coordinator notified.
