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
            AgendaData.prefs(this).edit().putString("syncStatus",
                completed ? "Reopening task from widget…" : "Completing task from widget…").apply();
            WidgetTaskActionWorker.enqueue(this, completed ? "reopen" : "complete", taskId, "", "", "");
            AgendaWidgetProvider.redraw(this);
        } else if ("edit".equals(operation)) {
            startActivity(new Intent(this, WidgetTaskActionActivity.class).putExtra("taskId", taskId));
        }
        finish();
    }
}
