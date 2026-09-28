package life.arshnaz.app;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {28, 35})
public class AppFunctionTaskDispatcherTest {

    private Context context;

    @Before
    public void setup() {
        context = RuntimeEnvironment.getApplication();
        AgendaData.prefs(context).edit().clear().commit();
        AgendaData.options(context).edit().clear().commit();
    }

    private void login() throws Exception {
        JSONArray sampleTasks = new JSONArray()
            .put(new JSONObject().put("id", "task-today-1").put("title", "Buy groceries")
                .put("due_date", LocalDate.now().toString()).put("priority", "high")
                .put("completed", false).put("status", "todo"))
            .put(new JSONObject().put("id", "task-today-2").put("title", "Review pull request")
                .put("due_date", LocalDate.now().toString()).put("priority", "urgent")
                .put("completed", false).put("status", "todo"))
            .put(new JSONObject().put("id", "task-tomorrow").put("title", "Doctor appointment")
                .put("due_date", LocalDate.now().plusDays(1).toString()).put("priority", "medium")
                .put("completed", false).put("status", "todo"));

        AgendaData.prefs(context).edit()
            .putBoolean("sessionReady", true)
            .putString("dataUserId", "user-123")
            .putString("agendaTasks", sampleTasks.toString())
            .commit();
    }

    @Test
    public void rejectsExecutionWhenSessionNotReady() {
        // Unauthenticated context (sessionReady is false)
        Map<String, Object> params = new HashMap<>();
        params.put("title", "Unauthenticated task");

        AppFunctionTaskDispatcher.Result result =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_CREATE_TASK, params);

