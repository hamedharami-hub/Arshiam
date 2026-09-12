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
            for (String key : new String[]{"title","due_date","priority","status","reminder_at","folder_id","parent_id"})
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
        return select(rows, scope, "none", showDone, highOnly, today, zone);
    }
    static List<JSONObject> select(JSONArray rows, String primary, String secondary, boolean showDone,
                                    boolean highOnly, LocalDate today, ZoneId zone) {
        Map<String,JSONObject> eligible = new LinkedHashMap<>();
        Set<String> selected = new LinkedHashSet<>();
        for (int i=0; i<rows.length(); i++) {
            JSONObject t = rows.optJSONObject(i);
            if (t == null || "wont_do".equals(t.optString("status"))) continue;
            if (!showDone && (t.optBoolean("completed") || "done".equals(t.optString("status")))) continue;
            if (highOnly && !"high".equals(t.optString("priority")) && !"urgent".equals(t.optString("priority"))) continue;
            eligible.put(t.optString("id"), t);
            if (matches(t, primary, today, zone) || (!"none".equals(secondary) && matches(t, secondary, today, zone)))
                selected.add(t.optString("id"));
        }
        // A selected parent brings its descendants; a selected child brings its visible ancestors for context.
        boolean changed;
        do {
            changed = false;
            for (JSONObject t : eligible.values()) {
                String id=t.optString("id"), parent=t.optString("parent_id");
                if (!parent.isEmpty() && selected.contains(parent) && selected.add(id)) changed=true;
                if (selected.contains(id) && !parent.isEmpty() && eligible.containsKey(parent) && selected.add(parent)) changed=true;
            }
        } while(changed);
        Map<String,List<JSONObject>> children=new HashMap<>();
        List<JSONObject> roots=new ArrayList<>();
        for(String id:selected) {
            JSONObject t=eligible.get(id); if(t==null) continue;
            String parent=t.optString("parent_id");
            if(parent.isEmpty() || !selected.contains(parent)) roots.add(t);
            else children.computeIfAbsent(parent,k->new ArrayList<>()).add(t);
        }
        Comparator<JSONObject> order=Comparator.comparing((JSONObject t)->t.optBoolean("completed"))
            .thenComparing(t->t.optString("due_date").isEmpty()?"9999":t.optString("due_date"))
            .thenComparing(t->t.optString("id"));
        roots.sort(order); for(List<JSONObject> group:children.values()) group.sort(order);
        List<JSONObject> result=new ArrayList<>();
        for(JSONObject root:roots) flatten(root,0,children,result,new HashSet<>());
        return result;
    }
    private static boolean matches(JSONObject t,String scope,LocalDate today,ZoneId zone) {
            LocalDate d=date(t.optString("due_date"),zone);
            boolean include;
            switch (scope) {
                case "tomorrow": include = today.plusDays(1).equals(d); break;
                case "next7": include = d != null && !d.isBefore(today) && d.isBefore(today.plusDays(7)); break;
                case "overdue": include = d != null && d.isBefore(today); break;
                case "undated": include = t.optString("due_date").isEmpty(); break;
                case "high": include = "high".equals(t.optString("priority")) || "urgent".equals(t.optString("priority")); break;
                case "all": return true;
                default: return today.equals(d);
            }
            return include;
    }
    private static void flatten(JSONObject task,int depth,Map<String,List<JSONObject>> children,
                                List<JSONObject> result,Set<String> visited) {
        String id=task.optString("id"); if(!visited.add(id)) return;
        try { task.put("_widgetDepth",Math.min(depth,4)); } catch(JSONException ignored) {}
        result.add(task);
        for(JSONObject child:children.getOrDefault(id,Collections.emptyList())) flatten(child,depth+1,children,result,visited);
    }
    static List<JSONObject> select(Context c, String scope, boolean done, boolean high) {
        return select(read(c), scope, done, high, LocalDate.now(), ZoneId.systemDefault());
    }
    static List<JSONObject> select(Context c, String primary, String secondary, boolean done, boolean high) {
        return select(read(c), primary, secondary, done, high, LocalDate.now(), ZoneId.systemDefault());
    }
    static JSONObject task(Context c, String id) {
        if (id == null || id.isEmpty()) return null;
        JSONArray rows = read(c);
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row != null && id.equals(row.optString("id"))) return row;
        }
        return null;
    }
    static String label(String scope) {
        switch(scope) {
            case "tomorrow": return "Tomorrow";
            case "next7": return "Next 7 Days";
            case "overdue": return "Overdue";
            case "undated": return "No Date";
            case "high": return "Focus";
            case "all": return "All Tasks";
            default: return "Today";
        }
    }
    static String dueLabel(String raw) {
        try {
            if(raw.isEmpty())return "No date";
            if(raw.length()==10)return LocalDate.parse(raw).format(java.time.format.DateTimeFormatter.ofPattern("MM/dd"));
            return OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.systemDefault())
                .format(java.time.format.DateTimeFormatter.ofPattern("MM/dd HH:mm"));
        } catch(RuntimeException e){return "";}
    }
    static String route(String scope) {
        return Arrays.asList("today","tomorrow","next7").contains(scope) ? scope : "inbox";
    }
}
