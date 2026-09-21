package life.arshnaz.app;

import android.content.*;

public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null) return;
        String action = i.getAction();
        String taskId = i.getStringExtra("taskId");
        String owner = i.getStringExtra("owner");
        if (taskId == null || taskId.isEmpty()) return;

        if ("snooze".equals(action)) {
            int snoozeMinutes = i.getIntExtra("snoozeMinutes", 10);
            NativeReminders.snooze(c, taskId, owner, snoozeMinutes);
        } else if ("cancel".equals(action)) {
            NativeReminders.cancelTaskReminder(c, taskId);
        } else {
            NativeReminders.deliver(c, taskId, owner);
        }
    }
}
