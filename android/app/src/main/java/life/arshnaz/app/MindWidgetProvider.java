package life.arshnaz.app;
public final class MindWidgetProvider extends ActionHubWidgetProvider {
    String symbol() { return "✦"; }
    String title() { return "Mind reset"; } String subtitle() { return "A small pause for clarity and self-care"; }
    String primaryLabel() { return "Daily check-in"; } String primaryRoute() { return "checkin"; }
    String[] labels() { return new String[]{"Thought record", "Breathe", "Mind home"}; }
    String[] routes() { return new String[]{"thoughts", "breathing", "mind"}; }
}
