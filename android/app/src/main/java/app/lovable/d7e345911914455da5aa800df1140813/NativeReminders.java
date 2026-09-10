package app.lovable.d7e345911914455da5aa800df1140813;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import org.json.*;
import java.time.Instant;
import java.util.*;

/** OS-owned alarms survive a closed WebView. No network or writes to tasks in alarm callbacks. */
final class NativeReminders {
    static final Object LOCK=new Object();
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("arshnaz_native_reminders",0);}
    static JSONObject ledger(Context c){try{return new JSONObject(prefs(c).getString("alarms","{}"));}catch(Exception e){return new JSONObject();}}
    static int count(Context c){
        int count=0; JSONObject rows=ledger(c);
        for(Iterator<String> i=rows.keys();i.hasNext();) {
            JSONObject row=rows.optJSONObject(i.next());
            if(row!=null&&row.optLong("at")>System.currentTimeMillis())count++;
        }
        return count;
    }
    static PendingIntent alarm(Context c,String id,String owner) {
        return PendingIntent.getBroadcast(c,0,new Intent(c,ReminderReceiver.class).setAction("fire")
            .setData(Uri.parse("arshnaz://reminder/"+Uri.encode(owner)+"/"+Uri.encode(id))).putExtra("taskId",id).putExtra("owner",owner),
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context c,String id,JSONObject row) {
        long at=row.optLong("at");
        if(at<=System.currentTimeMillis())return;
        AlarmManager m=c.getSystemService(AlarmManager.class);
        PendingIntent p=alarm(c,id,row.optString("owner"));
        try {
            if(Build.VERSION.SDK_INT<31||m.canScheduleExactAlarms())m.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
            else m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
        } catch(SecurityException e){m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);}
    }
    static void cancel(Context c,String id,JSONObject row) {
        c.getSystemService(AlarmManager.class).cancel(alarm(c,id,row.optString("owner")));
        c.getSystemService(NotificationManager.class).cancel(row.optInt("notificationId"));
    }
    static void clear(Context c) {
        synchronized(LOCK){
            JSONObject old=ledger(c);
            for(Iterator<String> i=old.keys();i.hasNext();){String id=i.next();JSONObject row=old.optJSONObject(id);if(row!=null)cancel(c,id,row);}
            prefs(c).edit().remove("alarms").commit();
        }
    }
    static void reconcile(Context c) { reconcile(c,false); }
    static void reconcile(Context c,boolean force) {
        synchronized(LOCK) {
            if(!AgendaData.prefs(c).getBoolean("sessionReady",false)||!AgendaData.options(c).getBoolean("remindersEnabled",false)) {clear(c);return;}
            JSONObject old=ledger(c), next=new JSONObject();
            String owner=AgendaData.prefs(c).getString("dataUserId","");
            JSONArray tasks=AgendaData.read(c);
            int nextId=prefs(c).getInt("nextId",1000000);
            for(int i=0;i<tasks.length();i++){
                JSONObject task=tasks.optJSONObject(i);
                if(task==null||task.optBoolean("completed")||"done".equals(task.optString("status"))||"wont_do".equals(task.optString("status")))continue;
                String id=task.optString("id"),source=task.optString("reminder_at");
                if(id.isEmpty()||source.isEmpty())continue;
                try {
                    JSONObject previous=old.optJSONObject(id);
                    boolean same=previous!=null&&owner.equals(previous.optString("owner"))&&source.equals(previous.optString("source"));
                    long at=same?previous.optLong("at"):Instant.parse(source).toEpochMilli();
                    if(at<=System.currentTimeMillis()&&!same)continue;
                    JSONObject row=new JSONObject().put("owner",owner).put("source",source).put("at",at)
                        .put("title",task.optString("title")).put("notificationId",same?previous.getInt("notificationId"):nextId++);
                    if(!same || force) {if(previous!=null)cancel(c,id,previous);schedule(c,id,row);}
                    next.put(id,row);
                } catch(Exception ignored){}
            }
            for(Iterator<String> i=old.keys();i.hasNext();){String id=i.next();JSONObject row=old.optJSONObject(id);if(!next.has(id)&&row!=null)cancel(c,id,row);}
            prefs(c).edit().putString("alarms",next.toString()).putInt("nextId",nextId).commit();
        }
    }
    static void deliver(Context c,String id,String owner,boolean snooze) {
        synchronized(LOCK) {
            if(!AgendaData.prefs(c).getBoolean("sessionReady",false)||!owner.equals(AgendaData.prefs(c).getString("dataUserId",""))
                ||!AgendaData.options(c).getBoolean("remindersEnabled",false))return;
            JSONObject all=ledger(c),row=all.optJSONObject(id);
            if(row==null||!owner.equals(row.optString("owner")))return;
            if(snooze) {
                try {row.put("at",System.currentTimeMillis()+600000);all.put(id,row);prefs(c).edit().putString("alarms",all.toString()).commit();schedule(c,id,row);
                    c.getSystemService(NotificationManager.class).cancel(row.getInt("notificationId"));}catch(Exception ignored){}
                return;
            }
            if(!TaskPanel.allowed(c))return;
            NotificationManager manager=c.getSystemService(NotificationManager.class);
            if(Build.VERSION.SDK_INT>=26){
                NotificationChannel channel=new NotificationChannel("arshnaz_reminders_v2","یادآورهای تسک",NotificationManager.IMPORTANCE_HIGH);
                channel.enableVibration(true);channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);manager.createNotificationChannel(channel);
            }
            String route="task?taskId="+Uri.encode(id)+"&owner="+Uri.encode(owner);
            PendingIntent snoozeAction=PendingIntent.getBroadcast(c,0,new Intent(c,ReminderReceiver.class).setAction("snooze")
                .setData(Uri.parse("arshnaz://snooze/"+Uri.encode(owner)+"/"+Uri.encode(id))).putExtra("taskId",id).putExtra("owner",owner),
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification publicVersion=new androidx.core.app.NotificationCompat.Builder(c,"arshnaz_reminders_v2")
                .setSmallIcon(R.drawable.ic_stat_tasks).setContentTitle("یادآور ARSHNAZ").setContentText("برای دیدن تسک قفل را باز کنید").build();
            Notification notification=new androidx.core.app.NotificationCompat.Builder(c,"arshnaz_reminders_v2")
                .setSmallIcon(R.drawable.ic_stat_tasks).setContentTitle("⏰ یادآور تسک").setContentText(row.optString("title"))
                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(row.optString("title")))
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL)
                .setAutoCancel(true).setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publicVersion)
                .setContentIntent(AgendaWidgetProvider.activity(c,route,row.optInt("notificationId")))
                .addAction(0,"۱۰ دقیقه بعد",snoozeAction)
                .addAction(0,"باز کردن تسک",AgendaWidgetProvider.activity(c,route,row.optInt("notificationId"))).build();
            try{manager.notify(row.optInt("notificationId"),notification);}catch(SecurityException ignored){}
        }
    }
}
