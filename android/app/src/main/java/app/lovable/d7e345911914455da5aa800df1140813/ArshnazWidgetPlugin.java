package app.lovable.d7e345911914455da5aa800df1140813;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;
import android.content.Intent;
import android.provider.CalendarContract;
import android.content.res.Configuration;

@CapacitorPlugin(name = "ArshnazWidget")
public class ArshnazWidgetPlugin extends Plugin {
    private static final String PREFS = "arshnaz_widget_data";
    private static final String WORK_NAME = "arshnaz-widget-hourly-sync";
    static final Object SESSION_LOCK = new Object();

    @PluginMethod
    public void prepareSession(PluginCall call) {
        synchronized (SESSION_LOCK) {
            try {
                String uid = call.getString("userId", "");
                // Preserve same-account alarms/snoozes while Firebase restores its token.
                if (!uid.isEmpty() && uid.equals(ArshnazSecureStore.open(getContext()).getString("userId", ""))) {
                    call.resolve(); return;
                }
            } catch (Exception ignored) {}
            call.getData().put("userId", "");
            setSession(call);
        }
    }

    @PluginMethod
    public void setSession(PluginCall call) {
        synchronized (SESSION_LOCK) {
            SharedPreferences state = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            state.edit().putBoolean("sessionReady", false).commit();
            try {
                SharedPreferences secure = ArshnazSecureStore.open(getContext());
                String uid = call.getString("userId", "");
                long nextGeneration = secure.getLong("generation", 0) + 1;
                boolean changed = !uid.equals(secure.getString("userId", ""));
                if (changed || uid.isEmpty()) {
                    AgendaData.options(getContext()).edit().putBoolean("remindersEnabled",false).apply();
                    secure.edit().clear().commit();
                    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
                    WorkManager.getInstance(getContext()).cancelUniqueWork("arshnaz-widget-refresh");
                }
                boolean saved = secure.edit().putString("userId", uid)
                    .putString("idToken", call.getString("idToken", ""))
                    .putString("refreshToken", call.getString("refreshToken", ""))
                    .putLong("expiresAt", call.getLong("expiresAt", 0L))
                    .putString("apiKey", call.getString("apiKey", ""))
                    .putString("projectId", call.getString("projectId", ""))
                    .putString("databaseId", call.getString("databaseId", ""))
                    .putLong("generation", nextGeneration).commit();
                if (!saved) throw new IllegalStateException("Session could not be persisted");
                state.edit().putBoolean("sessionReady", !uid.isEmpty()).putString("dataUserId",uid).commit();
                if (!uid.isEmpty()) ArshnazWidgetWorker.enqueue(getContext());
                else WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
                if (!uid.isEmpty()) schedule();
                ArshnazWidgetProvider.redraw(getContext());
                call.resolve();
            } catch (Exception e) {
                getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
                ArshnazWidgetProvider.redraw(getContext());
                call.reject("Secure widget session unavailable");
            }
        }
    }

    @Override
    public void load() {
        super.load();
        schedule();
    }

    private void schedule() {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            ArshnazWidgetScheduleWorker.class, 1, TimeUnit.HOURS
        ).build();
        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
            WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request
        );
    }

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        int activeCount = call.getInt("activeCount", 0);
        String nextTaskId = call.getString("nextTaskId", "");
        String nextTaskTitle = call.getString("nextTaskTitle", "");
        String userId = call.getString("userId", "");
        synchronized (SESSION_LOCK) {
        try {
            SharedPreferences secure = ArshnazSecureStore.open(getContext());
            if (userId.isEmpty() || !userId.equals(secure.getString("userId", ""))
                || !getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("sessionReady", false)) {
                call.resolve();
                return;
            }
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        preferences.edit()
            .putString("agendaTasks", call.getArray("tasks",new com.getcapacitor.JSArray()).toString())
            .putString("dataUserId", userId)
            .putInt("activeCount", activeCount)
            .putString("nextTaskId", nextTaskId == null ? "" : nextTaskId)
            .putString("nextTaskTitle", nextTaskTitle == null ? "" : nextTaskTitle)
            .putLong("updatedAt", System.currentTimeMillis())
            .putBoolean("pendingChanges", call.getBoolean("pendingChanges", false))
            .putString("syncStatus", "از برنامه؛ برای دریافت آنلاین به‌روزرسانی کنید")
            .putLong("payloadRevision", preferences.getLong("payloadRevision", 0) + 1)
            .apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName provider = new ComponentName(getContext(), ArshnazWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            new ArshnazWidgetProvider().onUpdate(getContext(), manager, ids);
        }
        AgendaWidgetProvider.redraw(getContext());
        NativeReminders.reconcile(getContext());
        call.resolve(new JSObject().put("updated", true).put("widgetCount", ids.length));
        } catch (Exception e) { call.reject("Widget storage unavailable"); }
        }
    }

    @PluginMethod
    public void addCalendarEvent(PluginCall call) {
        String title = call.getString("title", "ARSHNAZ task");
        Long start = call.getLong("startMillis");
        Long end = call.getLong("endMillis");
        if (start == null) { call.reject("startMillis is required"); return; }
        Intent intent = new Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI);
        intent.putExtra(CalendarContract.Events.TITLE, title);
        intent.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start);
        intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end == null ? start + 30 * 60 * 1000 : end);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve(new JSObject().put("opened", true));
    }

    @PluginMethod
    public void getSystemTheme(PluginCall call) {
        int mode = getContext().getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        call.resolve(new JSObject().put("dark", mode == Configuration.UI_MODE_NIGHT_YES));
    }
}
