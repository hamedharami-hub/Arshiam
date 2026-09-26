package life.arshnaz.app;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;
import org.json.JSONObject;

public class AndroidActionsReceiver extends BroadcastReceiver {
    static PendingIntent pending(Context c,String action,int id) {
        return PendingIntent.getBroadcast(c,0,new Intent(c,AndroidActionsReceiver.class)
            .setAction(action).putExtra("widgetId",id).setData(Uri.parse("arshnaz://action/"+action+"/"+id)),
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static PendingIntent taskPending(Context c, String taskId, boolean completed, int requestCode) {
        boolean targetCompleted = !completed;
        String activeOwner = AgendaData.prefs(c).getString("dataUserId", "");
        Intent intent = new Intent(c, AndroidActionsReceiver.class).setAction("toggleDirect")
            .putExtra("taskId", taskId == null ? "" : taskId)
            .putExtra("targetCompleted", targetCompleted)
            .putExtra("completed", completed)
            .putExtra("owner", activeOwner)
            .setData(Uri.parse("arshnaz://widget-action/toggle?taskId=" + Uri.encode(taskId == null ? "" : taskId)
                + "&targetCompleted=" + (targetCompleted ? "1" : "0")
                + "&completed=" + (completed ? "1" : "0")
                + "&owner=" + Uri.encode(activeOwner)));
        return PendingIntent.getBroadcast(c, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    @Override public void onReceive(Context c,Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && "widget-action".equals(data.getHost())) {
            String owner = data.getQueryParameter("owner");
            String activeOwner = AgendaData.prefs(c).getString("dataUserId", "");
            if (owner != null && !owner.isEmpty() && !owner.equals(activeOwner)) return;
            String operation = data.getPathSegments().isEmpty() ? "" : data.getPathSegments().get(0);
            String taskId = data.getQueryParameter("taskId");
            if (taskId == null || taskId.isEmpty()) return;

            if ("open-review".equals(operation)) {
                openReview(c, taskId, owner, activeOwner);
                return;
            }

            if ("toggle".equals(operation)) {
                boolean targetCompleted;
                if (data.getQueryParameter("targetCompleted") != null) {
                    targetCompleted = "1".equals(data.getQueryParameter("targetCompleted")) || "true".equalsIgnoreCase(data.getQueryParameter("targetCompleted"));
                } else if (data.getQueryParameter("completed") != null) {
                    targetCompleted = !"1".equals(data.getQueryParameter("completed"));
                } else if (intent.hasExtra("targetCompleted")) {
                    targetCompleted = intent.getBooleanExtra("targetCompleted", false);
                } else {
                    targetCompleted = !intent.getBooleanExtra("completed", false);
                }
                if (targetCompleted && openReview(c, taskId, owner, activeOwner)) return;
                AgendaData.setCompleted(c, taskId, targetCompleted);
                AgendaData.prefs(c).edit().putString("syncStatus", targetCompleted ? "Saving completion from widget…" : "Reopening task from widget…").commit();
                AgendaWidgetProvider.redraw(c);
                WidgetTaskActionWorker.enqueue(c, targetCompleted ? "complete" : "reopen", taskId, "", "", "");
                return;
            } else if ("collapse".equals(operation)) {
                int widgetId = -1;
                try { widgetId = Integer.parseInt(data.getQueryParameter("widgetId")); } catch (Exception ignored) { }
                SharedPreferences options = AgendaData.options(c);
                boolean targetCollapsed;
                if (data.getQueryParameter("targetCollapsed") != null) {
                    targetCollapsed = "1".equals(data.getQueryParameter("targetCollapsed")) || "true".equalsIgnoreCase(data.getQueryParameter("targetCollapsed"));
                } else {
                    targetCollapsed = widgetId >= 0 ? !options.getBoolean("widget." + widgetId + ".collapsed." + taskId, false) : true;
                }
                if (widgetId >= 0) {
                    String key = "widget." + widgetId + ".collapsed." + taskId;
                    options.edit().putBoolean(key, targetCollapsed).commit();
                    AppWidgetManager m = AppWidgetManager.getInstance(c);
                    if (m != null && m.getAppWidgetInfo(widgetId) != null) {
                        AgendaWidgetProvider.update(c, m, widgetId);
                    } else {
                        AgendaWidgetProvider.redraw(c);
                    }
                } else {
                    AppWidgetManager m = AppWidgetManager.getInstance(c);
                    for (Class<?> type : AgendaWidgetProvider.TYPES) {
                        for (int wId : m.getAppWidgetIds(new ComponentName(c, type))) {
                            String key = "widget." + wId + ".collapsed." + taskId;
                            options.edit().putBoolean(key, targetCollapsed).commit();
                        }
                    }
                    AgendaWidgetProvider.redraw(c);
                }
                return;
            } else if ("open".equals(operation)) {
                String routeOwner = (owner != null && !owner.isEmpty()) ? owner : activeOwner;
                if (openReview(c, taskId, routeOwner, activeOwner)) return;
                Intent open = AgendaWidgetProvider.appIntent(c,
                    "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(routeOwner) + "&fromWidget=1");
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(open);
                return;
            } else if ("menu".equals(operation)) {
                Intent menu = new Intent(c, WidgetTaskActionActivity.class)
                    .putExtra("taskId", taskId)
                    .putExtra("mode", "menu")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(menu);
                return;
            } else if ("edit".equals(operation)) {
                Intent edit = new Intent(c, WidgetTaskActionActivity.class)
                    .putExtra("taskId", taskId)
                    .putExtra("mode", "edit")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(edit);
                return;
            }
        }
        String action=intent.getAction();
        if(action==null) return;
        if ("toggleDirect".equals(action)) {
            String taskId = intent.getStringExtra("taskId");
            if (taskId == null || taskId.isEmpty()) return;
            String owner = intent.getStringExtra("owner");
            String activeOwner = AgendaData.prefs(c).getString("dataUserId", "");
            if (owner != null && !owner.isEmpty() && !owner.equals(activeOwner)) return;
            boolean targetCompleted;
            if (intent.hasExtra("targetCompleted")) {
                targetCompleted = intent.getBooleanExtra("targetCompleted", false);
            } else {
                targetCompleted = !intent.getBooleanExtra("completed", false);
            }
            if (targetCompleted && openReview(c, taskId, owner, activeOwner)) return;
            AgendaData.setCompleted(c, taskId, targetCompleted);
            AgendaData.prefs(c).edit().putString("syncStatus", targetCompleted ? "Saving completion from widget…" : "Reopening task from widget…").commit();
            AgendaWidgetProvider.redraw(c);
            WidgetTaskActionWorker.enqueue(c, targetCompleted ? "complete" : "reopen", taskId, "", "", "");
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
    static boolean openReview(Context c, String taskId, String owner, String activeOwner) {
        JSONObject task = AgendaData.task(c, taskId);
        if (!AgendaData.isLeitnerStudyTask(task)) return false;
        String route = AgendaWidgetProvider.studyReviewRoute(task,
            owner != null && !owner.isEmpty() ? owner : activeOwner);
        Intent review = AgendaWidgetProvider.appIntent(c, route).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(review);
        return true;
    }
}
