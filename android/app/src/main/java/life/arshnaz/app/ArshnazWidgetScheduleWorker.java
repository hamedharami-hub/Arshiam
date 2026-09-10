package life.arshnaz.app;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** All network work is serialized in the same chain, including periodic refresh. */
public class ArshnazWidgetScheduleWorker extends Worker {
    public ArshnazWidgetScheduleWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    @NonNull @Override public Result doWork() {
        ArshnazWidgetWorker.enqueue(getApplicationContext());
        return Result.success();
    }
}
