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
            tasks=AgendaData.select(c,AgendaWidgetProvider.scope(c,id),p.getBoolean("widget."+id+".done",false),p.getBoolean("widget."+id+".high",false));
            String sort=p.getString("widget."+id+".sort","time");
            if("priority".equals(sort)) Collections.sort(tasks,(a,b)->Integer.compare(priorityRank(b),priorityRank(a)));
            else if("title".equals(sort)) Collections.sort(tasks,(a,b)->a.optString("title").compareToIgnoreCase(b.optString("title")));
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
            row.setTextColor(R.id.row_title,android.graphics.Color.parseColor(light?"#172033":"#F1F5F9"));
            row.setTextViewText(R.id.row_title,(t.optBoolean("completed")||"done".equals(t.optString("status"))?"✓ ":"")+t.optString("title"));
            boolean priority="high".equals(t.optString("priority"))||"urgent".equals(t.optString("priority"));
            row.setTextViewText(R.id.row_meta, AgendaData.dueLabel(t.optString("due_date")) + (priority?" · High priority":""));
            row.setTextViewText(R.id.row_priority,priority?"●":"○");
            row.setTextColor(R.id.row_priority,android.graphics.Color.parseColor(priority?"#FBBF24":"#64748B"));
            String size=AgendaData.options(c).getString("widget."+id+".textSize",AgendaData.options(c).getBoolean("widget."+id+".large",false)?"large":"medium");
            row.setTextViewTextSize(R.id.row_title,android.util.TypedValue.COMPLEX_UNIT_SP,"large".equals(size)?18:"small".equals(size)?12:15);
            row.setOnClickFillInIntent(R.id.row_root,new Intent().setData(Uri.parse("arshnaz://task?taskId="+Uri.encode(t.optString("id"))+"&owner="+Uri.encode(owner))));
            row.setOnClickFillInIntent(R.id.row_done,new Intent().setData(Uri.parse("arshnaz://complete-task?taskId="+Uri.encode(t.optString("id"))+"&owner="+Uri.encode(owner))));
            return row;
        }
        public RemoteViews getLoadingView() { return null; }
        public int getViewTypeCount() { return 1; }
        public long getItemId(int position) { return position; }
        public boolean hasStableIds() { return false; }
        private int priorityRank(JSONObject task) { String value=task.optString("priority"); return "urgent".equals(value)?3:"high".equals(value)?2:"medium".equals(value)?1:0; }
    }
}
