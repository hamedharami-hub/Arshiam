package life.arshnaz.app;

import android.app.Activity;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;

/** Small native editor for the operations that must remain quick from a home-screen widget. */
public class WidgetTaskActionActivity extends Activity {
    private static final String[] PRIORITIES = {"none", "low", "medium", "high", "urgent"};
    private static final String[] PRIORITY_LABELS = {"No priority", "Low", "Medium", "High", "Urgent"};
    private static final String[] DUE_LABELS = {"No date", "Today", "Tomorrow"};

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String taskId = getIntent().getStringExtra("taskId");
        boolean create = getIntent().getBooleanExtra("create", false);
        JSONObject task = create ? null : AgendaData.task(this, taskId);
        if (!create && task == null) { Toast.makeText(this, "Task is no longer available. Refresh the widget.", Toast.LENGTH_LONG).show(); finish(); return; }
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(pad, pad * 2, pad, pad); root.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        scroll.addView(root); setContentView(scroll);
        TextView heading = new TextView(this); heading.setTag("widget-action-heading"); heading.setText(create ? "Quick add task" : "Quick task edit"); heading.setTextSize(24); root.addView(heading);
        TextView help = new TextView(this); help.setText(create ? "Add a task with its priority and date. You can open full details afterwards." : "Update title, priority or date without leaving your home screen."); root.addView(help);
        EditText title = new EditText(this); title.setTag("widget-action-title"); title.setHint("Task title"); title.setSingleLine(true); title.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES); title.setText(task == null ? "" : task.optString("title")); root.addView(labeled("Title", title));
        Spinner priority = spinner(PRIORITY_LABELS, indexOf(PRIORITIES, task == null ? "none" : task.optString("priority", "none"))); root.addView(labeled("Priority", priority));
        String due = task == null ? "" : task.optString("due_date", "");
        int dueIndex = due.startsWith(java.time.LocalDate.now().toString()) ? 1 : due.startsWith(java.time.LocalDate.now().plusDays(1).toString()) ? 2 : 0;
        Spinner dueDate = spinner(DUE_LABELS, dueIndex); root.addView(labeled("Due date", dueDate));
        Button save = new Button(this); save.setTag("widget-action-save"); save.setText(create ? "Add task" : "Save quick changes"); root.addView(save);
        save.setOnClickListener(v -> {
            String value = title.getText().toString().trim();
            if (value.isEmpty()) { title.setError("A title is required"); return; }
            String resolvedDue = dueDate.getSelectedItemPosition() == 1 ? java.time.LocalDate.now().toString()
                : dueDate.getSelectedItemPosition() == 2 ? java.time.LocalDate.now().plusDays(1).toString() : "";
            WidgetTaskActionWorker.enqueue(this, create ? "create" : "edit", taskId, value, PRIORITIES[priority.getSelectedItemPosition()], resolvedDue);
            Toast.makeText(this, "Saving from widget…", Toast.LENGTH_SHORT).show(); finish();
        });
        if (!create) {
            Button complete = new Button(this); complete.setText("Mark complete"); root.addView(complete);
            complete.setOnClickListener(v -> { WidgetTaskActionWorker.enqueue(this, "complete", taskId, "", "", ""); Toast.makeText(this, "Saving completion…", Toast.LENGTH_SHORT).show(); finish(); });
            Button full = new Button(this); full.setText("Open full task details"); root.addView(full);
            full.setOnClickListener(v -> { startActivity(AgendaWidgetProvider.appIntent(this, "task?taskId=" + android.net.Uri.encode(taskId) + "&owner=" + android.net.Uri.encode(AgendaData.prefs(this).getString("dataUserId", "")))); finish(); });
        }
    }
    private Spinner spinner(String[] values, int selected) { Spinner s = new Spinner(this); s.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, values)); s.setSelection(Math.max(0, selected)); return s; }
    private LinearLayout labeled(String label, View child) { LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.VERTICAL); TextView text = new TextView(this); text.setText(label); row.addView(text); row.addView(child); return row; }
    private int indexOf(String[] items, String value) { for (int i = 0; i < items.length; i++) if (items[i].equals(value)) return i; return 0; }
}
