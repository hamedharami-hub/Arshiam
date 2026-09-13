package life.arshnaz.app;

import androidx.work.Data;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk={28,35})
public class WidgetTaskActionWorkerTest {
    @Test public void rejectsWorkFromAnotherAccountOrSession() {
        Data queued = new Data.Builder().putString("ownerId", "owner-a").putLong("sessionGeneration", 7).build();
        assertTrue(WidgetTaskActionWorker.belongsToSession(queued, "owner-a", 7));
        assertFalse(WidgetTaskActionWorker.belongsToSession(queued, "owner-b", 7));
        assertFalse(WidgetTaskActionWorker.belongsToSession(queued, "owner-a", 8));
    }

    @Test public void quickEditPreservesDueDateWhenTheUserChoosesKeepCurrentDate() throws Exception {
        JSONObject fields = WidgetTaskActionWorker.editFields("New title", "high", "", true);
        assertTrue(fields.has("title"));
        assertTrue(fields.has("priority"));
        assertTrue(fields.has("updated_at"));
        assertFalse(fields.has("due_date"));
    }

    @Test public void completionRecordsAndReopenClearsTheCompletionTime() throws Exception {
        JSONObject completed = WidgetTaskActionWorker.completionFields(true);
        assertTrue(completed.getJSONObject("completed_at").has("timestampValue"));
        assertEquals("done", completed.getJSONObject("status").getString("stringValue"));

        JSONObject reopened = WidgetTaskActionWorker.completionFields(false);
        assertTrue(reopened.getJSONObject("completed_at").has("nullValue"));
        assertEquals("todo", reopened.getJSONObject("status").getString("stringValue"));
    }
}
