package life.arshnaz.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** User-initiated widget click router. Activity PendingIntents reliably open destinations on modern Android. */
public final class WidgetRouterActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Uri data = getIntent().getData();
        if (data == null || !"widget-action".equals(data.getHost())) { finish(); return; }
        String owner = data.getQueryParameter("owner");
        String activeOwner = AgendaData.prefs(this).getString("dataUserId", "");
        if (owner != null && !owner.isEmpty() && !owner.equals(activeOwner)) { finish(); return; }
        String taskId = data.getQueryParameter("taskId");
        String operation = data.getPathSegments().isEmpty() ? "" : data.getPathSegments().get(0);
        if (taskId == null || taskId.isEmpty()) { finish(); return; }
        if ("open".equals(operation)) {
            Intent open = AgendaWidgetProvider.appIntent(this,
                "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(activeOwner));
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(open);
        } else if ("toggle".equals(operation)) {
            boolean completed = "1".equals(data.getQueryParameter("completed"));
            AgendaData.setCompleted(this, taskId, !completed);
            AgendaData.prefs(this).edit().putString("syncStatus",
                completed ? "Reopening task from widget…" : "Completing task from widget…").commit();
            AgendaWidgetProvider.redraw(this);
            WidgetTaskActionWorker.enqueue(this, completed ? "reopen" : "complete", taskId, "", "", "");
            overridePendingTransition(0, 0);
            finish();
            overridePendingTransition(0, 0);
            return;
        } else if ("collapse".equals(operation)) {
            int widgetId = -1;
            try { widgetId = Integer.parseInt(data.getQueryParameter("widgetId")); } catch (Exception ignored) { }
            android.content.SharedPreferences options = AgendaData.options(this);
            if (widgetId >= 0) {
                String key = "widget." + widgetId + ".collapsed." + taskId;
                options.edit().putBoolean(key, !options.getBoolean(key, false)).commit();
                AgendaWidgetProvider.update(this, android.appwidget.AppWidgetManager.getInstance(this), widgetId);
            } else {
                android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(this);
                for (Class<?> type : AgendaWidgetProvider.TYPES) {
                    for (int wId : m.getAppWidgetIds(new android.content.ComponentName(this, type))) {
                        String key = "widget." + wId + ".collapsed." + taskId;
                        options.edit().putBoolean(key, !options.getBoolean(key, false)).commit();
                    }
                }
                AgendaWidgetProvider.redraw(this);
            }
            overridePendingTransition(0, 0);
            finish();
            overridePendingTransition(0, 0);
            return;
        } else if ("menu".equals(operation)) {
            startActivity(new Intent(this, WidgetTaskActionActivity.class).putExtra("taskId", taskId).putExtra("mode", "menu"));
        } else if ("edit".equals(operation)) {
            startActivity(new Intent(this, WidgetTaskActionActivity.class).putExtra("taskId", taskId).putExtra("mode", "edit"));
        }
        finish();
    }
}
