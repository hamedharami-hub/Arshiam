package app.lovable.d7e345911914455da5aa800df1140813;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ArshnazWidgetWorker extends Worker {
    private static final String PROJECT_ID = "gen-lang-client-0845891098";
    private static final String DATABASE_ID = "ai-studio-smarttasknotes-8c44cce7-d637-4402-9467-7188161b37e5";

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
            if (!userId.isEmpty() && !token.isEmpty()) {
                refreshFromFirebase(context, userId, token);
            }
        } catch (Exception ignored) {
            // Keep the last known widget payload when background auth/network is unavailable.
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
            new ComponentName(context, ArshnazWidgetProvider.class));
        if (ids.length > 0) {
            ArshnazWidgetProvider.updateAll(context, manager, ids);
        }
        return Result.success();
    }

    private void refreshFromFirebase(Context context, String userId, String token) throws Exception {
        String endpoint = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID
            + "/databases/" + DATABASE_ID + "/documents:runQuery";
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "application/json");

        JSONObject structuredQuery = new JSONObject()
            .put("from", new JSONArray().put(new JSONObject().put("collectionId", "tasks")))
            .put("orderBy", new JSONArray().put(new JSONObject()
                .put("field", new JSONObject().put("fieldPath", "due_date"))
                .put("direction", "ASCENDING")));
        JSONObject query = new JSONObject()
            .put("structuredQuery", structuredQuery)
            .put("parent", "projects/" + PROJECT_ID + "/databases/" + DATABASE_ID
                + "/documents/users/" + userId);

        connection.getOutputStream().write(query.toString().getBytes(StandardCharsets.UTF_8));
        int status = connection.getResponseCode();
        if (status != HttpURLConnection.HTTP_OK) {
            closeQuietly(connection.getErrorStream());
            return;
        }

        List<JSONObject> rows = readJsonLines(connection.getInputStream());
        int count = 0;
        String nextId = "";
        String nextTitle = "";
        String today = LocalDate.now().toString();

        for (JSONObject row : rows) {
            JSONObject document = row.optJSONObject("document");
            if (document == null) continue;
            JSONObject fields = document.optJSONObject("fields");
            if (fields == null) continue;
            if (readBoolean(fields, "completed") || "done".equals(readString(fields, "status"))) continue;

            String due = readString(fields, "due_date");
            if (due.isEmpty() || !due.startsWith(today)) continue;

            count++;
            if (nextId.isEmpty()) {
                String name = document.optString("name", "");
                int slash = name.lastIndexOf('/');
                nextId = slash >= 0 ? name.substring(slash + 1) : "";
                nextTitle = readString(fields, "title");
            }
        }

        context.getSharedPreferences("arshnaz_widget_data", Context.MODE_PRIVATE).edit()
            .putInt("activeCount", count)
            .putString("nextTaskId", nextId)
            .putString("nextTaskTitle", nextTitle)
            .apply();
    }

    private List<JSONObject> readJsonLines(InputStream stream) throws Exception {
        List<JSONObject> rows = new ArrayList<>();
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        String line;
        while ((line = reader.readLine()) != null) {
            if (!line.trim().isEmpty()) rows.add(new JSONObject(line));
        }
        return rows;
    }

    private String readString(JSONObject fields, String key) {
        JSONObject field = fields.optJSONObject(key);
        if (field == null) return "";
        String value = field.optString("stringValue", "");
        return value.isEmpty() ? field.optString("timestampValue", "") : value;
    }

    private boolean readBoolean(JSONObject fields, String key) {
        JSONObject field = fields.optJSONObject(key);
        return field != null && field.optBoolean("booleanValue", false);
    }

    private void closeQuietly(InputStream stream) {
        if (stream == null) return;
        try { stream.close(); } catch (Exception ignored) {}
    }
}
