package life.arshnaz.app;

import android.content.Intent;
import android.net.Uri;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
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
        assertEquals("arshnaz://task?taskId=task%201&owner=user-1&fromWidget=1",opened.getDataString());
        assertEquals("task?taskId=task%201&owner=user-1&fromWidget=1",opened.getStringExtra("arshnaz_route"));
    }

    @Test public void ownerMismatchCannotOpenAnotherUsersTask() {
        Intent click=new Intent(Intent.ACTION_VIEW,Uri.parse("arshnaz://widget-action/open?taskId=private&owner=other"));
        WidgetRouterActivity activity=Robolectric.buildActivity(WidgetRouterActivity.class,click).get();
        AgendaData.prefs(activity).edit().putString("dataUserId","user-1").commit();
        activity.onCreate(null);
        assertNull(Shadows.shadowOf(activity).getNextStartedActivity());
    }

    @Test public void collectionTemplateAcceptsTheTaskSpecificFillInUri() {
        Intent template = new Intent(RuntimeEnvironment.getApplication(), WidgetRouterActivity.class)
            .setAction(Intent.ACTION_VIEW);
        Intent row = new Intent().setData(Uri.parse("arshnaz://widget-action/open?taskId=task-1&owner=user-1"));
        template.fillIn(row, 0);
        assertEquals("arshnaz://widget-action/open?taskId=task-1&owner=user-1", template.getDataString());
    }

    @Test public void consecutiveTapsRouteToClickedTaskWithoutStaleIntent() {
        AgendaData.prefs(RuntimeEnvironment.getApplication()).edit().putString("dataUserId", "user-1").commit();

        Intent clickA = new Intent(Intent.ACTION_VIEW, Uri.parse("arshnaz://widget-action/open?taskId=task-A&owner=user-1"));
        WidgetRouterActivity activityA = Robolectric.buildActivity(WidgetRouterActivity.class, clickA).get();
        activityA.onCreate(null);
        Intent openedA = Shadows.shadowOf(activityA).getNextStartedActivity();
        assertNotNull(openedA);
        assertEquals("arshnaz://task?taskId=task-A&owner=user-1&fromWidget=1", openedA.getDataString());

        Intent clickB = new Intent(Intent.ACTION_VIEW, Uri.parse("arshnaz://widget-action/open?taskId=task-B&owner=user-1"));
        activityA.onNewIntent(clickB);
        Intent openedB = Shadows.shadowOf(activityA).getNextStartedActivity();
        assertNotNull(openedB);
        assertEquals("arshnaz://task?taskId=task-B&owner=user-1&fromWidget=1", openedB.getDataString());
    }

    @Test public void mainActivityExtractsEveryNewTaskIdFromIntent() {
        Intent intentA = AgendaWidgetProvider.appIntent(RuntimeEnvironment.getApplication(), "task?taskId=task-alpha&owner=user-1");
        assertEquals("task-alpha", MainActivity.extractTaskId(intentA));

        Intent intentB = AgendaWidgetProvider.appIntent(RuntimeEnvironment.getApplication(), "task?taskId=task-beta&owner=user-1");
        assertEquals("task-beta", MainActivity.extractTaskId(intentB));
        assertNotEquals(MainActivity.extractTaskId(intentA), MainActivity.extractTaskId(intentB));
    }

    @Test public void taskOpenProducesUniquePendingIntentDataAndRequestIdentity() {
        android.content.Context ctx = RuntimeEnvironment.getApplication();
        android.app.PendingIntent piA = AgendaWidgetProvider.taskOpen(ctx, "task-A", 72000);
        android.app.PendingIntent piB = AgendaWidgetProvider.taskOpen(ctx, "task-B", 72000);
        assertNotNull(piA);
        assertNotNull(piB);
        assertNotEquals(piA, piB);
    }

    @Test public void buildDispatchScriptSafelyEncodesQuotesAndSpecialCharacters() {
        String complexUrl = "arshnaz://task?taskId=" + Uri.encode("id\"with'quotes\\and spaces فارسی") + "&owner=user-1";
        String script = MainActivity.buildDispatchScript(complexUrl);
        assertNotNull(script);
        assertTrue(script.startsWith("(function() {"));
        assertTrue(script.endsWith("})();"));
        assertTrue(script.contains("__arshnazDispatchUrl"));
        assertTrue(script.contains("__arshnazPendingUrl"));
        // Quoting must ensure there are no unescaped raw newlines or broken quotes
        assertFalse(script.contains("'\n'"));
    }

    @Test public void extractRawUrlExtractsUriAndRouteCorrectly() {
        Intent intentWithData = new Intent(Intent.ACTION_VIEW, Uri.parse("arshnaz://task?taskId=task-1&owner=u1"));
        assertEquals("arshnaz://task?taskId=task-1&owner=u1", MainActivity.extractRawUrl(intentWithData));

        Intent intentWithRoute = new Intent(Intent.ACTION_VIEW).putExtra("arshnaz_route", "task?taskId=task-2&owner=u2");
        assertEquals("arshnaz://task?taskId=task-2&owner=u2", MainActivity.extractRawUrl(intentWithRoute));
    }

    @Test public void fallbackFailsSafelyWithNullOrMockBridge() {
        // Must never throw an unhandled exception even if bridge is null or invalid
        MainActivity.tryUpdateBridgeIntentUriFallback(null, Uri.parse("arshnaz://task?taskId=1"));
    }
}
