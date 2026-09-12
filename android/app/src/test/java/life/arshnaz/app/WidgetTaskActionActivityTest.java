package life.arshnaz.app;

import android.content.Intent;
import android.view.View;
import android.widget.TextView;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class WidgetTaskActionActivityTest {
    @Test public void quickAddOpensARealNativeFormInsteadOfASplashScreen() {
        Intent intent = new Intent().putExtra("create", true);
        WidgetTaskActionActivity activity = Robolectric.buildActivity(WidgetTaskActionActivity.class, intent).setup().get();
        View root = activity.getWindow().getDecorView();
        assertNotNull(root.findViewWithTag("widget-action-heading"));
        assertNotNull(root.findViewWithTag("widget-action-title"));
        assertNotNull(root.findViewWithTag("widget-action-save"));
        assertEquals("Quick add task", ((TextView) root.findViewWithTag("widget-action-heading")).getText().toString());
    }
}
