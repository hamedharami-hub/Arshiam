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
    static PendingIntent taskPending(Context c, String taskId, boolean completed, int requestCode) {
        Intent intent = new Intent(c, AndroidActionsReceiver.class).setAction("toggleDirect")
            .putExtra("taskId", taskId == null ? "" : taskId)
            .putExtra("completed",completed)
            .setData(Uri.parse("arshnaz://action/toggle/" + Uri.encode(taskId == null ? "" : taskId) + "/" + (completed ? "1" : "0")));
        return PendingIntent.getBroadcast(c, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    @Override public void onReceive(Context c,Intent intent) {
        String action=intent.getAction();
        if(action==null) return;
        if ("toggleDirect".equals(action)) {
            String taskId = intent.getStringExtra("taskId");
            if (taskId == null || taskId.isEmpty()) return;
            boolean completed=intent.getBooleanExtra("completed",false);
            AgendaData.prefs(c).edit().putString("syncStatus", completed ? "Reopening task from widget…" : "Saving completion from widget…").apply();
            WidgetTaskActionWorker.enqueue(c, completed ? "reopen" : "complete", taskId, "", "", "");
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
