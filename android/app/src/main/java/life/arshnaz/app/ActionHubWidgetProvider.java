package life.arshnaz.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/** Compact launcher widgets for focus, mind and problem-solving entry points. */
public abstract class ActionHubWidgetProvider extends AppWidgetProvider {
    abstract String symbol(); abstract String title(); abstract String subtitle(); abstract String primaryLabel(); abstract String primaryRoute();
    abstract String[] labels(); abstract String[] routes();
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews views = new RemoteViews(c.getPackageName(), R.layout.widget_action_hub);
            views.setTextViewText(R.id.hub_symbol, symbol());
            views.setTextViewText(R.id.hub_title, title()); views.setTextViewText(R.id.hub_subtitle, subtitle());
            views.setViewVisibility(R.id.hub_timer, View.GONE);
            views.setTextViewText(R.id.hub_primary, primaryLabel()); views.setOnClickPendingIntent(R.id.hub_primary, AgendaWidgetProvider.activity(c, primaryRoute(), id * 10 + 1));
            int[] buttons = {R.id.hub_action_one, R.id.hub_action_two, R.id.hub_action_three}; String[] labels = labels(), routes = routes();
            for (int i = 0; i < buttons.length; i++) {
                views.setTextViewText(buttons[i], labels[i]);
                PendingIntent action = "quick-add".equals(routes[i]) ? AgendaWidgetProvider.activity(c, "new-task", id * 10 + i + 2)
                    : AgendaWidgetProvider.activity(c, routes[i], id * 10 + i + 2);
                views.setOnClickPendingIntent(buttons[i], action);
            }
            manager.updateAppWidget(id, views);
        }
    }
}
