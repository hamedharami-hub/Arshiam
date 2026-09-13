package life.arshnaz.app;
import org.junit.Test;
import org.json.*;
import java.time.*;
import static org.junit.Assert.*;
public class AgendaDataTest {
    final LocalDate today=LocalDate.of(2026,9,10);
    final ZoneId zone=ZoneId.of("Australia/Sydney");
    JSONObject task(String id,String date) throws Exception {return new JSONObject().put("id",id).put("due_date",date).put("title",id);}
    @Test public void separatesTodayTomorrowWeekAndOverdue() throws Exception {
        JSONArray rows=new JSONArray().put(task("a","2026-09-10")).put(task("b","2026-09-11")).put(task("c","2026-09-09")).put(task("d","2026-09-17"));
        assertEquals("a",AgendaData.select(rows,"today",false,false,today,zone).get(0).getString("id"));
        assertEquals("b",AgendaData.select(rows,"tomorrow",false,false,today,zone).get(0).getString("id"));
        assertEquals(2,AgendaData.select(rows,"next7",false,false,today,zone).size());
        assertEquals("c",AgendaData.select(rows,"overdue",false,false,today,zone).get(0).getString("id"));
    }
    @Test public void localDatesCompletionAndPriority() throws Exception {
        JSONArray rows=new JSONArray().put(task("utc","2026-09-09T14:30:00Z").put("priority","urgent"))
            .put(task("done","2026-09-10").put("completed",true)).put(task("skip","2026-09-10").put("status","wont_do"));
        assertEquals(1,AgendaData.select(rows,"today",false,false,today,zone).size());
        assertEquals(2,AgendaData.select(rows,"today",true,false,today,zone).size());
        assertEquals(1,AgendaData.select(rows,"today",true,true,today,zone).size());
    }
    @Test public void emptyUndatedAndMalformedDates() throws Exception {
        JSONArray rows=new JSONArray().put(task("none","")).put(task("invalid","not-a-date"));
        assertEquals(0,AgendaData.select(rows,"today",false,false,today,zone).size());
        assertEquals(1,AgendaData.select(rows,"undated",false,false,today,zone).size());
    }
    @Test public void includesSubtasksAndPreservesHierarchy() throws Exception {
        JSONArray rows=new JSONArray().put(task("parent","2026-09-10"))
            .put(task("child","").put("parent_id","parent"))
            .put(task("grandchild","").put("parent_id","child"));
        java.util.List<JSONObject> selected=AgendaData.select(rows,"today",false,false,today,zone);
        assertEquals(3,selected.size());
        assertEquals("parent",selected.get(0).getString("id"));
        assertEquals(1,selected.get(1).getInt("_widgetDepth"));
        assertEquals(2,selected.get(2).getInt("_widgetDepth"));
    }
    @Test public void priorityAndTitleSortingKeepEachSubtaskWithItsParent() throws Exception {
        JSONArray rows=new JSONArray()
            .put(task("later-parent","2026-09-10").put("title","Zebra").put("priority","low"))
            .put(task("later-child","2026-09-10").put("parent_id","later-parent").put("title","Alpha").put("priority","urgent"))
            .put(task("first-parent","2026-09-10").put("title","Apple").put("priority","urgent"))
            .put(task("first-child","2026-09-10").put("parent_id","first-parent").put("title","Zebra").put("priority","low"));
        java.util.List<JSONObject> priority=AgendaData.select(rows,"today","none",false,false,"priority",today,zone);
        assertEquals("first-parent",priority.get(0).getString("id"));
        assertEquals("first-child",priority.get(1).getString("id"));
        assertEquals("later-parent",priority.get(2).getString("id"));
        assertEquals("later-child",priority.get(3).getString("id"));
        java.util.List<JSONObject> title=AgendaData.select(rows,"today","none",false,false,"title",today,zone);
        assertEquals("first-parent",title.get(0).getString("id"));
        assertEquals("first-child",title.get(1).getString("id"));
        assertEquals("later-parent",title.get(2).getString("id"));
        assertEquals("later-child",title.get(3).getString("id"));
    }
    @Test public void combinesTwoIndependentViewsWithoutDuplicates() throws Exception {
        JSONArray rows=new JSONArray().put(task("today","2026-09-10"))
            .put(task("tomorrow","2026-09-11")).put(task("both","2026-09-10").put("priority","high"));
        java.util.List<JSONObject> selected=AgendaData.select(rows,"today","high",false,false,today,zone);
        assertEquals(2,selected.size());
        assertTrue(selected.stream().anyMatch(t->"both".equals(t.optString("id"))));
    }
    @Test public void widgetListSupportsAllAvailableTasksWithALauncherSafetyCap() {
        assertEquals(100,AgendaListService.Factory.normalizeLimit(100));
        assertEquals(100,AgendaListService.Factory.normalizeLimit(10000));
        assertEquals(1,AgendaListService.Factory.normalizeLimit(0));
    }
}
