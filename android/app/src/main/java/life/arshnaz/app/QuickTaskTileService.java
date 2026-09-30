package life.arshnaz.app;
import android.service.quicksettings.*;
import android.os.Build;
import android.annotation.SuppressLint;

public class QuickTaskTileService extends TileService {
    @Override public void onStartListening() {
        Tile tile=getQsTile();
        if(tile!=null) {tile.setState(Tile.STATE_INACTIVE); tile.setLabel("تسک جدید");tile.updateTile();}
    }
    @SuppressLint("StartActivityAndCollapseDeprecated")
    @Override public void onClick() {
        unlockAndRun(()->{
            if(Build.VERSION.SDK_INT>=34) startActivityAndCollapse(AgendaWidgetProvider.activity(this,"new-task",880020));
            else startActivityAndCollapse(new android.content.Intent(this,MainActivity.class)
                .setAction(android.content.Intent.ACTION_VIEW).setData(android.net.Uri.parse("arshnaz://new-task"))
                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK|android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP));
        });
    }
}
