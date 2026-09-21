package life.arshnaz.app;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import org.json.*;
import java.time.Instant;
import java.util.*;

/**
 * OS-owned reliable multi-step alarms and reminders engine for Android.
 * Supports legacy single-shot reminder_at and advanced multi-step reminder_plan
 * (repeats, until-acknowledged with 24h battery guard, and custom snooze).
 */
final class NativeReminders {
    static final Object LOCK = new Object();
    static final String PREFS_NAME = "arshnaz_native_reminders";
    static final String LEDGER_KEY = "alarms_v2";
    static final String LEGACY_KEY = "alarms";
    static final String CHANNEL_ID = "arshnaz_reminders_v2";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static JSONObject ledger(Context c) {
        try {
            String raw = prefs(c).getString(LEDGER_KEY, null);
            if (raw != null && !raw.isEmpty()) {
                return new JSONObject(raw);
            }
            // Migrate legacy alarms ledger if present
            String legacyRaw = prefs(c).getString(LEGACY_KEY, null);
            if (legacyRaw != null && !legacyRaw.isEmpty()) {
                JSONObject legacy = new JSONObject(legacyRaw);
                JSONObject migrated = new JSONObject();
                for (Iterator<String> it = legacy.keys(); it.hasNext(); ) {
                    String k = it.next();
                    JSONObject row = legacy.optJSONObject(k);
                    if (row != null) {
                        row.put("mode", "once");
                        row.put("fireCount", 0);
                        row.put("status", "pending");
                        row.put("version", 1);
                        migrated.put(k, row);
                    }
                }
                prefs(c).edit().putString(LEDGER_KEY, migrated.toString()).apply();
                return migrated;
            }
            return new JSONObject();
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static int count(Context c) {
        int count = 0;
        JSONObject rows = ledger(c);
        long now = System.currentTimeMillis();
        for (Iterator<String> i = rows.keys(); i.hasNext(); ) {
            JSONObject row = rows.optJSONObject(i.next());
            if (row != null) {
                long at = row.optLong("at", 0);
                String status = row.optString("status", "pending");
                if (at > now && !"missed".equals(status) && !"cancelled".equals(status) && !"acknowledged".equals(status)) {
                    count++;
                }
            }
        }
        return count;
    }

    static JSONArray getLedgerArray(Context c) {
        JSONArray arr = new JSONArray();
        JSONObject rows = ledger(c);
        for (Iterator<String> it = rows.keys(); it.hasNext(); ) {
            JSONObject row = rows.optJSONObject(it.next());
            if (row != null) {
                arr.put(row);
            }
        }
        return arr;
    }

    static PendingIntent alarmIntent(Context c, String id, String owner, int requestCode) {
        Intent intent = new Intent(c, ReminderReceiver.class)
            .setAction("fire")
            .setData(Uri.parse("arshnaz://reminder/" + Uri.encode(owner) + "/" + Uri.encode(id)))
            .putExtra("taskId", id)
            .putExtra("owner", owner);
        return PendingIntent.getBroadcast(
            c,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void schedule(Context c, String id, JSONObject row) {
        long at = row.optLong("at");
        if (at <= System.currentTimeMillis()) return;
        AlarmManager m = c.getSystemService(AlarmManager.class);
        if (m == null) return;
        int notificationId = row.optInt("notificationId", Math.abs(id.hashCode()));
        PendingIntent p = alarmIntent(c, id, row.optString("owner"), notificationId);
        try {
            if (Build.VERSION.SDK_INT < 31 || m.canScheduleExactAlarms()) {
                m.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            } else {
                m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            }
        } catch (SecurityException e) {
            try {
                m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            } catch (Exception ignored) {}
        }
    }

    static void cancel(Context c, String id, JSONObject row) {
        int notificationId = row.optInt("notificationId", Math.abs(id.hashCode()));
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am != null) {
            am.cancel(alarmIntent(c, id, row.optString("owner"), notificationId));
        }
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) {
            nm.cancel(notificationId);
        }
    }

    static void cancelTaskReminder(Context c, String id) {
        if (id == null || id.isEmpty()) return;
        synchronized (LOCK) {
            JSONObject all = ledger(c);
            JSONObject row = all.optJSONObject(id);
            if (row != null) {
                cancel(c, id, row);
                try {
                    row.put("status", "cancelled");
                    row.put("at", 0);
                    all.put(id, row);
                    prefs(c).edit().putString(LEDGER_KEY, all.toString()).apply();
                } catch (JSONException ignored) {}
            }
        }
    }

    static void clear(Context c) {
        synchronized (LOCK) {
            JSONObject old = ledger(c);
            for (Iterator<String> i = old.keys(); i.hasNext(); ) {
                String id = i.next();
                JSONObject row = old.optJSONObject(id);
                if (row != null) cancel(c, id, row);
            }
            prefs(c).edit().remove(LEDGER_KEY).remove(LEGACY_KEY).apply();
        }
    }

    static void reconcile(Context c) {
        reconcile(c, false);
    }

    static void reconcile(Context c, boolean force) {
        synchronized (LOCK) {
            if (!AgendaData.prefs(c).getBoolean("sessionReady", false)
                || !AgendaData.options(c).getBoolean("remindersEnabled", false)) {
                clear(c);
                return;
            }

            JSONObject old = ledger(c);
            JSONObject next = new JSONObject();
            String owner = AgendaData.prefs(c).getString("dataUserId", "");
            JSONArray tasks = AgendaData.read(c);
            int nextId = prefs(c).getInt("nextId", 1000000);
            long now = System.currentTimeMillis();

            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task == null || task.optBoolean("completed")
                    || "done".equals(task.optString("status"))
                    || "wont_do".equals(task.optString("status"))) {
                    continue;
                }

                String id = task.optString("id");
                if (id.isEmpty()) continue;

                // Inspect reminder_plan first; fallback to legacy reminder_at
                JSONObject plan = task.optJSONObject("reminder_plan");
                String legacySource = task.optString("reminder_at");

                boolean hasPlan = plan != null && plan.optBoolean("enabled", true);
                if (!hasPlan && legacySource.isEmpty()) continue;

                try {
                    String triggerIso = hasPlan ? plan.optString("trigger_at", legacySource) : legacySource;
                    if (triggerIso.isEmpty()) continue;

                    String mode = hasPlan ? plan.optString("mode", "once") : "once";
                    int repeatIntervalMinutes = hasPlan ? plan.optInt("repeat_interval_minutes", 15) : 15;
                    if ("until_ack".equals(mode) && repeatIntervalMinutes < 15) {
                        repeatIntervalMinutes = 15; // 15m safe minimum guard
                    }
                    long intervalMs = repeatIntervalMinutes * 60 * 1000L;
                    int repeatCount = hasPlan ? plan.optInt("repeat_count", 3) : 1;
                    String importance = hasPlan ? plan.optString("importance", "normal") : "normal";
                    long originalAt = Instant.parse(triggerIso).toEpochMilli();
                    long maxWindowMs = (hasPlan ? plan.optLong("max_window_hours", 24) : 24) * 3600 * 1000L;

                    String sourceFingerprint = triggerIso + ":" + mode + ":" + repeatIntervalMinutes + ":" + repeatCount;

                    JSONObject previous = old.optJSONObject(id);
                    boolean same = previous != null
                        && owner.equals(previous.optString("owner"))
                        && sourceFingerprint.equals(previous.optString("source"));

                    long scheduledAt;
                    int notificationId;
                    int fireCount = 0;
                    String status = "pending";

                    if (same) {
                        scheduledAt = previous.optLong("at");
                        notificationId = previous.getInt("notificationId");
                        fireCount = previous.optInt("fireCount", 0);
                        status = previous.optString("status", "pending");
                    } else {
                        scheduledAt = originalAt;
                        notificationId = (previous != null && previous.has("notificationId"))
                            ? previous.getInt("notificationId")
                            : nextId++;
                    }

                    // If scheduled time already passed for an untouched event, do not fire retroactively
                    if (scheduledAt <= now && !same && !"snoozed".equals(status)) {
                        continue;
                    }

                    JSONObject row = new JSONObject()
                        .put("taskId", id)
                        .put("owner", owner)
                        .put("source", sourceFingerprint)
                        .put("title", task.optString("title"))
                        .put("mode", mode)
                        .put("importance", importance)
                        .put("originalAt", originalAt)
                        .put("at", scheduledAt)
                        .put("intervalMs", intervalMs)
                        .put("repeatCount", repeatCount)
                        .put("fireCount", fireCount)
                        .put("maxWindowMs", maxWindowMs)
                        .put("status", status)
                        .put("notificationId", notificationId)
                        .put("version", 1);

                    if (!same || force) {
                        if (previous != null) cancel(c, id, previous);
                        if (!"missed".equals(status) && !"acknowledged".equals(status) && scheduledAt > now) {
                            schedule(c, id, row);
                        }
                    }

                    next.put(id, row);
                } catch (Exception ignored) {}
            }

            // Cancel any old reminders that were completed or removed
            for (Iterator<String> it = old.keys(); it.hasNext(); ) {
                String id = it.next();
                JSONObject row = old.optJSONObject(id);
                if (!next.has(id) && row != null) {
                    cancel(c, id, row);
                }
            }

            prefs(c).edit().putString(LEDGER_KEY, next.toString()).putInt("nextId", nextId).apply();
        }
    }

