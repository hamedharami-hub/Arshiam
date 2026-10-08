package life.arshnaz.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.media.AudioAttributes;
import android.media.RingtoneManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Shows the in-app Pomodoro session in Android's notification shade and restores its end alarm. */
final class PomodoroFocusNotification {
    static final String CHANNEL_ID = "arshnaz_focus_timer";
    static final String COMPLETION_CHANNEL_ID = "arshnaz_focus_timer_complete";
    static final int NOTIFICATION_ID = 870025;
    static final String ACTION_FINISH = "life.arshnaz.app.pomodoro.FOCUS_FINISH";
    private static final int ALARM_REQUEST = 870026;
    private static final String STORE = "arshnaz_pomodoro_focus_notification";

    private PomodoroFocusNotification() {}

    static void sync(Context context, boolean active, boolean running, boolean completed, String sessionId,
                     String title, String mode, long endAt, long remainingSeconds) {
        if (completed) {
            cancelAlarm(context);
            clear(context);
            showCompletion(context, title, mode, Math.max(0L, remainingSeconds));
            return;
        }
        if (!active) {
            cancel(context);
            return;
        }

        String safeTitle = title == null ? "" : title.trim();
        if (safeTitle.length() > 120) safeTitle = safeTitle.substring(0, 120);
        SharedPreferences.Editor editor = store(context).edit()
            .putBoolean("active", true)
            .putBoolean("running", running)
            .putString("sessionId", sessionId == null ? "" : sessionId)
            .putString("title", safeTitle)
            .putString("mode", "short".equals(mode) || "long".equals(mode) ? mode : "work")
            .putLong("remainingSeconds", Math.max(0L, remainingSeconds));
        if (running && endAt > System.currentTimeMillis()) editor.putLong("endAt", endAt);
        else editor.remove("endAt");
        editor.apply();

        if (running && endAt > System.currentTimeMillis()) scheduleFinish(context, endAt);
        else cancelAlarm(context);
        show(context, safeTitle, mode, running, endAt, remainingSeconds, false);
    }

