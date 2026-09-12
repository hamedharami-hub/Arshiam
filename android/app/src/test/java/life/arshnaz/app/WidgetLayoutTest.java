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
}
