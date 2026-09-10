package life.arshnaz.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class ArshnazWidgetProvider extends AppWidgetProvider {
    private static final String APP_SCHEME = "arshnaz://";
    private static final String PREFS = "arshnaz_widget_data";
    public static final String ACTION_REFRESH = "app.arshnaz.action.WIDGET_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        updateAll(context, manager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, ArshnazWidgetProvider.class));
            ArshnazWidgetWorker.enqueue(context);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("syncStatus", "در انتظار دریافت اطلاعات…").apply();
            updateAll(context, manager, ids);
        }
    }

    public static void updateAll(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int activeCount = preferences.getInt("activeCount", 0);
        String nextTaskId = preferences.getString("nextTaskId", "");
        String nextTaskTitle = preferences.getString("nextTaskTitle", "");
        String date = new SimpleDateFormat("EEEE dd MMMM", new Locale("fa")).format(new Date());
        long updatedAt = preferences.getLong("updatedAt", 0);
        String status = preferences.getString("syncStatus", "برای نمایش تسک‌ها وارد برنامه شوید");
        if (updatedAt > 0) status += " · آخرین داده: " +
            new SimpleDateFormat("MM/dd HH:mm", new Locale("fa")).format(new Date(updatedAt));

        for (int appWidgetId : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_arshnaz);
            views.setTextViewText(R.id.widget_date, date);
            views.setTextViewText(R.id.widget_sync_status, status);
            views.setTextViewText(R.id.widget_task_count, String.valueOf(activeCount));
            views.setTextViewText(R.id.widget_next_task,
                nextTaskTitle == null || nextTaskTitle.isEmpty()
                    ? "تسک فعالی برای امروز نیست"
                    : nextTaskTitle);

            setActivityClick(views, context, R.id.widget_container, "today", 101);
            setActivityClick(views, context, R.id.widget_add_task, "new-task", 102);
            setActivityClick(views, context, R.id.widget_checkin, "checkin", 103);
            setActivityClick(views, context, R.id.widget_garden_btn, "garden", 104);
            setActivityClick(views, context, R.id.widget_pomodoro, "pomodoro", 106);
            setActivityClick(views, context, R.id.widget_notes, "notes", 107);
            setActivityClick(views, context, R.id.widget_complete_task,
                "complete-task?taskId=" + Uri.encode(nextTaskId), 105);

            Intent refresh = new Intent(context, ArshnazWidgetProvider.class)
                .setAction(ACTION_REFRESH)
                .setData(Uri.parse("arshnaz://refresh/" + appWidgetId));
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 108 + appWidgetId, refresh,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent);

            manager.updateAppWidget(appWidgetId, views);
        }
    }

    static void redraw(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        updateAll(context, manager, manager.getAppWidgetIds(new ComponentName(context, ArshnazWidgetProvider.class)));
        AgendaWidgetProvider.redraw(context);
        NativeReminders.reconcile(context);
    }

    private static void setActivityClick(RemoteViews views, Context context, int viewId,
                                         String route, int requestCode) {
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, requestCode, createAppIntent(context, route),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(viewId, pendingIntent);
    }

    private static Intent createAppIntent(Context context, String route) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(APP_SCHEME + route));
        intent.putExtra("arshnaz_route", route);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return intent;
    }
}
