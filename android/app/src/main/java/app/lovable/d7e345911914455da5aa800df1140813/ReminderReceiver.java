package app.lovable.d7e345911914455da5aa800df1140813;
import android.content.*;
public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i) {
        NativeReminders.deliver(c,i.getStringExtra("taskId"),i.getStringExtra("owner"),"snooze".equals(i.getAction()));
    }
}
