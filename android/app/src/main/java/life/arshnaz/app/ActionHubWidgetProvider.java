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
            views.setTextViewText(R.id.hub_primary, primaryLabel()); views.setOnClickPendingIntent(R.id.hub_primary, action(c,primaryRoute(),id * 10 + 1));
            int[] buttons = {R.id.hub_action_one, R.id.hub_action_two, R.id.hub_action_three}; String[] labels = labels(), routes = routes();
            for (int i = 0; i < buttons.length; i++) {
                views.setTextViewText(buttons[i], labels[i]);
                views.setOnClickPendingIntent(buttons[i], action(c,routes[i],id * 10 + i + 2));
            }
            manager.updateAppWidget(id, views);
        }
    }
    private static PendingIntent action(Context c,String route,int code) {
        if ("quick-add".equals(route)) return AgendaWidgetProvider.activity(c,"new-task",code);
        if ("quick-mind-step".equals(route)) return AgendaWidgetProvider.quickCreate(c,code,"Take one kind step",true,"mind");
        if ("quick-problem-step".equals(route)) return AgendaWidgetProvider.quickCreate(c,code,"Define the next smallest step",true,"problem");
        return AgendaWidgetProvider.activity(c,route,code);
    }
}
