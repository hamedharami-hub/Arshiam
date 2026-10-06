package life.arshnaz.app;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.app.*;
import android.content.*;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import org.json.JSONArray;

@CapacitorPlugin(name="NativeExperience")
public class NativeExperiencePlugin extends Plugin {
    @PluginMethod public void haptic(PluginCall call) {
        String kind = call.getString("kind", "light");
        getActivity().runOnUiThread(() -> {
            int feedback = HapticFeedbackConstants.CLOCK_TICK;
            if (kind.equals("medium") || kind.equals("heavy")) feedback = HapticFeedbackConstants.LONG_PRESS;
            if (Build.VERSION.SDK_INT >= 30 && kind.equals("success")) feedback = HapticFeedbackConstants.CONFIRM;
            if (Build.VERSION.SDK_INT >= 30 && (kind.equals("error") || kind.equals("warning"))) feedback = HapticFeedbackConstants.REJECT;
            boolean performed = getActivity().getWindow().getDecorView().performHapticFeedback(feedback);
            call.resolve(new JSObject().put("performed", performed));
        });
    }

    @PluginMethod public void configure(PluginCall call) {
        SharedPreferences.Editor edit = AgendaData.options(getContext()).edit();
        if (call.getBoolean("panelEnabled") != null) edit.putBoolean("panelEnabled", call.getBoolean("panelEnabled"));
        if (call.getBoolean("remindersEnabled") != null) edit.putBoolean("remindersEnabled", call.getBoolean("remindersEnabled"));
        if (call.getBoolean("appFunctionsEnabled") != null) edit.putBoolean("appFunctionsEnabled", call.getBoolean("appFunctionsEnabled"));
        edit.commit();
        TaskPanel.update(getContext());
        NativeReminders.reconcile(getContext());
        status(call);
    }

    @PluginMethod public void status(PluginCall call) {
        AlarmManager alarms = getContext().getSystemService(AlarmManager.class);
        boolean exact = Build.VERSION.SDK_INT < 31 || (alarms != null && alarms.canScheduleExactAlarms());
        boolean appFunctionsSupported = Build.VERSION.SDK_INT >= 36;
        boolean appFunctionsEnabled = AgendaData.options(getContext()).getBoolean("appFunctionsEnabled", true);

        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoringBattery = Build.VERSION.SDK_INT < 23 || (pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));

        call.resolve(new JSObject()
            .put("notificationsAllowed", TaskPanel.allowed(getContext()))
            .put("exactAllowed", exact)
            .put("ignoringBattery", ignoringBattery)
            .put("panelEnabled", AgendaData.options(getContext()).getBoolean("panelEnabled", false))
            .put("remindersEnabled", AgendaData.options(getContext()).getBoolean("remindersEnabled", false))
            .put("scheduledCount", NativeReminders.count(getContext()))
            .put("appFunctionsSupported", appFunctionsSupported)
            .put("appFunctionsEnabled", appFunctionsEnabled)
            .put("appFunctionsPreview", true));
    }

    @PluginMethod public void getReminderLedger(PluginCall call) {
        try {
            JSONArray arr = NativeReminders.getLedgerArray(getContext());
            call.resolve(new JSObject().put("ledger", new JSArray(arr.toString())));
        } catch (Exception e) {
            call.reject("Could not read reminders ledger", e);
        }
    }

    @PluginMethod public void cancelReminder(PluginCall call) {
        String taskId = call.getString("taskId", "");
        if (!taskId.isEmpty()) {
            NativeReminders.cancelTaskReminder(getContext(), taskId);
        }
        call.resolve(new JSObject().put("cancelled", true));
    }

    @PluginMethod public void snoozeReminder(PluginCall call) {
        String taskId = call.getString("taskId", "");
        int minutes = call.getInt("minutes", 10);
        String owner = AgendaData.prefs(getContext()).getString("dataUserId", "");
        if (!taskId.isEmpty()) {
            NativeReminders.snooze(getContext(), taskId, owner, minutes);
        }
        call.resolve(new JSObject().put("snoozed", true));
    }

    @PluginMethod public void testNotification(PluginCall call) {
        try {
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            if (manager != null) {
                if (Build.VERSION.SDK_INT >= 26) {
                    NotificationChannel channel = new NotificationChannel(
                        NativeReminders.CHANNEL_ID,
                        "یادآورهای تسک",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.enableVibration(true);
                    manager.createNotificationChannel(channel);
                }
                Notification notification = new androidx.core.app.NotificationCompat.Builder(getContext(), NativeReminders.CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_tasks)
                    .setContentTitle("⏰ تست یادآور ARSHNAZ")
                    .setContentText("سیستم اعلان و یادآورهای اندروید به درستی پیکربندی شده است.")
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .build();
                manager.notify(999999, notification);
            }
            call.resolve(new JSObject().put("sent", true));
        } catch (Exception e) {
            call.reject("Failed to fire test notification", e);
        }
    }

    @PluginMethod public void appInfo(PluginCall call) {
        try {
            android.content.pm.PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            call.resolve(new JSObject().put("versionName", info.versionName == null ? "" : info.versionName).put("versionCode", code));
        } catch (Exception e) {
            call.reject("Unable to read installed app version", e);
        }
    }

    @PluginMethod public void openNotificationSettings(PluginCall call) {
        Intent i = new Intent(Build.VERSION.SDK_INT >= 26 ? Settings.ACTION_APP_NOTIFICATION_SETTINGS : Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        if (Build.VERSION.SDK_INT >= 26) i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        else i.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(i);
        call.resolve();
    }

    @PluginMethod public void openExactSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                android.net.Uri.parse("package:" + getContext().getPackageName())));
        }
        call.resolve();
    }

    @PluginMethod public void openBatterySettings(PluginCall call) {
        Intent i = new Intent();
        if (Build.VERSION.SDK_INT >= 23) {
            i.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        } else {
            i.setAction(Settings.ACTION_SETTINGS);
        }
        try {
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open battery settings", e);
        }
    }
}
