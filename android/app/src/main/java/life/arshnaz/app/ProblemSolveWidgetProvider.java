package life.arshnaz.app;
public final class ProblemSolveWidgetProvider extends ActionHubWidgetProvider {
    String symbol() { return "◇"; }
    String title() { return "Solve a problem"; } String subtitle() { return "Name it, examine it, choose one next step"; }
    String primaryLabel() { return "Start a thought record"; } String primaryRoute() { return "abc"; }
    String[] labels() { return new String[]{"Socratic questions", "Worry time", "Life plan"}; }
    String[] routes() { return new String[]{"socratic", "worry", "life-architect"}; }
}
