package life.arshnaz.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.time.*;
import java.util.*;

/** Shared local snapshot; no credentials in intents, widget options or notifications. */
final class AgendaData {
    static final String PREFS = "arshnaz_widget_data";
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, 0); }
    static SharedPreferences options(Context c) { return c.getSharedPreferences("arshnaz_android_options", 0); }
    static JSONArray read(Context c) {
        if (!prefs(c).getBoolean("sessionReady", false)) return new JSONArray();
        try { return new JSONArray(prefs(c).getString("agendaTasks", "[]")); }
        catch (JSONException e) { return new JSONArray(); }
    }
    static JSONArray fromFirestore(String response) throws JSONException {
        JSONArray result = new JSONArray(), rows = new JSONArray(response);
        for (int i = 0; i < rows.length(); i++) {
            JSONObject doc = rows.getJSONObject(i).optJSONObject("document");
            if (doc == null) continue;
            JSONObject f = doc.optJSONObject("fields");
            if (f == null) continue;
            String path = doc.optString("name");
            JSONObject t = new JSONObject().put("id", path.substring(path.lastIndexOf('/') + 1));
            for (String key : new String[]{"title","due_date","priority","status","reminder_at","folder_id"})
                t.put(key, WidgetTasks.string(f, key));
            JSONObject done = f.optJSONObject("completed");
            t.put("completed", done != null && done.optBoolean("booleanValue"));
            result.put(t);
        }
        return result;
    }
    static LocalDate date(String raw, ZoneId zone) {
        try { return raw.length() == 10 ? LocalDate.parse(raw) : OffsetDateTime.parse(raw).atZoneSameInstant(zone).toLocalDate(); }
        catch (RuntimeException e) { return null; }
    }
    static List<JSONObject> select(JSONArray rows, String scope, boolean showDone, boolean highOnly,
                                    LocalDate today, ZoneId zone) {
        List<JSONObject> result = new ArrayList<>();
        for (int i=0; i<rows.length(); i++) {
            JSONObject t = rows.optJSONObject(i);
            if (t == null || "wont_do".equals(t.optString("status"))) continue;
            if (!showDone && (t.optBoolean("completed") || "done".equals(t.optString("status")))) continue;
            if (highOnly && !"high".equals(t.optString("priority")) && !"urgent".equals(t.optString("priority"))) continue;
            LocalDate d = date(t.optString("due_date"), zone);
            boolean include;
            switch (scope) {
                case "tomorrow": include = today.plusDays(1).equals(d); break;
                case "next7": include = d != null && !d.isBefore(today) && d.isBefore(today.plusDays(7)); break;
                case "overdue": include = d != null && d.isBefore(today); break;
                case "undated": include = t.optString("due_date").isEmpty(); break;
                case "all": include = true; break;
                default: include = today.equals(d);
            }
            if (include) result.add(t);
        }
        result.sort(Comparator.comparing((JSONObject t) -> t.optBoolean("completed"))
            .thenComparing(t -> t.optString("due_date").isEmpty() ? "9999" : t.optString("due_date"))
            .thenComparing(t -> t.optString("id")));
        return result;
    }
    static List<JSONObject> select(Context c, String scope, boolean done, boolean high) {
        return select(read(c), scope, done, high, LocalDate.now(), ZoneId.systemDefault());
    }
    static String label(String scope) {
        switch(scope) {
            case "tomorrow": return "فردا";
            case "next7": return "هفت روز آینده";
            case "overdue": return "عقب‌افتاده";
            case "undated": return "بدون تاریخ";
            case "all": return "همهٔ تسک‌ها";
            default: return "امروز";
        }
    }
    static String dueLabel(String raw) {
        try {
            if(raw.isEmpty())return "بدون تاریخ";
            if(raw.length()==10)return LocalDate.parse(raw).format(java.time.format.DateTimeFormatter.ofPattern("MM/dd"));
            return OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.systemDefault())
                .format(java.time.format.DateTimeFormatter.ofPattern("MM/dd HH:mm"));
        } catch(RuntimeException e){return "";}
    }
    static String route(String scope) {
        return Arrays.asList("today","tomorrow","next7").contains(scope) ? scope : "inbox";
    }
}
