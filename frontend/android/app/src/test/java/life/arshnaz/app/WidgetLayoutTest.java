package life.arshnaz.app;

import android.content.Context;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {28, 35})
public class WidgetLayoutTest {
    @Test public void launcherCanInflateAndUpdateWidget() {
        Context context = RuntimeEnvironment.getApplication();
        RemoteViews remote = new RemoteViews(context.getPackageName(), R.layout.widget_arshnaz);
        remote.setTextViewText(R.id.widget_task_count, "3");
        remote.setTextViewText(R.id.widget_next_task, "Test task");
        View view = remote.apply(context, new FrameLayout(context));
        assertEquals("3", ((TextView) view.findViewById(R.id.widget_task_count)).getText().toString());
        assertEquals("Test task", ((TextView) view.findViewById(R.id.widget_next_task)).getText().toString());
        assertNotNull(view.findViewById(R.id.widget_refresh));
        assertNotNull(view.findViewById(R.id.widget_add_task));
        assertNotNull(view.findViewById(R.id.widget_notes));
    }
    @Test public void actionHubHasAPrimaryAndThreeDedicatedActions() {
        Context context = RuntimeEnvironment.getApplication();
        View view = new RemoteViews(context.getPackageName(), R.layout.widget_action_hub)
            .apply(context, new FrameLayout(context));
        assertNotNull(view.findViewById(R.id.hub_primary));
        assertNotNull(view.findViewById(R.id.hub_action_one));
        assertNotNull(view.findViewById(R.id.hub_action_two));
        assertNotNull(view.findViewById(R.id.hub_action_three));
    }
    @Test public void widgetTaskRowHasRtlExplicitDirectionAndActionControls() throws Exception {
        Context context = RuntimeEnvironment.getApplication();
        org.xmlpull.v1.XmlPullParser xpp = context.getResources().getLayout(R.layout.widget_task_row);
        int eventType;
        String layoutDir = null;
        while ((eventType = xpp.next()) != org.xmlpull.v1.XmlPullParser.END_DOCUMENT) {
            if (eventType == org.xmlpull.v1.XmlPullParser.START_TAG && "LinearLayout".equals(xpp.getName())) {
                layoutDir = xpp.getAttributeValue("http://schemas.android.com/apk/res/android", "layoutDirection");
                break;
            }
        }
        assertTrue("layoutDirection must be rtl (compiled as 1), got: " + layoutDir, "1".equals(layoutDir) || "rtl".equals(layoutDir));

        View row = android.view.LayoutInflater.from(context).inflate(R.layout.widget_task_row, null);
        View done = row.findViewById(R.id.row_done);
        assertNotNull(done);
        float density = context.getResources().getDisplayMetrics().density;
        int doneWidthDp = Math.round(done.getLayoutParams().width / density);
        int doneHeightDp = Math.round(done.getLayoutParams().height / density);
        assertTrue("row_done width must be 28-32dp, got: " + doneWidthDp, doneWidthDp >= 28 && doneWidthDp <= 32);
        assertTrue("row_done height must be 28-32dp, got: " + doneHeightDp, doneHeightDp >= 28 && doneHeightDp <= 32);

        View action = row.findViewById(R.id.row_action);
        assertNotNull(action);
        int actionWidthDp = Math.round(action.getLayoutParams().width / density);
        int actionHeightDp = Math.round(action.getLayoutParams().height / density);
        assertEquals(30, actionWidthDp);
        assertEquals(30, actionHeightDp);
        assertEquals("⚙", ((TextView) action).getText().toString());
        assertEquals("عملیات", action.getContentDescription().toString());

        View expand = row.findViewById(R.id.row_expand);
        assertNotNull(expand);
        int expandWidthDp = Math.round(expand.getLayoutParams().width / density);
        int expandHeightDp = Math.round(expand.getLayoutParams().height / density);
        assertEquals(30, expandWidthDp);
        assertEquals(30, expandHeightDp);

        assertNotNull(row.findViewById(R.id.row_content));
        assertNotNull(row.findViewById(R.id.row_title));
        assertNotNull(row.findViewById(R.id.row_priority));
    }
}