    static void cancel(Context context) {
        cancelAlarm(context);
        clear(context);
        try { NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID); } catch (SecurityException ignored) {}
    }

    static void onAlarm(Context context) {
        SharedPreferences state = store(context);
        if (!state.getBoolean("active", false) || !state.getBoolean("running", false)) return;
        long endAt = state.getLong("endAt", 0L);
        if (endAt > System.currentTimeMillis()) {
            scheduleFinish(context, endAt);
            return;
        }
        String title = state.getString("title", "");
        String mode = state.getString("mode", "work");
        clear(context);
        showCompletion(context, title, mode, 0L);
    }

    static void restoreAfterBoot(Context context) {
        SharedPreferences state = store(context);
        if (!state.getBoolean("active", false) || !state.getBoolean("running", false)) return;
        long endAt = state.getLong("endAt", 0L);
        if (endAt <= 0L) return;
        if (endAt <= System.currentTimeMillis()) {
            onAlarm(context);
            return;
        }
        scheduleFinish(context, endAt);
        show(context, state.getString("title", ""), state.getString("mode", "work"), true,
            endAt, Math.max(0L, (endAt - System.currentTimeMillis() + 999L) / 1000L), false);
    }

    private static SharedPreferences store(Context context) {
        return context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    }

    private static void clear(Context context) {
        store(context).edit().clear().apply();
    }

    private static PendingIntent finishIntent(Context context) {
        Intent intent = new Intent(context, PomodoroFocusReceiver.class).setAction(ACTION_FINISH);
        intent.setData(android.net.Uri.parse("arshnaz://pomodoro/focus-finish"));
        return PendingIntent.getBroadcast(context, ALARM_REQUEST, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleFinish(Context context, long endAt) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 31 && alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, finishIntent(context));
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, finishIntent(context));
            }
        } catch (SecurityException ignored) {
            // Exact-alarm access can change after the check. Keep a best-effort inexact alarm instead.
            try { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, finishIntent(context)); }
            catch (SecurityException alsoIgnored) {
                // The in-app deadline still recovers when the app resumes; Android may also delay alarms in Doze.
            }
        }
    }

    private static void cancelAlarm(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) alarms.cancel(finishIntent(context));
    }

    private static boolean hasActiveCompletion(Context context) {
        if (Build.VERSION.SDK_INT < 26) return false;
        try {
            for (android.service.notification.StatusBarNotification active
                    : NotificationManagerCompat.from(context).getActiveNotifications()) {
                Notification notification = active.getNotification();
                if (active.getId() == NOTIFICATION_ID && notification != null
                        && COMPLETION_CHANNEL_ID.equals(notification.getChannelId())) return true;
            }
        } catch (SecurityException ignored) { /* Notification permission may have been revoked. */ }
        return false;
    }

    private static void showCompletion(Context context, String title, String mode, long remainingSeconds) {
        // Replace the quiet countdown once; repeated syncs update the completion alert silently.
        if (!hasActiveCompletion(context)) {
            try { NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID); } catch (SecurityException ignored) {}
        }
        show(context, title, mode, false, 0L, remainingSeconds, true);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel countdown = new NotificationChannel(CHANNEL_ID, "تایمر تمرکز", NotificationManager.IMPORTANCE_LOW);
        countdown.setDescription("زمان باقی‌ماندهٔ جلسهٔ تمرکز فعال");
        countdown.setSound(null, null);
        countdown.enableVibration(false);
        countdown.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(countdown);

        NotificationChannel completion = new NotificationChannel(
            COMPLETION_CHANNEL_ID, "پایان جلسهٔ تمرکز", NotificationManager.IMPORTANCE_HIGH);
        completion.setDescription("اعلان پایان تایمر تمرکز و استراحت");
        completion.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        completion.setVibrationPattern(new long[] {0, 400, 250, 400});
        completion.enableVibration(true);
        completion.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(completion);
    }

    private static void show(Context context, String taskTitle, String mode, boolean running, long endAt,
                             long remainingSeconds, boolean completed) {
        if (!TaskPanel.allowed(context)) return;
        ensureChannel(context);
        String task = taskTitle == null || taskTitle.trim().isEmpty() ? "تمرکز آزاد" : taskTitle.trim();
        String title;
        String body;
        if (completed) {
            title = "work".equals(mode) ? "زمان تمرکز تمام شد" : "زمان استراحت تمام شد";
            body = "work".equals(mode) ? "جلسهٔ تمرکزت به پایان رسید · " + task : "زمان استراحت به پایان رسید · " + task;
        } else if ("short".equals(mode) || "long".equals(mode)) {
            title = "استراحت · " + task;
            body = running ? "زمان استراحت در حال شمارش است" : "تایمر استراحت متوقف است";
        } else {
            title = task;
            body = running ? "در حال تمرکز" : "تمرکز متوقف است";
        }
        if (Build.VERSION.SDK_INT < 24 || !running) {
            long seconds = Math.max(0L, remainingSeconds);
            body += " · " + String.format(java.util.Locale.US, "%02d:%02d", seconds / 60L, seconds % 60L);
        }
        Intent open = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(android.net.Uri.parse("arshnaz://pomodoro"))
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(context, NOTIFICATION_ID, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context,
                completed ? COMPLETION_CHANNEL_ID : CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_tasks)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(contentIntent)
            .setOnlyAlertOnce(true)
            .setSilent(!completed)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(completed)
            .setOngoing(!completed);
        if (completed) builder.setPriority(NotificationCompat.PRIORITY_HIGH);
        if (running && !completed && endAt > 0L) {
            builder.setWhen(endAt).setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= 24) builder.setChronometerCountDown(true);
        }
        try { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build()); }
        catch (SecurityException ignored) { /* Notification permission is optional; app timer remains usable. */ }
    }
}
