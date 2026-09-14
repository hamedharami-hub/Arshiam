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

    static CharSequence formatTitle(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        if (!raw.contains("*") && !raw.contains("[") && !raw.contains("==") && !raw.contains("__")) return raw;
        try {
            String html = raw
                .replaceAll("\\[(?:color:)?red\\]\\{([^}]+)\\}", "<font color=\"#f43f5e\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?blue\\]\\{([^}]+)\\}", "<font color=\"#0284c7\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?green\\]\\{([^}]+)\\}", "<font color=\"#10b981\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?(?:yellow|amber|gold)\\]\\{([^}]+)\\}", "<font color=\"#f59e0b\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?(?:purple|violet)\\]\\{([^}]+)\\}", "<font color=\"#9333ea\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?orange\\]\\{([^}]+)\\}", "<font color=\"#f97316\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?pink\\]\\{([^}]+)\\}", "<font color=\"#ec4899\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?cyan\\]\\{([^}]+)\\}", "<font color=\"#06b6d4\"><b>$1</b></font>")
                .replaceAll("\\[(?:color:)?(#[0-9a-fA-F]{3,6})\\]\\{([^}]+)\\}", "<font color=\"$1\"><b>$2</b></font>")
                .replaceAll("\\*\\*\\*([^*]+)\\*\\*\\*", "<b><i>$1</i></b>")
                .replaceAll("\\*\\*([^*]+)\\*\\*", "<b>$1</b>")
                .replaceAll("__([^_]+)__", "<b>$1</b>")
                .replaceAll("==([^=]+)==", "<font color=\"#d97706\"><b>$1</b></font>");
            return android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_LEGACY);
        } catch (Exception e) {
            return raw;
        }
    }
}
