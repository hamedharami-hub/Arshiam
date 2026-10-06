package life.arshnaz.app;
public final class ProblemSolveWidgetProvider extends ActionHubWidgetProvider {
    String symbol() { return "◇"; }
    String title() { return "Solve a problem"; } String subtitle() { return "Name it, examine it, choose one next step"; }
    String primaryLabel() { return "Start an ABC record"; } String primaryRoute() { return "abc"; }
    String[] labels() { return new String[]{"Socratic questions", "Worry time", "Add next step"}; }
    String[] routes() { return new String[]{"socratic", "worry", "quick-problem-step"}; }
}
