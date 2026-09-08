package app.lovable.d7e345911914455da5aa800df1140813;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class ArshnazWidgetProvider extends AppWidgetProvider {
    private static final String APP_SCHEME = "arshnaz://";
    private static final String PREFS = "arshnaz_widget_data";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_arshnaz);
            
            // Set Persian Date
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEEE dd MMMM", new java.util.Locale("fa"));
            String dateStr = sdf.format(new java.util.Date());
            views.setTextViewText(R.id.widget_date, dateStr);
            android.content.SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            int activeCount = preferences.getInt("activeCount", 0);
            String nextTaskId = preferences.getString("nextTaskId", "");
            String nextTaskTitle = preferences.getString("nextTaskTitle", "");
            views.setTextViewText(R.id.widget_task_count, String.valueOf(activeCount));
            views.setTextViewText(R.id.widget_next_task, nextTaskTitle == null || nextTaskTitle.isEmpty() ? "تسک فعالی برای امروز نیست" : nextTaskTitle);
            
            // 1. Container click -> Open Today View
            Intent openAppIntent = createAppIntent(context, "today");
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 101, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent);

            // 2. Add Task button -> Open Quick Add Task
            Intent addTaskIntent = createAppIntent(context, "new-task");
            PendingIntent addTaskPendingIntent = PendingIntent.getActivity(
                context, 102, addTaskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_add_task, addTaskPendingIntent);

            // 3. Checkin button -> Open Daily Checkin
            Intent checkinIntent = createAppIntent(context, "checkin");
            PendingIntent checkinPendingIntent = PendingIntent.getActivity(
                context, 103, checkinIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_checkin, checkinPendingIntent);

            Intent completeIntent = createAppIntent(context, "complete-task?taskId=" + android.net.Uri.encode(nextTaskId));
            PendingIntent completePendingIntent = PendingIntent.getActivity(
                context, 105, completeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_complete_task, completePendingIntent);

            // 4. Garden button -> Open Mind Garden
            Intent gardenIntent = createAppIntent(context, "garden");
            PendingIntent gardenPendingIntent = PendingIntent.getActivity(
                context, 104, gardenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_garden_btn, gardenPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
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
