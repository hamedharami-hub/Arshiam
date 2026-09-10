package app.lovable.d7e345911914455da5aa800df1140813;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.WorkManager;
import androidx.work.OneTimeWorkRequest;
import androidx.work.ExistingWorkPolicy;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;

public class ArshnazWidgetWorker extends Worker {
    private static final String PREFS = "arshnaz_widget_data";
    public ArshnazWidgetWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    static void enqueue(Context context) {
        WorkManager.getInstance(context).enqueueUniqueWork("arshnaz-widget-refresh", ExistingWorkPolicy.APPEND_OR_REPLACE,
            new OneTimeWorkRequest.Builder(ArshnazWidgetWorker.class)
                .setConstraints(new androidx.work.Constraints.Builder().setRequiredNetworkType(androidx.work.NetworkType.CONNECTED).build()).build());
    }

    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        String uid = "";
        long generation = -1, revision = -1;
        try {
            SharedPreferences secure;
            String token, refresh, apiKey, project, database;
            long expiresAt;
            synchronized (ArshnazWidgetPlugin.SESSION_LOCK) {
                if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("sessionReady", false)) {
                    ArshnazWidgetProvider.redraw(context);
                    return Result.success();
                }
                secure = ArshnazSecureStore.open(context);
                uid = secure.getString("userId", "");
                if (uid.isEmpty()) {
                    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
                    ArshnazWidgetProvider.redraw(context);
                    return Result.success();
                }
                generation = secure.getLong("generation", 0);
                SharedPreferences local = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                if (local.getBoolean("pendingChanges", false)) {
                    local.edit().putString("syncStatus", "تغییرات آفلاین در انتظار همگام‌سازی برنامه").commit();
                    ArshnazWidgetProvider.redraw(context);
                    return Result.success();
                }
                revision = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("payloadRevision", 0);
                token = secure.getString("idToken", "");
                refresh = secure.getString("refreshToken", "");
                apiKey = secure.getString("apiKey", "");
                project = secure.getString("projectId", "");
                database = secure.getString("databaseId", "");
                expiresAt = secure.getLong("expiresAt", 0);
            }
            if (token.isEmpty() || expiresAt < System.currentTimeMillis() + 60000) {
                if (refresh.isEmpty() || apiKey.isEmpty()) throw new AuthExpired();
                JSONObject refreshed = new JSONObject(post(
                    "https://securetoken.googleapis.com/v1/token?key=" + encode(apiKey),
                    "grant_type=refresh_token&refresh_token=" + encode(refresh),
                    "application/x-www-form-urlencoded"));
                if (!uid.equals(refreshed.optString("user_id"))) throw new AuthExpired();
                token = refreshed.getString("id_token");
                synchronized (ArshnazWidgetPlugin.SESSION_LOCK) {
                    if (!current(secure, uid, generation)) return Result.success();
                    secure.edit().putString("idToken", token)
                        .putString("refreshToken", refreshed.getString("refresh_token"))
                        .putLong("expiresAt", System.currentTimeMillis() + refreshed.getLong("expires_in") * 1000).commit();
                }
            }
            if (project.isEmpty() || database.isEmpty()) throw new AuthExpired();
            String endpoint = "https://firestore.googleapis.com/v1/projects/" + encode(project)
                + "/databases/" + encode(database) + "/documents/users/" + encode(uid) + ":runQuery";
            JSONObject query = new JSONObject().put("structuredQuery", new JSONObject()
                .put("from", new JSONArray().put(new JSONObject().put("collectionId", "tasks"))));
            String response = post(endpoint, query.toString(), "application/json", token);
            JSONArray agenda = AgendaData.fromFirestore(response);
            JSONObject payload = WidgetTasks.parse(response,
                LocalDate.now(), ZoneId.systemDefault());
            synchronized (ArshnazWidgetPlugin.SESSION_LOCK) {
                if (isStopped() || !current(secure, uid, generation)) return Result.success();
                SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                if (prefs.getLong("payloadRevision", 0) != revision || prefs.getBoolean("pendingChanges", false)) return Result.success();
                prefs.edit().putString("agendaTasks",agenda.toString()).putString("dataUserId",uid).putInt("activeCount", payload.getInt("activeCount"))
                    .putString("nextTaskId", payload.getString("nextTaskId"))
                    .putString("nextTaskTitle", payload.getString("nextTaskTitle"))
                    .putLong("updatedAt", System.currentTimeMillis()).putString("syncStatus", "دریافت آنلاین موفق")
                    .putLong("payloadRevision", revision + 1).commit();
            }
            ArshnazWidgetProvider.redraw(context);
            return Result.success();
        } catch (AuthExpired e) {
            status(context, uid, generation, revision, "اعتبار ورود کافی نیست؛ برنامه را باز کنید");
            return Result.failure();
        } catch (Exception e) {
            status(context, uid, generation, revision, "دریافت ناموفق؛ اطلاعات ممکن است قدیمی باشد");
            return getRunAttemptCount() < 3 ? Result.retry() : Result.failure();
        }
    }

    private boolean current(SharedPreferences secure, String uid, long generation) {
        return getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("sessionReady", false)
            && uid.equals(secure.getString("userId", "")) && generation == secure.getLong("generation", 0);
    }

    private void status(Context context, String uid, long generation, long revision, String message) {
        synchronized (ArshnazWidgetPlugin.SESSION_LOCK) {
            try {
                if (!current(ArshnazSecureStore.open(context), uid, generation)) return;
                SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                if (prefs.getLong("payloadRevision", 0) != revision) return;
                prefs.edit().putString("syncStatus", message).commit();
                ArshnazWidgetProvider.redraw(context);
            } catch (Exception ignored) { /* No tokens or server bodies in logs. */ }
        }
    }

    private static String encode(String value) throws Exception { return URLEncoder.encode(value, "UTF-8"); }
    private static final class AuthExpired extends Exception {}

    private static String post(String url, String body, String contentType) throws Exception {
        return post(url, body, contentType, null);
    }

    private static String post(String url, String body, String contentType, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(20000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", contentType);
            if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
            try (java.io.OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
            int status = connection.getResponseCode();
            if (status == 401 || status == 403 || (status == 400 && token == null)) throw new AuthExpired();
            if (status != 200) throw new java.io.IOException("Widget HTTP " + status);
            try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (out.size() + read > 8 * 1024 * 1024) throw new java.io.IOException("Widget response too large");
                    out.write(buffer, 0, read);
                }
                return out.toString("UTF-8");
            }
        } finally { connection.disconnect(); }
    }
}
