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

    @Override
    public void load() {
        super.load();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            ArshnazWidgetWorker.class, 1, TimeUnit.HOURS
        ).build();
        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
            WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request
        );
    }

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        int activeCount = call.getInt("activeCount", 0);
        String nextTaskId = call.getString("nextTaskId", "");
        String nextTaskTitle = call.getString("nextTaskTitle", "");
        String userId = call.getString("userId", "");
        String idToken = call.getString("idToken", "");
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        preferences.edit()
            .putInt("activeCount", activeCount)
            .putString("nextTaskId", nextTaskId == null ? "" : nextTaskId)
            .putString("nextTaskTitle", nextTaskTitle == null ? "" : nextTaskTitle)
            .apply();
        try {
            SharedPreferences secure = ArshnazSecureStore.open(getContext());
            secure.edit().putString("userId", userId == null ? "" : userId)
                .putString("idToken", idToken == null ? "" : idToken).apply();
        } catch (Exception ignored) {
            // The widget still works from the last synchronized payload if secure storage is unavailable.
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName provider = new ComponentName(getContext(), ArshnazWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            new ArshnazWidgetProvider().onUpdate(getContext(), manager, ids);
        }
        call.resolve(new JSObject().put("updated", true).put("widgetCount", ids.length));
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
