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
    static boolean isToday(String due, LocalDate today, ZoneId zone) {
        try {
            return (due.length() == 10 ? LocalDate.parse(due)
                : OffsetDateTime.parse(due).atZoneSameInstant(zone).toLocalDate()).equals(today);
        } catch (RuntimeException e) { return false; }
    }

    static JSONObject parse(String json, LocalDate today, ZoneId zone) throws Exception {
        JSONArray rows = new JSONArray(json);
        List<JSONObject> tasks = new ArrayList<>();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject doc = rows.getJSONObject(i).optJSONObject("document");
            if (doc == null) continue;
            JSONObject fields = doc.optJSONObject("fields");
            if (fields == null) continue;
            JSONObject completed = fields.optJSONObject("completed");
            if ((completed != null && completed.optBoolean("booleanValue")) || "done".equals(string(fields, "status"))) continue;
            if (isToday(string(fields, "due_date"), today, zone)) tasks.add(doc);
        }
        tasks.sort(Comparator.comparing((JSONObject d) -> string(d.optJSONObject("fields"), "due_date"))
            .thenComparing(d -> d.optString("name")));
        StringBuilder titles = new StringBuilder();
        for (int i = 0; i < Math.min(3, tasks.size()); i++) {
            if (i > 0) titles.append("\n");
            titles.append("• ").append(string(tasks.get(i).getJSONObject("fields"), "title"));
        }
        String name = tasks.isEmpty() ? "" : tasks.get(0).optString("name");
        return new JSONObject().put("activeCount", tasks.size())
            .put("nextTaskId", name.substring(name.lastIndexOf('/') + 1)).put("nextTaskTitle", titles.toString());
    }

    static String string(JSONObject fields, String key) {
        if (fields == null) return "";
        JSONObject field = fields.optJSONObject(key);
        return field == null ? "" : field.optString("stringValue", field.optString("timestampValue", ""));
    }
}
