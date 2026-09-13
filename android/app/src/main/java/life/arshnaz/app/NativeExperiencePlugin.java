package life.arshnaz.app;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.app.*;
import android.content.*;
import android.os.Build;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;

@CapacitorPlugin(name="NativeExperience")
public class NativeExperiencePlugin extends Plugin {
    @PluginMethod public void haptic(PluginCall call) {
        String kind=call.getString("kind","light");
        getActivity().runOnUiThread(()->{
            int feedback=HapticFeedbackConstants.CLOCK_TICK;
            if(kind.equals("medium")||kind.equals("heavy")) feedback=HapticFeedbackConstants.LONG_PRESS;
            if(Build.VERSION.SDK_INT>=30 && kind.equals("success")) feedback=HapticFeedbackConstants.CONFIRM;
            if(Build.VERSION.SDK_INT>=30 && (kind.equals("error")||kind.equals("warning"))) feedback=HapticFeedbackConstants.REJECT;
            boolean performed=getActivity().getWindow().getDecorView().performHapticFeedback(feedback);
            call.resolve(new JSObject().put("performed",performed));
        });
    }
    @PluginMethod public void configure(PluginCall call) {
        SharedPreferences.Editor edit=AgendaData.options(getContext()).edit();
        if(call.getBoolean("panelEnabled")!=null) edit.putBoolean("panelEnabled",call.getBoolean("panelEnabled"));
        if(call.getBoolean("remindersEnabled")!=null) edit.putBoolean("remindersEnabled",call.getBoolean("remindersEnabled"));
        edit.commit();
        TaskPanel.update(getContext()); NativeReminders.reconcile(getContext()); status(call);
    }
    @PluginMethod public void status(PluginCall call) {
        AlarmManager alarms=getContext().getSystemService(AlarmManager.class);
        boolean exact=Build.VERSION.SDK_INT<31||alarms.canScheduleExactAlarms();
        call.resolve(new JSObject().put("notificationsAllowed",TaskPanel.allowed(getContext()))
            .put("exactAllowed",exact).put("panelEnabled",AgendaData.options(getContext()).getBoolean("panelEnabled",false))
            .put("remindersEnabled",AgendaData.options(getContext()).getBoolean("remindersEnabled",false))
            .put("scheduledCount",NativeReminders.count(getContext())));
    }
    @PluginMethod public void appInfo(PluginCall call) {
        try {
            android.content.pm.PackageInfo info=getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0);
            long code=Build.VERSION.SDK_INT>=28 ? info.getLongVersionCode() : info.versionCode;
            call.resolve(new JSObject().put("versionName",info.versionName==null?"":info.versionName).put("versionCode",code));
        } catch(Exception e) { call.reject("Unable to read installed app version",e); }
    }
    @PluginMethod public void openNotificationSettings(PluginCall call) {
        Intent i=new Intent(Build.VERSION.SDK_INT>=26?Settings.ACTION_APP_NOTIFICATION_SETTINGS:Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        if(Build.VERSION.SDK_INT>=26)i.putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());
        else i.setData(android.net.Uri.parse("package:"+getContext().getPackageName()));
        getActivity().startActivity(i); call.resolve();
    }
    @PluginMethod public void openExactSettings(PluginCall call) {
        if(Build.VERSION.SDK_INT>=31) getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            android.net.Uri.parse("package:"+getContext().getPackageName())));
        call.resolve();
    }
}
