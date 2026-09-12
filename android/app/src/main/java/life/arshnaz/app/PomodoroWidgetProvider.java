package life.arshnaz.app;
public final class PomodoroWidgetProvider extends ActionHubWidgetProvider {
    String symbol() { return "◷"; }
    String title() { return "Focus timer"; } String subtitle() { return "Start a calm, deliberate 25-minute session"; }
    String primaryLabel() { return "Start 25 min"; } String primaryRoute() { return "pomodoro"; }
    String[] labels() { return new String[]{"Choose task", "Today", "Quick add"}; }
    String[] routes() { return new String[]{"today", "today", "quick-add"}; }
}
