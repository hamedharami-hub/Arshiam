package app.lovable.d7e345911914455da5aa800df1140813;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import android.content.SharedPreferences;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import org.json.JSONArray;
import org.json.JSONObject;

public class ArshnazWidgetWorker extends Worker {
    public ArshnazWidgetWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        try {
            SharedPreferences secure = ArshnazSecureStore.open(context);
            String userId = secure.getString("userId", "");
            String token = secure.getString("idToken", "");
            if (!userId.isEmpty() && !token.isEmpty()) refreshFromFirebase(context, userId, token);
        } catch (Exception ignored) {
            return Result.retry();
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, ArshnazWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            new ArshnazWidgetProvider().onUpdate(context, manager, ids);
        }
        return Result.success();
    }

    private void refreshFromFirebase(Context context, String userId, String token) throws Exception {
        String project = "gen-lang-client-0845891098";
        String database = "ai-studio-smarttasknotes-8c44cce7-d637-4402-9467-7188161b37e5";
        String endpoint = "https://firestore.googleapis.com/v1/projects/" + project
            + "/databases/" + database + "/documents:runQuery";
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "application/json");
        JSONObject query = new JSONObject().put("structuredQuery", new JSONObject()
            .put("from", new JSONArray().put(new JSONObject().put("collectionId", "tasks")))
            .put("where", new JSONObject().put("fieldFilter", new JSONObject()
                .put("field", new JSONObject().put("fieldPath", "user_id"))
                .put("op", "EQUAL")
                .put("value", new JSONObject().put("stringValue", userId)))))
            .put("parent", "projects/" + project + "/databases/" + database + "/documents");
        connection.getOutputStream().write(query.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if (connection.getResponseCode() != 200) return;
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
        StringBuilder body = new StringBuilder(); String line;
        while ((line = reader.readLine()) != null) body.append(line);
        JSONArray rows = new JSONArray("[" + body.toString().replace("}\n{", "},{") + "]");
        int count = 0; String nextId = ""; String nextTitle = "";
        String today = LocalDate.now().toString();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject document = rows.optJSONObject(i).optJSONObject("document");
            if (document == null) continue;
            JSONObject fields = document.optJSONObject("fields");
            if (fields == null || fields.optJSONObject("completed") != null && fields.optJSONObject("completed").optBoolean("booleanValue")) continue;
            String due = value(fields, "due_date");
            if (!due.startsWith(today)) continue;
            count++;
            if (nextId.isEmpty()) {
                String name = document.optString("name", "");
                nextId = name.substring(name.lastIndexOf('/') + 1);
                nextTitle = value(fields, "title");
            }
        }
        context.getSharedPreferences("arshnaz_widget_data", Context.MODE_PRIVATE).edit()
            .putInt("activeCount", count).putString("nextTaskId", nextId).putString("nextTaskTitle", nextTitle).apply();
    }

    private String value(JSONObject fields, String key) {
        JSONObject field = fields.optJSONObject(key);
        if (field == null) return "";
        String value = field.optString("stringValue", "");
        return value.isEmpty() ? field.optString("timestampValue", "") : value;
    }
}
