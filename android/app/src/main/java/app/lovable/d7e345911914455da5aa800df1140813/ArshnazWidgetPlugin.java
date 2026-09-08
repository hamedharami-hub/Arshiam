package app.lovable.d7e345911914455da5aa800df1140813;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "ArshnazWidget")
public class ArshnazWidgetPlugin extends Plugin {
    private static final String PREFS = "arshnaz_widget_data";

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        int activeCount = call.getInt("activeCount", 0);
        String nextTaskId = call.getString("nextTaskId", "");
        String nextTaskTitle = call.getString("nextTaskTitle", "");
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        preferences.edit()
            .putInt("activeCount", activeCount)
            .putString("nextTaskId", nextTaskId == null ? "" : nextTaskId)
            .putString("nextTaskTitle", nextTaskTitle == null ? "" : nextTaskTitle)
            .apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName provider = new ComponentName(getContext(), ArshnazWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            new ArshnazWidgetProvider().onUpdate(getContext(), manager, ids);
        }
        call.resolve(new JSObject().put("updated", true).put("widgetCount", ids.length));
    }
}
