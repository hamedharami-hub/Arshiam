package life.arshnaz.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/** Performs an explicit, authenticated widget mutation, then refreshes the read-only snapshot. */
public final class WidgetTaskActionWorker extends Worker {
    private static final String PREFS = "arshnaz_widget_data";
    private static final String WORK = "arshnaz-widget-task-action";
    public WidgetTaskActionWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    static void enqueue(Context c, String action, String taskId, String title, String priority, String dueDate) {
        enqueue(c, action, taskId, title, priority, dueDate, false);
    }
    static void enqueue(Context c, String action, String taskId, String title, String priority, String dueDate, boolean preserveDueDate) {
        SharedPreferences state = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long sessionGeneration = -1L;
        try {
            sessionGeneration = ArshnazSecureStore.open(c).getLong("generation", 0);
        } catch (Exception ignored) {
            // Do not enqueue a mutation that cannot be bound to the current secure session.
            state.edit().putString("syncStatus", "Open ARSHNAZ before editing from a widget").apply();
        }
        Data input = new Data.Builder().putString("action", action).putString("taskId", taskId == null ? "" : taskId)
            .putString("title", title == null ? "" : title).putString("priority", priority == null ? "none" : priority)
            .putString("dueDate", dueDate == null ? "" : dueDate).putBoolean("preserveDueDate", preserveDueDate)
            .putString("ownerId", state.getString("dataUserId", ""))
            .putLong("sessionGeneration", sessionGeneration).build();
        WorkManager.getInstance(c).enqueueUniqueWork(WORK, ExistingWorkPolicy.APPEND_OR_REPLACE,
            new OneTimeWorkRequest.Builder(WidgetTaskActionWorker.class).setInputData(input)
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build());
    }

