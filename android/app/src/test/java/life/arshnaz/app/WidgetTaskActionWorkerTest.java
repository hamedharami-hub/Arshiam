package life.arshnaz.app;

import androidx.work.Data;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk={28,35})
public class WidgetTaskActionWorkerTest {
    @Test public void rejectsWorkFromAnotherAccountOrSession() {
        Data queued = new Data.Builder().putString("ownerId", "owner-a").putLong("sessionGeneration", 7).build();
        assertTrue(WidgetTaskActionWorker.belongsToSession(queued, "owner-a", 7));
        assertFalse(WidgetTaskActionWorker.belongsToSession(queued, "owner-b", 7));
        assertFalse(WidgetTaskActionWorker.belongsToSession(queued, "owner-a", 8));
    }
}
