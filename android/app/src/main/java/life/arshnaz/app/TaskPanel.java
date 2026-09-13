package life.arshnaz.app;
import android.Manifest;
import android.app.*;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import java.util.List;
import org.json.JSONObject;

final class TaskPanel {
    static final int ID=880001;
    static boolean allowed(Context c) {
        return (Build.VERSION.SDK_INT<33 || ContextCompat.checkSelfPermission(c,Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
            && NotificationManagerCompat.from(c).areNotificationsEnabled();
    }
    static void channel(Context c) {
        if(Build.VERSION.SDK_INT>=26) {
            NotificationChannel ch=new NotificationChannel("arshnaz_task_panel","پنل بی‌صدای تسک‌ها",NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("مرور امروز و فردا از پنل اعلان"); ch.setSound(null,null); ch.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }
    static Notification build(Context c) {
        String scope=AgendaData.options(c).getString("panelScope","today");
        List<JSONObject> tasks=AgendaData.select(c,scope,false,false);
        int index=Math.floorMod(AgendaData.options(c).getInt("panelIndex",0),Math.max(1,tasks.size()));
        JSONObject selected=tasks.isEmpty()?null:tasks.get(index);
        String title=selected==null?"تسکی برای "+AgendaData.label(scope)+" نیست":selected.optString("title");
        String owner=AgendaData.prefs(c).getString("dataUserId","");
        String route=selected==null?scope:"task?taskId="+android.net.Uri.encode(selected.optString("id"))+"&owner="+android.net.Uri.encode(owner);
        String subtitle=AgendaData.label(scope)+" · "+(tasks.isEmpty()?"0":(index+1)+" / "+tasks.size());
        String status=AgendaData.prefs(c).getString("syncStatus","برای تازه‌سازی برنامه را باز کنید");
        Notification publicVersion=new NotificationCompat.Builder(c,"arshnaz_task_panel")
            .setSmallIcon(R.drawable.ic_stat_tasks).setContentTitle("ARSHNAZ").setContentText("برای دیدن تسک‌ها قفل را باز کنید").build();
        NotificationCompat.Builder builder = new NotificationCompat.Builder(c,"arshnaz_task_panel").setSmallIcon(R.drawable.ic_stat_tasks)
            .setContentTitle(subtitle).setContentText(title).setStyle(new NotificationCompat.BigTextStyle().bigText(title+"\n"+status))
            .setContentIntent(AgendaWidgetProvider.activity(c,route,880010))
            .setOngoing(true).setOnlyAlertOnce(true).setSilent(true).setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publicVersion)
            .addAction(0,"قبلی",AndroidActionsReceiver.pending(c,"panelPrev",0))
            .addAction(0,"بعدی",AndroidActionsReceiver.pending(c,"panelNext",0))
            .addAction(0,"امروز / فردا",AndroidActionsReceiver.pending(c,"panelScope",0));
        if (selected != null) builder.addAction(0,"انجام شد",
            AndroidActionsReceiver.taskPending(c,selected.optString("id"),false,880011));
        return builder.build();
    }
    static void update(Context c) {
        NotificationManagerCompat manager=NotificationManagerCompat.from(c);
        if(!AgendaData.options(c).getBoolean("panelEnabled",false) || !AgendaData.prefs(c).getBoolean("sessionReady",false)) {
            manager.cancel(ID); return;
        }
        if(!allowed(c)) return;
        channel(c);
        try { manager.notify(ID,build(c)); } catch(SecurityException ignored) {}
    }
}
