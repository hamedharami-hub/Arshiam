package life.arshnaz.app;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;
import android.widget.*;
import java.util.*;
import org.json.JSONObject;

public class AgendaListService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(),intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1));
    }
    static class Factory implements RemoteViewsFactory {
        final Context c; final int id; List<JSONObject> tasks=Collections.emptyList(); String owner="";
        Factory(Context c,int id) { this.c=c; this.id=id; }
        public void onCreate() { onDataSetChanged(); }
        public void onDataSetChanged() {
            SharedPreferences p=AgendaData.options(c);
            tasks=AgendaData.select(c,AgendaWidgetProvider.scope(c,id),AgendaWidgetProvider.secondaryScope(c,id),
                p.getBoolean("widget."+id+".done",false),p.getBoolean("widget."+id+".high",false));
            String sort=p.getString("widget."+id+".sort","time");
            boolean hierarchical=false; for(JSONObject task:tasks) if(task.optInt("_widgetDepth",0)>0) { hierarchical=true; break; }
            if(!hierarchical && "priority".equals(sort)) Collections.sort(tasks,(a,b)->Integer.compare(priorityRank(b),priorityRank(a)));
            else if(!hierarchical && "title".equals(sort)) Collections.sort(tasks,(a,b)->a.optString("title").compareToIgnoreCase(b.optString("title")));
            int limit=Math.max(1,Math.min(8,p.getInt("widget."+id+".limit",4)));
            if(tasks.size()>limit) tasks=new java.util.ArrayList<>(tasks.subList(0,limit));
            owner=AgendaData.prefs(c).getString("dataUserId","");
        }
        public void onDestroy() { tasks=Collections.emptyList(); }
        public int getCount() { return tasks.size(); }
        public RemoteViews getViewAt(int position) {
            if(position<0 || position>=tasks.size()) return null;
            if(!AgendaData.prefs(c).getBoolean("sessionReady",false) || !owner.equals(AgendaData.prefs(c).getString("dataUserId",""))) return null;
            JSONObject t=tasks.get(position);
            RemoteViews row=new RemoteViews(c.getPackageName(),R.layout.widget_task_row);
            boolean light=AgendaData.options(c).getBoolean("widget."+id+".light",false);
            row.setInt(R.id.row_root,"setBackgroundResource",light?R.drawable.widget_row_background_light:R.drawable.widget_row_background);
            row.setInt(R.id.row_done,"setBackgroundResource",light?R.drawable.widget_checkbox_background_light:R.drawable.widget_checkbox_background);
            row.setTextColor(R.id.row_title,android.graphics.Color.parseColor(light?"#172033":"#F1F5F9"));
            boolean completed=t.optBoolean("completed")||"done".equals(t.optString("status"));
            int depth=Math.max(0,Math.min(3,t.optInt("_widgetDepth",0)));
            row.setTextViewText(R.id.row_title,(depth>0?"↳ ":"")+t.optString("title"));
            row.setTextViewText(R.id.row_done,completed?"☑":"☐");
            row.setTextColor(R.id.row_done,android.graphics.Color.parseColor(completed?"#A78BFA":"#94A3B8"));
            row.setViewPadding(R.id.row_root,8+depth*14,5,6,5);
            boolean priority="high".equals(t.optString("priority"))||"urgent".equals(t.optString("priority"));
            row.setTextViewText(R.id.row_meta, AgendaData.dueLabel(t.optString("due_date")) + (priority?" · High priority":""));
            row.setTextViewText(R.id.row_priority,priority?"●":"○");
            row.setTextColor(R.id.row_priority,android.graphics.Color.parseColor(priority?"#FBBF24":"#64748B"));
            String size=AgendaData.options(c).getString("widget."+id+".textSize",AgendaData.options(c).getBoolean("widget."+id+".large",false)?"large":"medium");
            row.setTextViewTextSize(R.id.row_title,android.util.TypedValue.COMPLEX_UNIT_SP,"large".equals(size)?18:"small".equals(size)?12:15);
            String taskId=Uri.encode(t.optString("id"));
            row.setOnClickFillInIntent(R.id.row_root,new Intent().setData(Uri.parse("arshnaz://widget-action/open?taskId="+taskId+"&owner="+Uri.encode(owner))));
            row.setOnClickFillInIntent(R.id.row_done,new Intent().setData(Uri.parse("arshnaz://widget-action/toggle?taskId="+taskId+"&completed="+(completed?"1":"0")+"&owner="+Uri.encode(owner))));
            row.setOnClickFillInIntent(R.id.row_edit,new Intent().setData(Uri.parse("arshnaz://widget-action/edit?taskId="+taskId+"&owner="+Uri.encode(owner))));
            return row;
        }
        public RemoteViews getLoadingView() { return null; }
        public int getViewTypeCount() { return 1; }
        public long getItemId(int position) { return position; }
        public boolean hasStableIds() { return false; }
        private int priorityRank(JSONObject task) { String value=task.optString("priority"); return "urgent".equals(value)?3:"high".equals(value)?2:"medium".equals(value)?1:0; }
    }
}
