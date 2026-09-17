package life.arshnaz.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** User-initiated widget click router. Activity PendingIntents reliably open destinations on modern Android. */
public final class WidgetRouterActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        handleIntent(getIntent());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) { finish(); return; }
        Uri data = intent.getData();
        if (data == null || !"widget-action".equals(data.getHost())) { finish(); return; }
        String owner = data.getQueryParameter("owner");
        String activeOwner = AgendaData.prefs(this).getString("dataUserId", "");
        if (owner != null && !owner.isEmpty() && !owner.equals(activeOwner)) { finish(); return; }
        String taskId = data.getQueryParameter("taskId");
        String operation = data.getPathSegments().isEmpty() ? "" : data.getPathSegments().get(0);
        if (taskId == null || taskId.isEmpty()) { finish(); return; }
        String routeOwner = (owner != null && !owner.isEmpty()) ? owner : activeOwner;
        if ("open".equals(operation)) {
            Intent open = AgendaWidgetProvider.appIntent(this,
                "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(routeOwner));
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(open);
        } else if ("toggle".equals(operation)) {
            boolean targetCompleted;
            if (data.getQueryParameter("targetCompleted") != null) {
                targetCompleted = "1".equals(data.getQueryParameter("targetCompleted")) || "true".equalsIgnoreCase(data.getQueryParameter("targetCompleted"));
            } else {
                boolean completed = "1".equals(data.getQueryParameter("completed"));
                targetCompleted = !completed;
            }
            AgendaData.setCompleted(this, taskId, targetCompleted);
            AgendaData.prefs(this).edit().putString("syncStatus",
                targetCompleted ? "Saving completion from widget…" : "Reopening task from widget…").commit();
            AgendaWidgetProvider.redraw(this);
            WidgetTaskActionWorker.enqueue(this, targetCompleted ? "complete" : "reopen", taskId, "", "", "");
            overridePendingTransition(0, 0);
            finish();
            overridePendingTransition(0, 0);
            return;
        } else if ("collapse".equals(operation)) {
            int widgetId = -1;
            try { widgetId = Integer.parseInt(data.getQueryParameter("widgetId")); } catch (Exception ignored) { }
            android.content.SharedPreferences options = AgendaData.options(this);
            boolean targetCollapsed;
            if (data.getQueryParameter("targetCollapsed") != null) {
                targetCollapsed = "1".equals(data.getQueryParameter("targetCollapsed")) || "true".equalsIgnoreCase(data.getQueryParameter("targetCollapsed"));
            } else {
                targetCollapsed = widgetId >= 0 ? !options.getBoolean("widget." + widgetId + ".collapsed." + taskId, false) : true;
            }
            if (widgetId >= 0) {
                String key = "widget." + widgetId + ".collapsed." + taskId;
                options.edit().putBoolean(key, targetCollapsed).commit();
                AgendaWidgetProvider.update(this, android.appwidget.AppWidgetManager.getInstance(this), widgetId);
            } else {
                android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(this);
                for (Class<?> type : AgendaWidgetProvider.TYPES) {
                    for (int wId : m.getAppWidgetIds(new android.content.ComponentName(this, type))) {
                        String key = "widget." + wId + ".collapsed." + taskId;
                        options.edit().putBoolean(key, targetCollapsed).commit();
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
