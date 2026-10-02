package life.arshnaz.app;

import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/** Quick Settings control for the same durable timer used by the Focus widget. */
public final class FocusTimerTileService extends TileService {
    @Override public void onStartListening() { render(); }
    @Override public void onClick() {
        unlockAndRun(() -> {
            PomodoroWidgetProvider.State state=PomodoroWidgetProvider.state(this);
            if (state.running) PomodoroWidgetProvider.pause(this);
            else PomodoroWidgetProvider.start(this);
            PomodoroWidgetProvider.updateAll(this);
            render();
        });
    }
    private void render() {
        Tile tile=getQsTile(); if (tile==null) return;
        PomodoroWidgetProvider.State state=PomodoroWidgetProvider.state(this);
        tile.setState(state.running ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        String label=state.running ? "Focus · "+PomodoroWidgetProvider.format(state.remainingMs)
            : state.complete() ? "Focus · Start 25 min"
            : state.hasStarted ? "Focus · Resume" : "Focus · 25:00";
        tile.setLabel(label); tile.updateTile();
    }
}
