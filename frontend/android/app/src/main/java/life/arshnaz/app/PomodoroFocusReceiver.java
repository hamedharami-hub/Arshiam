package life.arshnaz.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class PomodoroFocusReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (PomodoroFocusNotification.ACTION_FINISH.equals(intent.getAction())) {
            PomodoroFocusNotification.onAlarm(context);
        }
    }
}