    static void deliver(Context c, String id, String owner) {
        synchronized (LOCK) {
            if (!AgendaData.prefs(c).getBoolean("sessionReady", false)
                || !owner.equals(AgendaData.prefs(c).getString("dataUserId", ""))
                || !AgendaData.options(c).getBoolean("remindersEnabled", false)) {
                return;
            }

            JSONObject all = ledger(c);
            JSONObject row = all.optJSONObject(id);
            if (row == null || !owner.equals(row.optString("owner"))) return;

            // Check if task is already completed
            JSONArray tasks = AgendaData.read(c);
            boolean isCompleted = true;
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject t = tasks.optJSONObject(i);
                if (t != null && id.equals(t.optString("id"))) {
                    isCompleted = t.optBoolean("completed")
                        || "done".equals(t.optString("status"))
                        || "wont_do".equals(t.optString("status"));
                    break;
                }
            }
            if (isCompleted) {
                cancel(c, id, row);
                all.remove(id);
                prefs(c).edit().putString(LEDGER_KEY, all.toString()).apply();
                return;
            }

            long now = System.currentTimeMillis();
            int fireCount = row.optInt("fireCount", 0) + 1;
            String mode = row.optString("mode", "once");
            long originalAt = row.optLong("originalAt", now);
            long maxWindowMs = row.optLong("maxWindowMs", 24 * 3600 * 1000L);
            long intervalMs = row.optLong("intervalMs", 15 * 60 * 1000L);
            int repeatCount = row.optInt("repeatCount", 1);
            int notificationId = row.optInt("notificationId", Math.abs(id.hashCode()));

            try {
                row.put("fireCount", fireCount);

                // Compute subsequent trigger based on mode and safety guards
                boolean hasNext = false;
                long nextAt = 0;

                if ("until_ack".equals(mode)) {
                    if (now - originalAt < maxWindowMs) {
                        hasNext = true;
                        nextAt = now + intervalMs;
                        row.put("status", "firing");
                    } else {
                        // Safe guard: 24h cap reached -> mark as missed / needs attention
                        row.put("status", "missed");
                    }
                } else if ("count".equals(mode)) {
                    if (fireCount < repeatCount) {
                        hasNext = true;
                        nextAt = now + intervalMs;
                        row.put("status", "firing");
                    } else {
                        row.put("status", "missed");
                    }
                } else {
                    // "once" mode
                    row.put("status", "missed");
                }

                if (hasNext) {
                    row.put("at", nextAt);
                    schedule(c, id, row);
                } else {
                    row.put("at", 0);
                }

                all.put(id, row);
                prefs(c).edit().putString(LEDGER_KEY, all.toString()).apply();
            } catch (JSONException ignored) {}

            // Display Notification
            if (!TaskPanel.allowed(c)) return;
            NotificationManager manager = c.getSystemService(NotificationManager.class);
            if (manager == null) return;

            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "یادآورهای تسک",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.enableVibration(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
                manager.createNotificationChannel(channel);
            }

            String route = "task?taskId=" + Uri.encode(id) + "&owner=" + Uri.encode(owner);
            String title = "⏰ یادآور تسک";
            String taskTitle = row.optString("title", "تسک");

            String subtext = "";
            if ("until_ack".equals(mode)) {
                subtext = "تکرار تا پاسخ (مرحله " + fireCount + ")";
            } else if ("count".equals(mode)) {
                subtext = "مرحله " + fireCount + " از " + repeatCount;
            }

            Intent snooze10Intent = new Intent(c, ReminderReceiver.class)
                .setAction("snooze")
                .setData(Uri.parse("arshnaz://snooze/" + Uri.encode(owner) + "/" + Uri.encode(id)))
                .putExtra("taskId", id)
                .putExtra("owner", owner)
                .putExtra("snoozeMinutes", 10);
            PendingIntent snooze10Action = PendingIntent.getBroadcast(
                c,
                notificationId + 10,
                snooze10Intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Notification publicVersion = new androidx.core.app.NotificationCompat.Builder(c, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_tasks)
                .setContentTitle("یادآور ARSHNAZ")
                .setContentText("برای مشاهده تسک قفل را باز کنید")
                .build();

            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(c, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_tasks)
                .setContentTitle(title)
                .setContentText(taskTitle)
                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(taskTitle))
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL)
                .setAutoCancel(true)
                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PRIVATE)
                .setPublicVersion(publicVersion)
                .setContentIntent(AgendaWidgetProvider.activity(c, route, notificationId))
                .addAction(0, "۱۰ دقیقه تعویق", snooze10Action)
                .addAction(0, "انجام شد", AndroidActionsReceiver.taskPending(c, id, false, notificationId + 1))
                .addAction(0, "باز کردن تسک", AgendaWidgetProvider.activity(c, route, notificationId));

            if (!subtext.isEmpty()) {
                builder.setSubText(subtext);
            }

            try {
                manager.notify(notificationId, builder.build());
            } catch (SecurityException ignored) {}
        }
    }

    static void snooze(Context c, String id, String owner, int minutes) {
        synchronized (LOCK) {
            if (!AgendaData.prefs(c).getBoolean("sessionReady", false)
                || !owner.equals(AgendaData.prefs(c).getString("dataUserId", ""))
                || !AgendaData.options(c).getBoolean("remindersEnabled", false)) {
                return;
            }

            JSONObject all = ledger(c);
            JSONObject row = all.optJSONObject(id);
            if (row == null || !owner.equals(row.optString("owner"))) return;

            long snoozeAt = System.currentTimeMillis() + (minutes * 60 * 1000L);
            try {
                row.put("at", snoozeAt);
                row.put("snoozeUntil", snoozeAt);
                row.put("status", "snoozed");
                all.put(id, row);
                prefs(c).edit().putString(LEDGER_KEY, all.toString()).apply();

                // Cancel existing status-bar notification and schedule next alarm
                NotificationManager nm = c.getSystemService(NotificationManager.class);
                if (nm != null) {
                    nm.cancel(row.optInt("notificationId", Math.abs(id.hashCode())));
                }
                schedule(c, id, row);
            } catch (Exception ignored) {}
        }
    }
}
