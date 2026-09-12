package life.arshnaz.app;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;

public class AndroidActionsReceiver extends BroadcastReceiver {
    static PendingIntent pending(Context c,String action,int id) {
        return PendingIntent.getBroadcast(c,0,new Intent(c,AndroidActionsReceiver.class)
            .setAction(action).putExtra("widgetId",id).setData(Uri.parse("arshnaz://action/"+action+"/"+id)),
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static PendingIntent taskPending(Context c, String taskId, int requestCode) {
        Intent intent = new Intent(c, AndroidActionsReceiver.class).setAction("completeDirect")
            .putExtra("taskId", taskId == null ? "" : taskId)
            .setData(Uri.parse("arshnaz://action/complete/" + Uri.encode(taskId == null ? "" : taskId)));
        return PendingIntent.getBroadcast(c, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    @Override public void onReceive(Context c,Intent intent) {
        String action=intent.getAction();
        if(action==null) return;
        if ("widgetTask".equals(action)) {
            Uri data = intent.getData();
            if (data == null || !"widget-action".equals(data.getHost())) return;
            String owner = data.getQueryParameter("owner");
            String activeOwner = AgendaData.prefs(c).getString("dataUserId", "");
            if (!owner.isEmpty() && !owner.equals(activeOwner)) return;
            String taskId = data.getQueryParameter("taskId");
            String operation = data.getPathSegments().isEmpty() ? "" : data.getPathSegments().get(0);
            if ("open".equals(operation) && taskId != null) {
                Intent open = AgendaWidgetProvider.appIntent(c, "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(activeOwner));
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(open);
            } else if ("complete".equals(operation) && taskId != null) {
                AgendaData.prefs(c).edit().putString("syncStatus", "Saving completion from widget…").apply();
                WidgetTaskActionWorker.enqueue(c, "complete", taskId, "", "", "");
                AgendaWidgetProvider.redraw(c);
            } else if ("edit".equals(operation) && taskId != null) {
                Intent edit = new Intent(c, WidgetTaskActionActivity.class).putExtra("taskId", taskId)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(edit);
            }
            return;
        }
        if ("completeDirect".equals(action)) {
            String taskId = intent.getStringExtra("taskId");
            if (taskId == null || taskId.isEmpty()) return;
            AgendaData.prefs(c).edit().putString("syncStatus", "Saving completion from widget…").apply();
            WidgetTaskActionWorker.enqueue(c, "complete", taskId, "", "", "");
            AgendaWidgetProvider.redraw(c);
            return;
        }
        if(action.startsWith("panel")) {
            if(!AgendaData.options(c).getBoolean("panelEnabled",false) || !AgendaData.prefs(c).getBoolean("sessionReady",false)) return;
            SharedPreferences p=AgendaData.options(c);
            if(action.equals("panelScope")) p.edit().putString("panelScope",p.getString("panelScope","today").equals("today")?"tomorrow":"today").putInt("panelIndex",0).apply();
            else if(action.equals("panelNext") || action.equals("panelPrev")) p.edit().putInt("panelIndex",p.getInt("panelIndex",0)+(action.equals("panelNext")?1:-1)).apply();
            TaskPanel.update(c); return;
        }
        int id=intent.getIntExtra("widgetId",-1);
        if(action.equals("scope") && AppWidgetManager.getInstance(c).getAppWidgetInfo(id)!=null) {
            String next=AgendaWidgetProvider.nextScope(AgendaWidgetProvider.scope(c,id));
            AgendaData.options(c).edit().putString("widget."+id+".scope",next).apply();
            AgendaWidgetProvider.update(c,AppWidgetManager.getInstance(c),id);
        } else if(action.equals("refresh")) {
            if(AgendaData.prefs(c).getBoolean("sessionReady",false)) {
                AgendaData.prefs(c).edit().putString("syncStatus","در انتظار دریافت آنلاین…").apply();
                ArshnazWidgetWorker.enqueue(c);
            }
            AgendaWidgetProvider.redraw(c);
        }
    }
}
