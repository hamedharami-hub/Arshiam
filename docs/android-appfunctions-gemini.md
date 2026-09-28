# Android AppFunctions & Gemini Integration Preparation

This document outlines the architecture, security boundaries, and verification procedures for the **Android AppFunctions** integration in ARSHNAZ / Arshiam.

---

## 1. Scope & Important Limitations

> [!WARNING]
> **Experimental Preview Notice**
> Android AppFunctions is an experimental platform capability introduced in **Android 16 (API 36+)**.
> Official Google Gemini cross-app function invocation is currently in **private preview** and requires system-level signature permissions (`android.permission.EXECUTE_APP_FUNCTIONS`) that are restricted to Google system apps and preview partners.
> **This implementation does not claim end-to-end execution in the commercial Gemini app without official preview enrollment.**
> It provides a bounded, production-safe preparation layer that compiles cleanly, executes locally under test/emulation, and ensures older Android versions (Android 15 and lower) degrade gracefully with zero disruption.

---

## 2. Architecture Overview

```
                          ┌───────────────────────────┐
                          │ Android System / Gemini   │
                          │ (API 36+ Private Preview) │
                          └─────────────┬─────────────┘
                                        │
                         BIND_APP_FUNCTION_SERVICE
                                        │
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │ ArshnazAppFunctionService (@RequiresApi(36)) │
                 └──────────────────────┬───────────────────────┘
                                        │
                           Extract parameters & tokens
                                        │
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │          AppFunctionTaskDispatcher           │
                 │   - Input validation & parameter bounds      │
                 │   - Active user session check                │
                 │   - Disallow delete/bulk/credential actions  │
                 └───────────────┬──────────────┬───────────────┘
                                 │              │
                   Optimistic    │              │ Enqueue authenticated
                   read/update   │              │ background sync
                                 ▼              ▼
                     ┌───────────────┐   ┌──────────────────────┐
                     │  AgendaData   │   │WidgetTaskActionWorker│
                     │(Local snapshot│   │ (WorkManager + REST) │
                     └───────────────┘   └──────────────────────┘
```

### Components:
1. **`ArshnazAppFunctionService`** (`android/app/src/main/java/life/arshnaz/app/ArshnazAppFunctionService.java`):
   - Extends platform `android.app.appfunctions.AppFunctionService`.
   - Annotated with `@RequiresApi(36)`.
   - Protected in `AndroidManifest.xml` by `android.permission.BIND_APP_FUNCTION_SERVICE`.
   - Reads function calls via `ExecuteAppFunctionRequest` and responds with `ExecuteAppFunctionResponse`.
2. **`AppFunctionTaskDispatcher`** (`android/app/src/main/java/life/arshnaz/app/AppFunctionTaskDispatcher.java`):
   - Decoupled, pure-Java validation and execution engine.
   - Enforces session authentication, bounds checking, and output sanitization.
3. **`res/xml/app_functions_metadata.xml`**:
   - Metadata descriptor declaring the 5 exposed capabilities and their parameter schemas.

---

## 3. Supported Capabilities

Only the following 5 narrow capabilities are exposed. Any other function name (such as deletion, bulk modifications, raw queries, or automation) is rejected with `ERROR_FUNCTION_NOT_FOUND`:

| Function ID | Description | Parameters | Returns |
| :--- | :--- | :--- | :--- |
| `createTask` | Creates a new task | `title` (required, max 500 chars)<br>`dueDateTime` (optional, ISO/date)<br>`priority` (optional, low/med/high/urgent) | Minimal task status (`pending_sync`) |
| `listTodayTasks` | Lists user's active tasks due today | `limit` (optional, integer 1-20, default 20) | List of tasks with minimal fields |
| `searchTasks` | Searches active tasks by title keyword | `query` (required, max 100 chars)<br>`limit` (optional, integer 1-20, default 20) | List of matching tasks |
| `updateTask` | Updates title, due date, or priority | `taskId` (required, safe ID regex)<br>`title` (optional)<br>`dueDateTime` (optional)<br>`priority` (optional) | Minimal task status (`pending_sync`) |
| `completeTask` | Marks task completed or reopens | `taskId` (required, safe ID regex)<br>`completed` (required, boolean) | Minimal task status (`completed`/`reopened`) |

---

## 4. Security & Privacy Guarantees

1. **Authentication & Session Isolation**:
   - Every invocation verifies `sessionReady == true` and that a valid user identity is active.
   - If the user is logged out or the session is expired, returns `ERROR_APP_SESSION_REQUIRED`.
2. **Zero Credential Exposure**:
   - No Firebase keys, tokens, refresh tokens, passwords, or internal URLs are exposed in function metadata or return documents.
3. **No Bulk or Destructive Actions**:
   - Task deletion is explicitly disallowed.
   - Bulk edit/delete operations are explicitly disallowed.
4. **Canonical Persistence**:
   - Mutations route strictly through `WidgetTaskActionWorker.enqueue(...)` and `AgendaData.setCompleted(...)`, preserving session generation validation and authenticated Firestore sync.

---

## 5. Developer Verification via ADB

You can test AppFunctions on Android 16 emulators without needing a physical device or access to the Gemini private preview.

### A. Verify Function Registration & Indexing
To verify that the system has discovered and indexed ARSHNAZ's AppFunctions:
```bash
adb shell cmd app_function list-app-functions life.arshnaz.app
```

### B. Execute AppFunctions via Android Shell
Test individual function execution using the platform command-line tool:

1. **List today's tasks:**
```bash
adb shell cmd app_function execute-app-function \
  --package life.arshnaz.app \
  --function listTodayTasks \
  --params '{"limit": 5}'
```

2. **Search tasks:**
```bash
adb shell cmd app_function execute-app-function \
  --package life.arshnaz.app \
  --function searchTasks \
  --params '{"query": "groceries", "limit": 10}'
```

3. **Create a task:**
```bash
adb shell cmd app_function execute-app-function \
  --package life.arshnaz.app \
  --function createTask \
  --params '{"title": "Buy groceries", "priority": "high", "dueDateTime": "2026-09-18"}'
```

4. **Complete a task:**
```bash
adb shell cmd app_function execute-app-function \
  --package life.arshnaz.app \
  --function completeTask \
  --params '{"taskId": "task-123", "completed": true}'
```

### C. Dump Service Status
```bash
adb shell dumpsys app_function
```
