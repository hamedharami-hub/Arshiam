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
            String sort=p.getString("widget."+id+".sort","time");
            tasks=AgendaData.select(c,AgendaWidgetProvider.scope(c,id),AgendaWidgetProvider.secondaryScope(c,id),
                p.getBoolean("widget."+id+".done",false),p.getBoolean("widget."+id+".high",false),sort,
                p.getString("widget."+id+".thenSort","none"),p.getString("widget."+id+".matchMode","any"));
            tasks=visibleHierarchy(tasks,p,id);
            int limit=configuredLimit(p,id);
            // Never cut a parent's visible children off at the configured row count.
            if(tasks.size()>limit) {
                int end=limit;
                while(end<tasks.size() && tasks.get(end).optInt("_widgetDepth",0)>0) end++;
                tasks=new java.util.ArrayList<>(tasks.subList(0,end));
            }
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
            row.setInt(R.id.row_done,"setBackgroundResource",light?R.drawable.widget_checkbox_background_light:R.drawable.widget_checkbox_background);
            boolean completed=t.optBoolean("completed")||"done".equals(t.optString("status"));
            int depth=Math.max(0,Math.min(3,t.optInt("_widgetDepth",0)));
            row.setInt(R.id.row_root,"setBackgroundResource",depth>0
                ? (light?R.drawable.widget_subtask_background_light:R.drawable.widget_subtask_background)
                : (light?R.drawable.widget_row_background_light:R.drawable.widget_row_background));
            row.setTextColor(R.id.row_title,android.graphics.Color.parseColor(depth>0
                ? (light?"#4338A6":"#DDD6FE") : (light?"#172033":"#F1F5F9")));
            boolean hasChildren=hasChildren(c,t.optString("id"));
            boolean collapsed=AgendaData.options(c).getBoolean("widget."+id+".collapsed."+t.optString("id"),false);
            row.setTextViewText(R.id.row_title,t.optString("title"));
            row.setTextViewText(R.id.row_expand,hasChildren?(collapsed?"›":"⌄"):" ");
            row.setViewVisibility(R.id.row_expand,hasChildren?android.view.View.VISIBLE:android.view.View.GONE);
            row.setTextViewText(R.id.row_meta,(depth>0?"↳ SUBTASK · ":hasChildren?"TASK GROUP · ":"TASK · ")+AgendaData.dueLabel(t.optString("due_date")));
            row.setTextViewText(R.id.row_done,completed?"☑":"☐");
            row.setTextColor(R.id.row_done,android.graphics.Color.parseColor(completed?"#A78BFA":"#94A3B8"));
            row.setViewPadding(R.id.row_root,8+depth*20,5,8,5);
            boolean priority="high".equals(t.optString("priority"))||"urgent".equals(t.optString("priority"));
            if(priority) row.setTextViewText(R.id.row_meta,(depth>0?"↳ SUBTASK · ":hasChildren?"TASK GROUP · ":"TASK · ")+AgendaData.dueLabel(t.optString("due_date"))+" · High priority");
            row.setTextViewText(R.id.row_priority,priority?"●":"○");
            row.setTextColor(R.id.row_priority,android.graphics.Color.parseColor(priority?"#FBBF24":"#64748B"));
            String size=AgendaData.options(c).getString("widget."+id+".textSize",AgendaData.options(c).getBoolean("widget."+id+".large",false)?"large":"medium");
            row.setTextViewTextSize(R.id.row_title,android.util.TypedValue.COMPLEX_UNIT_SP,"large".equals(size)?18:"small".equals(size)?12:15);
            String taskId=Uri.encode(t.optString("id"));
            // A parent row click can also fire when a child control is tapped on
            // some launchers. Only the title opens the task; the arrow and checkbox
            // must remain independent actions.
            row.setOnClickFillInIntent(R.id.row_content,new Intent().setData(Uri.parse("arshnaz://widget-action/open?taskId="+taskId+"&owner="+Uri.encode(owner))));
            row.setOnClickFillInIntent(R.id.row_done,new Intent().setData(Uri.parse("arshnaz://widget-action/toggle?taskId="+taskId+"&completed="+(completed?"1":"0")+"&owner="+Uri.encode(owner))));
            if(hasChildren) row.setOnClickFillInIntent(R.id.row_expand,new Intent().setData(Uri.parse("arshnaz://widget-action/collapse?taskId="+taskId+"&widgetId="+id+"&owner="+Uri.encode(owner))));
            // Android launchers do not consistently deliver long-presses for RemoteViews.
            // The visible overflow control is the reliable equivalent and opens a menu.
            row.setOnClickFillInIntent(R.id.row_edit,new Intent().setData(Uri.parse("arshnaz://widget-action/menu?taskId="+taskId+"&owner="+Uri.encode(owner))));
            return row;
        }
        public RemoteViews getLoadingView() { return null; }
        public int getViewTypeCount() { return 1; }
        public long getItemId(int position) { return position; }
        public boolean hasStableIds() { return false; }
        static boolean hasChildren(Context c,String parentId) {
            org.json.JSONArray rows=AgendaData.read(c);
            for(int i=0;i<rows.length();i++) {
                JSONObject row=rows.optJSONObject(i);
                if(row!=null && parentId.equals(row.optString("parent_id"))) return true;
            }
            return false;
        }
        static List<JSONObject> visibleHierarchy(List<JSONObject> rows,SharedPreferences options,int widgetId) {
            List<JSONObject> shown=new ArrayList<>();
            int hiddenBelow=-1;
            for(JSONObject task:rows) {
                int depth=task.optInt("_widgetDepth",0);
                if(hiddenBelow>=0) {
                    if(depth>hiddenBelow) continue;
                    hiddenBelow=-1;
                }
                shown.add(task);
                if(options.getBoolean("widget."+widgetId+".collapsed."+task.optString("id"),false)) hiddenBelow=depth;
            }
            return shown;
        }
        static int configuredLimit(SharedPreferences options,int widgetId) {
            // ListView can scroll. "All available tasks" is represented by a
            // bounded high limit so a malformed or huge snapshot cannot freeze a launcher.
            return normalizeLimit(options.getInt("widget."+widgetId+".limit",4));
        }
        static int normalizeLimit(int requested) { return Math.max(1,Math.min(100,requested)); }
    }
}
