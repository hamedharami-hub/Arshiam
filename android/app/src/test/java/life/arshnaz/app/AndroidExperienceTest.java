package life.arshnaz.app;
import android.app.*;
import android.content.*;
import android.widget.*;
import android.view.View;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import org.json.*;
import java.time.*;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk={28,35})
public class AndroidExperienceTest {
    Context c;
    @Before public void setup() {
        c=RuntimeEnvironment.getApplication();
        AgendaData.prefs(c).edit().clear().commit();
        AgendaData.options(c).edit().clear().commit();
        NativeReminders.prefs(c).edit().clear().commit();
    }
    JSONArray tasks() throws Exception {
        return new JSONArray().put(new JSONObject().put("id","today-task").put("title","Today test")
            .put("due_date",LocalDate.now().toString()).put("reminder_at",Instant.now().plusSeconds(3600).toString()))
            .put(new JSONObject().put("id","tomorrow-task").put("title","Tomorrow test").put("due_date",LocalDate.now().plusDays(1).toString()));
    }
    void login() throws Exception {AgendaData.prefs(c).edit().putBoolean("sessionReady",true).putString("dataUserId","userA").putString("agendaTasks",tasks().toString()).commit();}
    @Test public void allRemoteLayoutsInflate() {
        for(int layout:new int[]{R.layout.widget_agenda,R.layout.widget_compact,R.layout.widget_task_row,R.layout.widget_arshnaz}) {
            View view=new RemoteViews(c.getPackageName(),layout).apply(c,new FrameLayout(c));assertNotNull(view);
        }
    }
    @Test public void independentWidgetFiltersAndRowRendering() throws Exception {
        login();
        AgendaData.options(c).edit().putString("widget.2.scope","tomorrow").putBoolean("widget.2.light",true).commit();
        AgendaListService.Factory today=new AgendaListService.Factory(c,1), tomorrow=new AgendaListService.Factory(c,2);
        today.onCreate(); tomorrow.onCreate();
        assertEquals(1,today.getCount()); assertEquals(1,tomorrow.getCount());
        View first=today.getViewAt(0).apply(c,new FrameLayout(c));
        View second=tomorrow.getViewAt(0).apply(c,new FrameLayout(c));
        assertEquals("Today test",((TextView)first.findViewById(R.id.row_title)).getText().toString());
        assertEquals("Tomorrow test",((TextView)second.findViewById(R.id.row_title)).getText().toString());
        AgendaData.prefs(c).edit().putString("dataUserId","userB").commit();
        assertNull(today.getViewAt(0)); // A late launcher request cannot show the previous account.
    }
    @Test public void providerBuildsRealCollectionRemoteViews() throws Exception {
        login();
        View view=AgendaWidgetProvider.views(c,1).apply(c,new FrameLayout(c));
        assertEquals("Today",((TextView)view.findViewById(R.id.agenda_title)).getText().toString());
        assertEquals("1 active",((TextView)view.findViewById(R.id.agenda_count)).getText().toString());
    }
    @Test public void notificationIsPrivateAndHasNavigationActions() throws Exception {
        login();TaskPanel.channel(c);
        Notification n=TaskPanel.build(c);
        assertEquals(Notification.VISIBILITY_PRIVATE,n.visibility);assertNotNull(n.publicVersion);
        assertEquals(4,n.actions.length);
        assertEquals("Today test",n.extras.getString(Notification.EXTRA_TEXT));
        new AndroidActionsReceiver().onReceive(c,new Intent().setAction("panelScope"));
        assertEquals("today",AgendaData.options(c).getString("panelScope","today")); // disabled: ignore
        AgendaData.options(c).edit().putBoolean("panelEnabled",true).commit();
        new AndroidActionsReceiver().onReceive(c,new Intent().setAction("panelScope"));
        assertEquals("tomorrow",AgendaData.options(c).getString("panelScope","today"));
    }
    @Test public void nativeAlarmsReconcileSnoozeAndLogout() throws Exception {
        login();AgendaData.options(c).edit().putBoolean("remindersEnabled",true).commit();
        NativeReminders.reconcile(c); assertEquals(1,NativeReminders.count(c));
        assertEquals(1,Shadows.shadowOf(c.getSystemService(AlarmManager.class)).getScheduledAlarms().size());
        JSONObject before=NativeReminders.ledger(c).getJSONObject("today-task");
        NativeReminders.deliver(c,"today-task","userA",true);
        JSONObject snoozed=NativeReminders.ledger(c).getJSONObject("today-task");
        assertTrue(snoozed.getLong("at")<before.getLong("at"));
        NativeReminders.reconcile(c); assertEquals(snoozed.getLong("at"),NativeReminders.ledger(c).getJSONObject("today-task").getLong("at"));
        AgendaData.prefs(c).edit().putBoolean("sessionReady",false).commit();
        NativeReminders.reconcile(c);assertEquals(0,NativeReminders.count(c));
        assertEquals(0,Shadows.shadowOf(c.getSystemService(AlarmManager.class)).getScheduledAlarms().size());
        assertEquals(0,AgendaData.read(c).length());
    }
    @Test public void completedAndDeletedRemindersCancel() throws Exception {
        login();AgendaData.options(c).edit().putBoolean("remindersEnabled",true).commit();
        NativeReminders.reconcile(c);assertEquals(1,NativeReminders.count(c));
        JSONArray rows=tasks();rows.getJSONObject(0).put("completed",true);
        AgendaData.prefs(c).edit().putString("agendaTasks",rows.toString()).commit();
        NativeReminders.reconcile(c);assertEquals(0,NativeReminders.count(c));
        AgendaData.prefs(c).edit().putString("agendaTasks","[]").commit();
        NativeReminders.reconcile(c);assertEquals(0,NativeReminders.count(c));
    }
    @Test public void nativeConfigurationSavesOnlyItsWidget() throws Exception {
        android.appwidget.AppWidgetManager manager=android.appwidget.AppWidgetManager.getInstance(c);
        android.appwidget.AppWidgetProviderInfo info=new android.appwidget.AppWidgetProviderInfo();
        info.provider=new ComponentName(c,TomorrowWidgetProvider.class);info.initialLayout=R.layout.widget_agenda;
        Shadows.shadowOf(manager).addBoundWidget(20,info);
        WidgetConfigureActivity activity=Robolectric.buildActivity(WidgetConfigureActivity.class,
            new Intent().putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,20)).setup().get();
        android.view.ViewGroup root=(android.view.ViewGroup)((ScrollView)((android.view.ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0)).getChildAt(0);
        Spinner spinner=null; CheckBox high=null;
        for(int i=0;i<root.getChildCount();i++) {
            View child=root.getChildAt(i);
            if(child instanceof Spinner && spinner==null) spinner=(Spinner)child;
            if(child instanceof CheckBox && ((CheckBox)child).getText().toString().contains("High priority")) high=(CheckBox)child;
        }
        assertNotNull(spinner); assertNotNull(high);
        assertEquals(1,spinner.getSelectedItemPosition());
        spinner.setSelection(3);high.setChecked(true);
        ((Button)root.getChildAt(root.getChildCount()-1)).performClick();
        assertEquals(Activity.RESULT_OK,Shadows.shadowOf(activity).getResultCode());
        assertEquals("overdue",AgendaWidgetProvider.scope(c,20));
        assertEquals("today",AgendaWidgetProvider.scope(c,21));
        assertTrue(AgendaData.options(c).getBoolean("widget.20.high",false));
    }
    @Test public void compactProviderRendersCorrectSummary() throws Exception {
        login();
        android.appwidget.AppWidgetManager manager=android.appwidget.AppWidgetManager.getInstance(c);
        android.appwidget.AppWidgetProviderInfo info=new android.appwidget.AppWidgetProviderInfo();
        info.provider=new ComponentName(c,CompactWidgetProvider.class);info.initialLayout=R.layout.widget_compact;
        Shadows.shadowOf(manager).addBoundWidget(30,info);
        View view=AgendaWidgetProvider.views(c,30).apply(c,new FrameLayout(c));
        assertEquals("Today test",((TextView)view.findViewById(R.id.agenda_summary)).getText().toString());
        AgendaData.prefs(c).edit().putBoolean("sessionReady",false).commit();
        View cleared=AgendaWidgetProvider.views(c,30).apply(c,new FrameLayout(c));
        assertEquals("No tasks in this view",((TextView)cleared.findViewById(R.id.agenda_summary)).getText().toString());
    }
    @Test public void rebootRestoresSnoozedAlarmWithoutWebView() throws Exception {
        login();AgendaData.options(c).edit().putBoolean("remindersEnabled",true).commit();
        NativeReminders.reconcile(c);NativeReminders.deliver(c,"today-task","userA",true);
        long at=NativeReminders.ledger(c).getJSONObject("today-task").getLong("at");
        new AndroidRescheduleReceiver().onReceive(c,new Intent(Intent.ACTION_BOOT_COMPLETED));
        assertEquals(at,Shadows.shadowOf(c.getSystemService(AlarmManager.class)).peekNextScheduledAlarm().triggerAtTime);
    }
}