        assertFalse(result.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_APP_SESSION_REQUIRED, result.errorCode);
        assertTrue(result.errorMessage.contains("App session required"));
    }

    @Test
    public void rejectsUnsupportedAndDangerousFunctions() throws Exception {
        login();

        for (String forbidden : new String[]{"deleteTask", "delete", "bulkDelete", "bulkEdit", "executeSql", "getTokens"}) {
            AppFunctionTaskDispatcher.Result result =
                AppFunctionTaskDispatcher.dispatch(context, forbidden, new HashMap<>());

            assertFalse("Expected rejection for " + forbidden, result.success);
            assertEquals(AppFunctionTaskDispatcher.ERROR_FUNCTION_NOT_FOUND, result.errorCode);
        }
    }

    @Test
    public void createTaskValidatesInputAndEnqueuesMutation() throws Exception {
        login();

        // 1. Missing title
        Map<String, Object> invalid = new HashMap<>();
        AppFunctionTaskDispatcher.Result resMissingTitle =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_CREATE_TASK, invalid);
        assertFalse(resMissingTitle.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT, resMissingTitle.errorCode);

        // 2. Excessively long title
        invalid.put("title", new String(new char[501]).replace('\0', 'x'));
        AppFunctionTaskDispatcher.Result resLongTitle =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_CREATE_TASK, invalid);
        assertFalse(resLongTitle.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT, resLongTitle.errorCode);

        // 3. Invalid due date
        invalid.put("title", "Valid title");
        invalid.put("dueDateTime", "not-a-date");
        AppFunctionTaskDispatcher.Result resBadDate =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_CREATE_TASK, invalid);
        assertFalse(resBadDate.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT, resBadDate.errorCode);

        // 4. Valid create task
        Map<String, Object> valid = new HashMap<>();
        valid.put("title", "Deploy release");
        valid.put("dueDateTime", LocalDate.now().toString());
        valid.put("priority", "urgent");

        AppFunctionTaskDispatcher.Result successResult =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_CREATE_TASK, valid);

        assertTrue(successResult.success);
        assertNotNull(successResult.data);
        assertEquals("Deploy release", successResult.data.getString("title"));
        assertEquals("urgent", successResult.data.getString("priority"));
        assertEquals("pending_sync", successResult.data.getString("status"));
        assertFalse(successResult.data.has("folderName"));
    }

    @Test
    public void listTodayTasksEnforcesLimitAndReturnsMinimalFieldsOnly() throws Exception {
        login();

        Map<String, Object> params = new HashMap<>();
        params.put("limit", 1);

        AppFunctionTaskDispatcher.Result result =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_LIST_TODAY_TASKS, params);

        assertTrue(result.success);
        assertEquals(1, result.items.size());

        JSONObject task = result.items.get(0);
        assertTrue(task.has("taskId"));
        assertTrue(task.has("title"));
        assertTrue(task.has("dueDateTime"));
        assertTrue(task.has("priority"));
        assertTrue(task.has("completed"));
        assertTrue(task.has("status"));

        // Crucial security isolation: credentials, tokens, user IDs must NEVER leak
        assertFalse(task.has("user_id"));
        assertFalse(task.has("apiKey"));
        assertFalse(task.has("token"));
        assertFalse(task.has("refreshToken"));
    }

    @Test
    public void searchTasksPerformsCaseInsensitiveFilterAndLimitsOutput() throws Exception {
        login();

        // 1. Missing query
        AppFunctionTaskDispatcher.Result resEmptyQuery =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_SEARCH_TASKS, new HashMap<>());
        assertFalse(resEmptyQuery.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT, resEmptyQuery.errorCode);

        // 2. Valid search matching "groceries"
        Map<String, Object> searchParams = new HashMap<>();
        searchParams.put("query", "GROCERIES");
        AppFunctionTaskDispatcher.Result result =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_SEARCH_TASKS, searchParams);

        assertTrue(result.success);
        assertEquals(1, result.items.size());
        assertEquals("Buy groceries", result.items.get(0).getString("title"));
    }

    @Test
    public void updateTaskValidatesTaskIdAndRoutesChanges() throws Exception {
        login();

        // 1. Invalid taskId
        Map<String, Object> invalid = new HashMap<>();
        invalid.put("taskId", "invalid/path/traversal");
        AppFunctionTaskDispatcher.Result badId =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_UPDATE_TASK, invalid);
        assertFalse(badId.success);
        assertEquals(AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT, badId.errorCode);

        // 2. Valid update
        Map<String, Object> valid = new HashMap<>();
        valid.put("taskId", "task-today-1");
        valid.put("title", "Buy organic groceries");
        valid.put("priority", "high");

        AppFunctionTaskDispatcher.Result result =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_UPDATE_TASK, valid);

        assertTrue(result.success);
        assertEquals("task-today-1", result.data.getString("taskId"));
        assertEquals("pending_sync", result.data.getString("status"));
    }

    @Test
    public void completeTaskOptimisticallyUpdatesSnapshotAndEnqueuesSync() throws Exception {
        login();

        // 1. Mark task completed
        Map<String, Object> completeParams = new HashMap<>();
        completeParams.put("taskId", "task-today-1");
        completeParams.put("completed", true);

        AppFunctionTaskDispatcher.Result completeResult =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_COMPLETE_TASK, completeParams);

        assertTrue(completeResult.success);
        assertTrue(completeResult.data.getBoolean("completed"));
        assertEquals("completed", completeResult.data.getString("status"));

        // Verify optimistic update in local AgendaData
        JSONObject updated = AgendaData.task(context, "task-today-1");
        assertNotNull(updated);
        assertTrue(updated.getBoolean("completed"));
        assertEquals("done", updated.getString("status"));

        // 2. Reopen task
        completeParams.put("completed", false);
        AppFunctionTaskDispatcher.Result reopenResult =
            AppFunctionTaskDispatcher.dispatch(context, AppFunctionTaskDispatcher.ACTION_COMPLETE_TASK, completeParams);

        assertTrue(reopenResult.success);
        assertFalse(reopenResult.data.getBoolean("completed"));
        assertEquals("reopened", reopenResult.data.getString("status"));

        JSONObject reopened = AgendaData.task(context, "task-today-1");
        assertNotNull(reopened);
        assertFalse(reopened.getBoolean("completed"));
        assertEquals("todo", reopened.getString("status"));
    }

    @Test
    public void handlesPrefixInFunctionIdentifier() throws Exception {
        login();

        Map<String, Object> params = new HashMap<>();
        params.put("limit", 5);

        AppFunctionTaskDispatcher.Result result = AppFunctionTaskDispatcher.dispatch(
            context,
            "life.arshnaz.app.ArshnazAppFunctionService#listTodayTasks",
            params
        );

        assertTrue(result.success);
        assertNotNull(result.items);
    }
}
