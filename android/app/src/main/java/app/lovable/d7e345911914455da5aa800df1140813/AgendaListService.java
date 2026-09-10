package app.lovable.d7e345911914455da5aa800df1140813;
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
            row.setTextViewText(R.id.row_meta, AgendaData.dueLabel(t.optString("due_date")) + ("high".equals(t.optString("priority"))||"urgent".equals(t.optString("priority"))?" · اولویت بالا":""));
            row.setTextViewTextSize(R.id.row_title,android.util.TypedValue.COMPLEX_UNIT_SP,AgendaData.options(c).getBoolean("widget."+id+".large",false)?18:14);
            row.setOnClickFillInIntent(R.id.row_root,new Intent().setData(Uri.parse("arshnaz://task?taskId="+Uri.encode(t.optString("id"))+"&owner="+Uri.encode(owner))));
            return row;
        }
        public RemoteViews getLoadingView() { return null; }
        public int getViewTypeCount() { return 1; }
        public long getItemId(int position) { return position; }
        public boolean hasStableIds() { return false; }
    }
}
