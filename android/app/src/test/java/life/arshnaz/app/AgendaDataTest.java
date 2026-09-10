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
}
