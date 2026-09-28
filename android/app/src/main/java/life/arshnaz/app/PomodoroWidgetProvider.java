package life.arshnaz.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

/** A durable, launcher-native 25 minute focus timer. No foreground service is needed for its display. */
public final class PomodoroWidgetProvider extends AppWidgetProvider {
    static final String ACTION_START = "life.arshnaz.app.pomodoro.START";
    static final String ACTION_PAUSE = "life.arshnaz.app.pomodoro.PAUSE";
    static final String ACTION_FINISH = "life.arshnaz.app.pomodoro.FINISH";
    static final String ACTION_RESET = "life.arshnaz.app.pomodoro.RESET";
    static final String ACTION_EXPIRE = "life.arshnaz.app.pomodoro.EXPIRE";
    static final long SESSION_MS = 25L * 60L * 1000L;
    private static final String PREFS = "arshnaz_pomodoro_widget";

    static final class State {
        final boolean running; final long remainingMs; final boolean hasStarted;
        State(boolean running, long remainingMs, boolean hasStarted) {
            this.running = running; this.remainingMs = remainingMs; this.hasStarted = hasStarted;
        }
        boolean complete() { return !running && remainingMs == 0L; }
    }
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static State state(Context context) {
        SharedPreferences store = prefs(context);
        boolean running = store.getBoolean("running", false);
        boolean hasStarted = store.getBoolean("hasStarted", false);
        long remaining = Math.max(0L, store.getLong("remainingMs", SESSION_MS));
        if (!running) return new State(false, remaining, hasStarted);
        remaining = Math.max(0L, store.getLong("endAt", 0L) - System.currentTimeMillis());
        if (remaining > 0L) return new State(true, remaining, true);
        store.edit().putBoolean("running", false).putBoolean("hasStarted", true).putLong("remainingMs", 0L).remove("endAt").apply();
        cancelFinish(context);
        return new State(false, 0L, true);
    }
    static void start(Context context) {
        State state = state(context); long duration = state.remainingMs > 0L ? state.remainingMs : SESSION_MS;
        long endAt = System.currentTimeMillis() + duration;
        prefs(context).edit().putBoolean("running", true).putBoolean("hasStarted", true).putLong("remainingMs", duration).putLong("endAt", endAt).apply();
        scheduleFinish(context, endAt);
    }
    static void pause(Context context) {
        State state = state(context); if (!state.running) return;
        prefs(context).edit().putBoolean("running", false).putLong("remainingMs", state.remainingMs).remove("endAt").apply();
        cancelFinish(context);
    }
    static void finish(Context context) { prefs(context).edit().putBoolean("running", false).putBoolean("hasStarted", true).putLong("remainingMs", 0L).remove("endAt").apply(); cancelFinish(context); }
    static void reset(Context context) { prefs(context).edit().putBoolean("running", false).putBoolean("hasStarted", false).putLong("remainingMs", SESSION_MS).remove("endAt").apply(); cancelFinish(context); }

    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_START.equals(action)) start(context);
        else if (ACTION_PAUSE.equals(action)) pause(context);
        else if (ACTION_FINISH.equals(action) || ACTION_EXPIRE.equals(action)) finish(context);
        else if (ACTION_RESET.equals(action)) reset(context);
        else { super.onReceive(context, intent); return; }
        updateAll(context);
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) { for (int id : ids) manager.updateAppWidget(id, views(context, id)); }
    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, PomodoroWidgetProvider.class))) manager.updateAppWidget(id, views(context, id));
    }
    static RemoteViews views(Context context, int widgetId) {
        State state = state(context); RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_action_hub);
        views.setTextViewText(R.id.hub_symbol, state.running ? "◷" : state.complete() ? "✓" : "◔");
        views.setTextViewText(R.id.hub_title, "Focus timer");
        views.setTextViewText(R.id.hub_subtitle, state.running ? "Stay with one deliberate task" : state.complete() ? "Session complete — choose what is next" : "A calm, deliberate 25-minute session");
        views.setViewVisibility(R.id.hub_timer, View.VISIBLE);
        views.setTextViewText(R.id.hub_timer, format(state.remainingMs));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && state.running) {
            views.setChronometer(R.id.hub_timer, SystemClock.elapsedRealtime() + state.remainingMs, null, true);
            views.setChronometerCountDown(R.id.hub_timer, true);
        }
        if (state.running) {
            configure(views, context, R.id.hub_primary, "Pause", ACTION_PAUSE, widgetId, 1);
            configure(views, context, R.id.hub_action_one, "Finish", ACTION_FINISH, widgetId, 2);
        } else {
            configure(views, context, R.id.hub_primary, state.hasStarted && !state.complete() ? "Resume" : "Start 25 min", ACTION_START, widgetId, 1);
            configure(views, context, R.id.hub_action_one, "Reset 25 min", ACTION_RESET, widgetId, 2);
        }
        configureRoute(views, context, R.id.hub_action_two, "Open timer", "pomodoro", widgetId, 3);
        configureRoute(views, context, R.id.hub_action_three, "Quick add", "new-task", widgetId, 4);
        return views;
    }
    private static void configure(RemoteViews views, Context context, int viewId, String label, String action, int widgetId, int requestCode) {
        views.setTextViewText(viewId, label);
        Intent intent = new Intent(context, PomodoroWidgetProvider.class).setAction(action).setData(android.net.Uri.parse("arshnaz://pomodoro/" + widgetId + "/" + action));
        views.setOnClickPendingIntent(viewId, PendingIntent.getBroadcast(context, widgetId * 10 + requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
    private static void configureRoute(RemoteViews views, Context context, int viewId, String label, String route, int widgetId, int requestCode) {
        views.setTextViewText(viewId, label); views.setOnClickPendingIntent(viewId, AgendaWidgetProvider.activity(context, route, widgetId * 10 + requestCode));
    }
    private static PendingIntent finishAlarm(Context context) {
        Intent intent = new Intent(context, PomodoroWidgetProvider.class).setAction(ACTION_EXPIRE).setData(android.net.Uri.parse("arshnaz://pomodoro/expire"));
        return PendingIntent.getBroadcast(context, 90101, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void scheduleFinish(Context context, long endAt) { AlarmManager alarms = context.getSystemService(AlarmManager.class); if (alarms != null) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, finishAlarm(context)); }
    private static void cancelFinish(Context context) { AlarmManager alarms = context.getSystemService(AlarmManager.class); if (alarms != null) alarms.cancel(finishAlarm(context)); }
    static String format(long millis) { long seconds = Math.max(0L, (millis + 999L) / 1000L); return String.format(java.util.Locale.US, "%02d:%02d", seconds / 60L, seconds % 60L); }
}
