package life.arshnaz.app;

import android.content.Intent;
import android.view.View;
import android.widget.TextView;
import android.widget.EditText;
import android.widget.Spinner;
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
    @Test public void mindAndProblemWidgetsPrefillEditableNextSteps() {
        Intent mindIntent = new Intent().putExtra("create", true).putExtra("quickSource","mind")
            .putExtra("prefillTitle","Take one kind step").putExtra("prefillToday",true);
        WidgetTaskActionActivity mind = Robolectric.buildActivity(WidgetTaskActionActivity.class,mindIntent).setup().get();
        View mindRoot=mind.getWindow().getDecorView();
        assertEquals("Add a gentle next step",((TextView)mindRoot.findViewWithTag("widget-action-heading")).getText().toString());
        assertEquals("Take one kind step",((EditText)mindRoot.findViewWithTag("widget-action-title")).getText().toString());
        assertEquals(1,((Spinner)mindRoot.findViewWithTag("widget-action-due")).getSelectedItemPosition());
        Intent problemIntent = new Intent().putExtra("create", true).putExtra("quickSource","problem")
            .putExtra("prefillTitle","Define the next smallest step").putExtra("prefillToday",true);
        WidgetTaskActionActivity problem = Robolectric.buildActivity(WidgetTaskActionActivity.class,problemIntent).setup().get();
        assertEquals("Add the next smallest step",((TextView)problem.getWindow().getDecorView().findViewWithTag("widget-action-heading")).getText().toString());
    }
}
