package life.arshnaz.app;

import android.app.Activity;
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
        if ("open".equals(operation) || "menu".equals(operation) || "edit".equals(operation)) {
            openTask(taskId, activeOwner);
        } else if ("toggle".equals(operation)) {
            boolean completed = "1".equals(data.getQueryParameter("completed"));
            AgendaData.setCompleted(this, taskId, !completed);
            AgendaData.prefs(this).edit().putString("syncStatus",
                completed ? "Reopening task from widget…" : "Completing task from widget…").apply();
            WidgetTaskActionWorker.enqueue(this, completed ? "reopen" : "complete", taskId, "", "", "");
            AgendaWidgetProvider.redraw(this);
        } else if ("collapse".equals(operation)) {
            int widgetId = -1;
            try { widgetId=Integer.parseInt(data.getQueryParameter("widgetId")); } catch (Exception ignored) { }
            if (widgetId >= 0) {
                String key="widget."+widgetId+".collapsed."+taskId;
                android.content.SharedPreferences options=AgendaData.options(this);
                options.edit().putBoolean(key,!options.getBoolean(key,false)).apply();
                AgendaWidgetProvider.update(this,android.appwidget.AppWidgetManager.getInstance(this),widgetId);
            }
        }
        finish();
    }

    /**
     * Keeps every task-row entry point on the same direct deep-link path. The
     * launch mode on MainActivity reuses the running WebView and emits the
     * fresh URL to Capacitor, rather than creating a second Android task.
     */
    private void openTask(String taskId, String activeOwner) {
        startActivity(AgendaWidgetProvider.appIntent(this,
            "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(activeOwner)));
    }
}
