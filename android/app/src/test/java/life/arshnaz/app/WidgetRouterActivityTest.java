package life.arshnaz.app;

import android.content.Intent;
import android.net.Uri;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk={28,35})
public class WidgetRouterActivityTest {
    @Test public void taskTapOpensExactTaskInMainActivity() {
        Intent click=new Intent(Intent.ACTION_VIEW,Uri.parse("arshnaz://widget-action/open?taskId=task%201&owner=user-1"));
        WidgetRouterActivity activity=Robolectric.buildActivity(WidgetRouterActivity.class,click).get();
        AgendaData.prefs(activity).edit().putString("dataUserId","user-1").commit();
        activity.onCreate(null);
        Intent opened=Shadows.shadowOf(activity).getNextStartedActivity();
        assertNotNull(opened);
        assertEquals(MainActivity.class.getName(),opened.getComponent().getClassName());
        assertEquals("arshnaz://task?taskId=task%201&owner=user-1",opened.getDataString());
        assertEquals("task?taskId=task%201&owner=user-1",opened.getStringExtra("arshnaz_route"));
    }

    @Test public void ownerMismatchCannotOpenAnotherUsersTask() {
        Intent click=new Intent(Intent.ACTION_VIEW,Uri.parse("arshnaz://widget-action/open?taskId=private&owner=other"));
        WidgetRouterActivity activity=Robolectric.buildActivity(WidgetRouterActivity.class,click).get();
        AgendaData.prefs(activity).edit().putString("dataUserId","user-1").commit();
        activity.onCreate(null);
        assertNull(Shadows.shadowOf(activity).getNextStartedActivity());
    }
}
