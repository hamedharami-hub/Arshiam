package life.arshnaz.app;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.LocalDate;
import java.time.ZoneId;
import org.json.JSONObject;
import org.json.JSONArray;

public class WidgetTasksTest {
    private final LocalDate today = LocalDate.of(2026, 9, 10);
    private final ZoneId sydney = ZoneId.of("Australia/Sydney");
    @Test public void utcTimestampIsConvertedToLocalDay() {
        assertTrue(WidgetTasks.isToday("2026-09-09T14:30:00Z", today, sydney));
        assertFalse(WidgetTasks.isToday("2026-09-10T14:30:00Z", today, sydney));
        assertTrue(WidgetTasks.isToday("2026-09-10", today, sydney));
        assertFalse(WidgetTasks.isToday("broken", today, sydney));
    }
    private JSONObject row(String id, boolean done) throws Exception {
        return new JSONObject().put("document", new JSONObject().put("name", "users/u/tasks/" + id)
            .put("fields", new JSONObject()
                .put("title", new JSONObject().put("stringValue", id))
                .put("due_date", new JSONObject().put("stringValue", "2026-09-09T14:30:00Z"))
                .put("completed", new JSONObject().put("booleanValue", done))));
    }
    @Test public void parsesMultilineRestArrayAndThreeTitles() throws Exception {
        JSONArray rows = new JSONArray().put(row("c", false)).put(row("a", false))
            .put(row("b", false)).put(row("d", false)).put(row("done", true));
        JSONObject result = WidgetTasks.parse(rows.toString(2), today, sydney);
        assertEquals(4, result.getInt("activeCount"));
        assertEquals("a", result.getString("nextTaskId"));
        assertEquals("• a\n• b\n• c", result.getString("nextTaskTitle"));
    }
    @Test public void emptyResultsClearPreviousTask() throws Exception {
        JSONObject result = WidgetTasks.parse("[{\"readTime\":\"2026-09-10T00:00:00Z\"}]", today, sydney);
        assertEquals(0, result.getInt("activeCount"));
        assertEquals("", result.getString("nextTaskId"));
    }
    @Test(expected = org.json.JSONException.class)
    public void malformedResponseDoesNotBecomeEmptySuccess() throws Exception {
        WidgetTasks.parse("not json", today, sydney);
    }
}
