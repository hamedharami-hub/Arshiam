package life.arshnaz.app;

import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.util.List;
import org.json.JSONObject;

public class AgendaWidgetProvider extends AppWidgetProvider {
    static final Class<?>[] TYPES = {AgendaWidgetProvider.class, TomorrowWidgetProvider.class, WeekWidgetProvider.class, CompactWidgetProvider.class, FocusWidgetProvider.class};
    static String defaultScope(Class<?> type) {
        return type == TomorrowWidgetProvider.class ? "tomorrow" : type == WeekWidgetProvider.class ? "next7"
            : type == FocusWidgetProvider.class ? "high" : "today";
    }
    static String scope(Context c, int id) {
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(c).getAppWidgetInfo(id);
        String fallback = info != null && info.provider.getClassName().endsWith("TomorrowWidgetProvider") ? "tomorrow"
            : info != null && info.provider.getClassName().endsWith("WeekWidgetProvider") ? "next7"
            : info != null && info.provider.getClassName().endsWith("FocusWidgetProvider") ? "high" : "today";
        return AgendaData.options(c).getString("widget."+id+".scope", fallback);
    }
    static String secondaryScope(Context c,int id) {
        return AgendaData.options(c).getString("widget."+id+".secondaryScope","none");
    }
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) update(c, m, id);
        if (AgendaData.prefs(c).getBoolean("sessionReady", false)) ArshnazWidgetWorker.enqueue(c);
    }
    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) { update(c,m,id); }
    @Override public void onDeleted(Context c, int[] ids) {
        for (int id : ids) {
            SharedPreferences.Editor edit = AgendaData.options(c).edit();
            for (String key : new String[]{"scope","secondaryScope","light","done","high","large","textSize","sort","limit"}) edit.remove("widget."+id+"."+key);
            edit.apply();
        }
    }
    static RemoteViews views(Context c, int id) {
        SharedPreferences p = AgendaData.options(c);
        String prefix = "widget."+id+".", scope = scope(c,id), secondary = secondaryScope(c,id);
        boolean light = p.getBoolean(prefix+"light", false);
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(c).getAppWidgetInfo(id);
        boolean compact = info != null && info.provider.getClassName().endsWith("CompactWidgetProvider");
        RemoteViews v = new RemoteViews(c.getPackageName(), compact ? R.layout.widget_compact : R.layout.widget_agenda);
        int fg = Color.parseColor(light ? "#172033" : "#F1F5F9");
        v.setInt(R.id.agenda_root,"setBackgroundResource",light ? R.drawable.widget_background_light : R.drawable.widget_background);
        v.setTextColor(R.id.agenda_title, fg);
        boolean showDone = p.getBoolean(prefix+"done",false), highOnly = p.getBoolean(prefix+"high",false);
        List<JSONObject> tasks = AgendaData.select(c,scope,secondary,showDone,highOnly,p.getString(prefix+"sort","time"));
        int activeCount = AgendaData.select(c,scope,secondary,false,highOnly).size();
        int totalCount = AgendaData.select(c,scope,secondary,true,highOnly).size();
        int shownCount = Math.min(tasks.size(), AgendaListService.Factory.configuredLimit(p,id));
        String title=AgendaData.label(scope)+("none".equals(secondary)?"":" + "+AgendaData.label(secondary));
        v.setTextViewText(R.id.agenda_title,title);
        v.setTextViewText(R.id.agenda_count, activeCount + " active");
        v.setTextViewText(R.id.agenda_subtitle, shownCount + " of " + tasks.size() + " shown · " + Math.max(0,totalCount-activeCount) + " completed");
        String status = !AgendaData.prefs(c).getBoolean("sessionReady",false) ? "Open ARSHNAZ to show your tasks"
            : AgendaData.prefs(c).getString("syncStatus","Up to date");
        long updated = AgendaData.prefs(c).getLong("updatedAt",0);
        if (updated > 0) status += " · " + new java.text.SimpleDateFormat("MM/dd HH:mm",new java.util.Locale("fa")).format(new java.util.Date(updated));
        v.setTextViewText(R.id.agenda_status,"Last sync · " + status);
        v.setTextColor(R.id.agenda_status,fg);
        if (compact) {
            JSONObject primary = tasks.isEmpty() ? null : tasks.get(0);
            if (primary == null) {
                v.setTextViewText(R.id.agenda_summary,"No tasks in this view\nTap here to add one");
                v.setOnClickPendingIntent(R.id.agenda_summary,activity(c,"new-task",72000+id));
                v.setViewVisibility(R.id.agenda_compact_done,View.INVISIBLE);
            } else {
                boolean completed = primary.optBoolean("completed") || "done".equals(primary.optString("status"));
                String summary = primary.optString("title","Untitled task");
                if (tasks.size() > 1) summary += "\n+ "+(tasks.size()-1)+" more tasks";
                v.setTextViewText(R.id.agenda_summary,summary);
                v.setTextViewText(R.id.agenda_compact_done,completed ? "☑" : "☐");
                v.setTextColor(R.id.agenda_compact_done,Color.parseColor(completed ? "#A78BFA" : "#C4B5FD"));
                v.setViewVisibility(R.id.agenda_compact_done,View.VISIBLE);
                v.setOnClickPendingIntent(R.id.agenda_summary,taskOpen(c,primary.optString("id"),72000+id));
                v.setOnClickPendingIntent(R.id.agenda_compact_done,AndroidActionsReceiver.taskPending(c,primary.optString("id"),completed,72010+id));
            }
            v.setTextColor(R.id.agenda_summary,fg);
        } else {
            Intent service = new Intent(c,AgendaListService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
                .setData(Uri.parse("arshnaz://widget-list/"+id));
            v.setRemoteAdapter(R.id.agenda_list, service);
            v.setEmptyView(R.id.agenda_list,R.id.agenda_empty);
            v.setTextColor(R.id.agenda_empty,fg);
            Intent template = new Intent(c,WidgetRouterActivity.class).setAction(Intent.ACTION_VIEW);
            v.setPendingIntentTemplate(R.id.agenda_list,PendingIntent.getActivity(c,50000+id,template,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0)));
        }
        v.setOnClickPendingIntent(R.id.agenda_title,activity(c,AgendaData.route(scope),70000+id));
        v.setOnClickPendingIntent(R.id.agenda_add,activity(c,"new-task",71000+id));
        Intent config = new Intent(c,WidgetConfigureActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
            .setData(Uri.parse("arshnaz://configure/"+id));
        v.setOnClickPendingIntent(R.id.agenda_settings,PendingIntent.getActivity(c,73000+id,config,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        v.setOnClickPendingIntent(R.id.agenda_refresh,AndroidActionsReceiver.pending(c,"refresh",id));
        v.setOnClickPendingIntent(R.id.agenda_scope,AndroidActionsReceiver.pending(c,"scope",id));
        return v;
    }
    static String nextScope(String current) {
        String[] scopes = {"today","tomorrow","next7","overdue","undated","all","high"};
        for (int i=0;i<scopes.length;i++) if (scopes[i].equals(current)) return scopes[(i+1)%scopes.length];
        return scopes[0];
    }
    static PendingIntent activity(Context c,String route,int code) {
        return PendingIntent.getActivity(c,code,appIntent(c,route),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static PendingIntent taskOpen(Context c,String taskId,int code) {
        String owner=AgendaData.prefs(c).getString("dataUserId","");
        Intent intent=new Intent(c,WidgetRouterActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("arshnaz://widget-action/open?taskId="+Uri.encode(taskId)+"&owner="+Uri.encode(owner)));
        return PendingIntent.getActivity(c,code,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static Intent appIntent(Context c, String route) {
        return new Intent(c,MainActivity.class).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("arshnaz://"+route)).putExtra("arshnaz_route",route)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }
    static PendingIntent quickCreate(Context c, int code) {
        return quickCreate(c,code,"",false,"");
    }
    static PendingIntent quickCreate(Context c, int code, String prefillTitle, boolean prefillToday, String source) {
        Intent intent = new Intent(c, WidgetTaskActionActivity.class).putExtra("create", true)
            .putExtra("prefillTitle",prefillTitle).putExtra("prefillToday",prefillToday).putExtra("quickSource",source)
            .setData(Uri.parse("arshnaz://widget-action/create/" + code));
        return PendingIntent.getActivity(c, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void update(Context c,AppWidgetManager m,int id) { m.updateAppWidget(id,views(c,id)); m.notifyAppWidgetViewDataChanged(id,R.id.agenda_list); }
    static void redraw(Context c) {
        AppWidgetManager m=AppWidgetManager.getInstance(c);
        for (Class<?> type:TYPES) for(int id:m.getAppWidgetIds(new ComponentName(c,type))) update(c,m,id);
        TaskPanel.update(c);
    }
}