    @NonNull @Override public Result doWork() {
        Context c = getApplicationContext();
        String uid = "";
        try {
            SharedPreferences local = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!local.getBoolean("sessionReady", false) || local.getBoolean("pendingChanges", false)) {
                local.edit().putString("syncStatus", "Open ARSHNAZ to finish syncing before widget edits").apply();
                AgendaWidgetProvider.redraw(c); return Result.failure();
            }
            SharedPreferences secure = ArshnazSecureStore.open(c);
            uid = secure.getString("userId", "");
            String project = secure.getString("projectId", ""), database = secure.getString("databaseId", "");
            String token = freshToken(secure);
            if (uid.isEmpty() || project.isEmpty() || database.isEmpty() || token.isEmpty()) throw new AuthExpired();
            if (!belongsToSession(getInputData(), uid, secure.getLong("generation", 0))) {
                status(c, "Widget change belongs to a previous ARSHNAZ session");
                return Result.failure();
            }
            String action = getInputData().getString("action");
            String taskId = getInputData().getString("taskId");
            if ("create".equals(action)) create(project, database, uid, token);
            else if (validId(taskId) && ("complete".equals(action) || "reopen".equals(action))) setCompleted(project, database, uid, taskId, token, "complete".equals(action));
            else if (validId(taskId) && "edit".equals(action)) edit(project, database, uid, taskId, token,
                getInputData().getBoolean("preserveDueDate", false));
            else throw new IllegalArgumentException("Unsupported widget action");
            c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("syncStatus", "Widget change saved").apply();
            ArshnazWidgetWorker.enqueue(c);
            AgendaWidgetProvider.redraw(c);
            return Result.success();
        } catch (AuthExpired e) {
            status(c, "Sign in again in ARSHNAZ before editing from a widget"); return Result.failure();
        } catch (Exception e) {
            status(c, "Widget change was not saved; try again in ARSHNAZ");
            return getRunAttemptCount() < 2 ? Result.retry() : Result.failure();
        }
    }

    private void create(String project, String database, String uid, String token) throws Exception {
        String title = getInputData().getString("title");
        if (title == null || title.trim().isEmpty()) throw new IllegalArgumentException("Title required");
        String id = UUID.randomUUID().toString();
        JSONObject fields = common(title.trim(), getInputData().getString("priority"), getInputData().getString("dueDate"));
        fields.put("id", string(id)).put("user_id", string(uid)).put("completed", bool(false)).put("status", string("todo"))
            .put("description", nil()).put("folder_id", nil()).put("parent_id", nil()).put("reminder_at", nil())
            .put("recurrence", string("none")).put("pinned", bool(false)).put("created_at", timestamp()).put("updated_at", timestamp());
        String url = endpoint(project, database, uid, id, false);
        request("POST", url, new JSONObject().put("fields", fields).toString(), token);
    }
    private void setCompleted(String project, String database, String uid, String id, String token, boolean completed) throws Exception {
        JSONObject fields = completionFields(completed);
        request("PATCH", endpoint(project, database, uid, id, true, "completed", "status", "completed_at", "updated_at"), new JSONObject().put("fields", fields).toString(), token);
    }
    private void edit(String project, String database, String uid, String id, String token, boolean preserveDueDate) throws Exception {
        String title = getInputData().getString("title");
        if (title == null || title.trim().isEmpty()) throw new IllegalArgumentException("Title required");
        JSONObject fields = editFields(title, getInputData().getString("priority"), getInputData().getString("dueDate"), preserveDueDate);
        request("PATCH", endpoint(project, database, uid, id, true,
            preserveDueDate ? new String[]{"title", "priority", "updated_at"} : new String[]{"title", "priority", "due_date", "updated_at"}),
            new JSONObject().put("fields", fields).toString(), token);
    }
    private JSONObject common(String title, String priority, String due) throws Exception {
        JSONObject fields = new JSONObject().put("title", string(title));
        fields.put("priority", string(validPriority(priority)));
        fields.put("due_date", dueValue(due));
        return fields;
    }
    static JSONObject completionFields(boolean completed) throws Exception {
        return new JSONObject().put("completed", bool(completed)).put("status", string(completed ? "done" : "todo"))
            .put("completed_at", completed ? timestamp() : nil()).put("updated_at", timestamp());
    }
    static JSONObject editFields(String title, String priority, String dueDate, boolean preserveDueDate) throws Exception {
        JSONObject fields = new JSONObject().put("title", string(title.trim()))
            .put("priority", string(validPriority(priority)));
        if (!preserveDueDate) fields.put("due_date", dueValue(dueDate));
        return fields.put("updated_at", timestamp());
    }
    private static String validPriority(String priority) { return "low".equals(priority) || "medium".equals(priority) || "high".equals(priority) || "urgent".equals(priority) ? priority : "none"; }
    private static JSONObject dueValue(String due) throws Exception { return due == null || due.isEmpty() ? nil() : string(due); }
    private String freshToken(SharedPreferences secure) throws Exception {
        String token = secure.getString("idToken", "");
        if (!token.isEmpty() && secure.getLong("expiresAt", 0) > System.currentTimeMillis() + 60000) return token;
        String refresh = secure.getString("refreshToken", ""), apiKey = secure.getString("apiKey", "");
        if (refresh.isEmpty() || apiKey.isEmpty()) throw new AuthExpired();
        JSONObject refreshed = new JSONObject(request("POST", "https://securetoken.googleapis.com/v1/token?key=" + encode(apiKey), "grant_type=refresh_token&refresh_token=" + encode(refresh), null, "application/x-www-form-urlencoded"));
        if (!secure.getString("userId", "").equals(refreshed.optString("user_id"))) throw new AuthExpired();
        token = refreshed.getString("id_token");
        secure.edit().putString("idToken", token).putString("refreshToken", refreshed.getString("refresh_token"))
            .putLong("expiresAt", System.currentTimeMillis() + refreshed.getLong("expires_in") * 1000).commit();
        return token;
    }
    private static String endpoint(String project, String database, String uid, String id, boolean patch, String... masks) throws Exception {
        String base = "https://firestore.googleapis.com/v1/projects/" + encode(project) + "/databases/" + encode(database) + "/documents/users/" + encode(uid) + "/tasks";
        if (!patch) return base + "?documentId=" + encode(id);
        StringBuilder url = new StringBuilder(base).append('/').append(encode(id));
        for (String field : masks) url.append(url.indexOf("?") < 0 ? "?" : "&").append("updateMask.fieldPaths=").append(encode(field));
        return url.toString();
    }
    private static boolean validId(String id) { return id != null && id.matches("[A-Za-z0-9_-]{1,128}"); }
    static boolean belongsToSession(Data input, String uid, long generation) {
        String queuedOwner = input.getString("ownerId");
        return queuedOwner != null && queuedOwner.equals(uid) && input.getLong("sessionGeneration", -1) == generation;
    }
    private static JSONObject string(String value) throws Exception { return new JSONObject().put("stringValue", value); }
    private static JSONObject bool(boolean value) throws Exception { return new JSONObject().put("booleanValue", value); }
    private static JSONObject nil() throws Exception { return new JSONObject().put("nullValue", JSONObject.NULL); }
    private static JSONObject timestamp() throws Exception { return new JSONObject().put("timestampValue", Instant.now().toString()); }
    private static String encode(String v) throws Exception { return URLEncoder.encode(v, "UTF-8"); }
    private static final class AuthExpired extends Exception {}
    private static String request(String method, String url, String body, String token) throws Exception { return request(method, url, body, token, "application/json"); }
    private static String request(String method, String url, String body, String token, String contentType) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        try {
            con.setRequestMethod(method); con.setConnectTimeout(15000); con.setReadTimeout(20000); con.setDoOutput(true);
            con.setRequestProperty("Content-Type", contentType); if (token != null) con.setRequestProperty("Authorization", "Bearer " + token);
            try (java.io.OutputStream out = con.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
            int status = con.getResponseCode();
            if (status == 401 || status == 403 || (status == 400 && token == null)) throw new AuthExpired();
            if (status < 200 || status >= 300) throw new java.io.IOException("Widget HTTP " + status);
            try (InputStream in = con.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) { byte[] b = new byte[4096]; int n; while ((n = in.read(b)) != -1) out.write(b, 0, n); return out.toString("UTF-8"); }
        } finally { con.disconnect(); }
    }
    private static void status(Context c, String message) { c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("syncStatus", message).apply(); AgendaWidgetProvider.redraw(c); }
}
