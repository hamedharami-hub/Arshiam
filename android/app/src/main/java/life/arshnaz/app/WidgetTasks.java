package life.arshnaz.app;

import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Pure parsing/date policy shared by worker tests. Firestore REST returns a JSON array. */
final class WidgetTasks {
    static String workDate(JSONObject fields) {
        if (fields == null) return "";
        if (fields.has("work_date")) return string(fields, "work_date");
        String legacy = string(fields, "work_date");
        if (legacy.isEmpty()) legacy = string(fields, "due_at");
        if (legacy.isEmpty()) legacy = string(fields, "start_at");
        return legacy;
    }

    static boolean isToday(String due, LocalDate today, ZoneId zone) {
        try {
            return (due.length() == 10 ? LocalDate.parse(due)
                : OffsetDateTime.parse(due).atZoneSameInstant(zone).toLocalDate()).equals(today);
        } catch (RuntimeException e) { return false; }
    }

    static JSONObject parse(String json, LocalDate today, ZoneId zone) throws Exception {
        JSONArray rows = new JSONArray(json);
        List<JSONObject> tasks = new ArrayList<>();
        String nextId = "";
        for (int i = 0; i < rows.length(); i++) {
            JSONObject doc = rows.getJSONObject(i).optJSONObject("document");
            if (doc == null) continue;
            JSONObject fields = doc.optJSONObject("fields");
            if (fields == null) continue;
            JSONObject completed = fields.optJSONObject("completed");
            boolean closed = (completed != null && completed.optBoolean("booleanValue")) || "done".equals(string(fields, "status"));
            if (!closed && !"wont_do".equals(string(fields, "status")) && isExplicitNext(fields)) {
                String id = docId(doc.optString("name"));
                if (!id.isEmpty() && (nextId.isEmpty() || id.compareTo(nextId) < 0)) nextId = id;
            }
            if (closed) continue;
            if (isToday(workDate(fields), today, zone)) tasks.add(doc);
        }
        tasks.sort(Comparator.comparing((JSONObject d) -> workDate(d.optJSONObject("fields")))
            .thenComparing(d -> d.optString("name")));
        StringBuilder titles = new StringBuilder();
        for (int i = 0; i < Math.min(3, tasks.size()); i++) {
            if (i > 0) titles.append("\n");
            titles.append("• ").append(string(tasks.get(i).getJSONObject("fields"), "title"));
        }
        return new JSONObject().put("activeCount", tasks.size())
            .put("nextTaskId", nextId).put("nextTaskTitle", titles.toString());
    }

    /** Only a boolean is_next counts. Missing, string, or false does not fall back to the first today task. */
    static boolean isExplicitNext(JSONObject fields) {
        JSONObject field = fields.optJSONObject("is_next");
        return field != null && field.has("booleanValue") && field.optBoolean("booleanValue");
    }

    static String docId(String name) {
        if (name == null || name.isEmpty()) return "";
        int slash = name.lastIndexOf('/');
        return slash < 0 ? name : name.substring(slash + 1);
    }

    static String string(JSONObject fields, String key) {
        if (fields == null) return "";
        JSONObject field = fields.optJSONObject(key);
        return field == null ? "" : field.optString("stringValue", field.optString("timestampValue", ""));
    }
}
