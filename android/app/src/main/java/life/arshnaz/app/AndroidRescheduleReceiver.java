package life.arshnaz.app;
import android.content.*;
public class AndroidRescheduleReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i) {
        String action=i.getAction();
        if(!Intent.ACTION_BOOT_COMPLETED.equals(action)&&!Intent.ACTION_TIME_CHANGED.equals(action)&&!Intent.ACTION_TIMEZONE_CHANGED.equals(action)&&!Intent.ACTION_DATE_CHANGED.equals(action)
            &&!Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)&&!"android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action))return;
        NativeReminders.reconcile(c,true);
        ArshnazWidgetProvider.redraw(c);
    }
}
