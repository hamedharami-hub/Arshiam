package app.lovable.d7e345911914455da5aa800df1140813;

import android.app.IntentService;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.Context;
import android.os.IBinder;

public class ArshnazWidgetUpdateService extends IntentService {
    public ArshnazWidgetUpdateService() {
        super("ArshnazWidgetUpdateService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        if (intent != null && intent.getAction() != null) {
            if (intent.getAction().equals("android.appwidget.action.APPWIDGET_UPDATE")) {
                Context context = this;
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
                    new android.content.ComponentName(context, ArshnazWidgetProvider.class)
                );
                new ArshnazWidgetProvider().onUpdate(context, appWidgetManager, appWidgetIds);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
