package life.arshnaz.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Locale;
import org.json.JSONObject;

/** Modern native action dialog for home-screen widget operations: quick edit, voice input, and task actions. */
public class WidgetTaskActionActivity extends Activity {
    private static final int REQ_CODE_SPEECH = 101;
    private static final String[] PRIORITIES = {"none", "low", "medium", "high", "urgent"};
    private static final String[] PRIORITY_LABELS_FA = {"عادی (بدون اولویت)", "کم (Low)", "متوسط (Medium)", "زیاد (High)", "فوری و مهم (Urgent)"};
    private static final String[] PRIORITY_LABELS_EN = {"No priority", "Low", "Medium", "High", "Urgent"};
    private static final String[] CREATE_DUE_LABELS_FA = {"بدون تاریخ", "امروز", "فردا"};
    private static final String[] CREATE_DUE_LABELS_EN = {"No date", "Today", "Tomorrow"};
    private static final String[] EDIT_DUE_LABELS_FA = {"حفظ تاریخ فعلی", "بدون تاریخ", "امروز", "فردا"};
    private static final String[] EDIT_DUE_LABELS_EN = {"Keep current date & time", "No date", "Today", "Tomorrow"};

    private EditText titleInput;
    private boolean isFa = true;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String lang = Locale.getDefault().getLanguage();
        isFa = !"en".equalsIgnoreCase(lang);

        String taskId = getIntent().getStringExtra("taskId");
        boolean create = getIntent().getBooleanExtra("create", false);
        String prefillTitle = getIntent().getStringExtra("prefillTitle");
        boolean prefillToday = getIntent().getBooleanExtra("prefillToday", false);
        String quickSource = getIntent().getStringExtra("quickSource");
        boolean menu = "menu".equals(getIntent().getStringExtra("mode"));

        JSONObject task = create ? null : AgendaData.task(this, taskId);
        if (!create && task == null) {
            Toast.makeText(this, isFa ? "تسک در دسترس نیست. ویجت را تازه‌سازی کنید." : "Task is no longer available. Refresh the widget.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        int dp = (int) getResources().getDisplayMetrics().density;
        int pad = 20 * dp;

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.parseColor("#090D16"));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad + 10 * dp, pad, pad * 2);
        root.setLayoutDirection(isFa ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);
        scroll.addView(root);
        setContentView(scroll);

        if (menu && task != null) {
            showTaskMenu(root, taskId, task, dp);
            return;
        }

        String sourceHeading = "mind".equals(quickSource)
            ? (isFa ? "ثبت قدم کوچک برای آرامش ذهن" : "Add a gentle next step")
            : "problem".equals(quickSource)
            ? (isFa ? "ثبت گام عملی حل مسئله" : "Add the next smallest step")
            : (isFa ? "افزودن تسک سریع" : "Quick add task");

        String sourceHelp = "mind".equals(quickSource)
            ? (isFa ? "یک اقدام کوچک و آرام‌بخش بنویسید یا با ویس بیان کنید." : "Keep it practical and private. You can edit or speak before saving.")
            : "problem".equals(quickSource)
            ? (isFa ? "یک اقدام عینی انتخاب کنید. می‌توانید قبل از ذخیره تغییر دهید." : "Choose one concrete action. You can speak or edit before saving.")
            : (isFa ? "تسک را همراه با اولویت و موعد سریعاً ذخیره کنید." : "Add a task with priority and date from your widget.");

        // Heading
        TextView heading = new TextView(this);
        heading.setTag("widget-action-heading");
        heading.setText(create ? sourceHeading : (isFa ? "ویرایش سریع تسک" : "Quick task edit"));
        heading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        heading.setTextColor(Color.parseColor("#F1F5F9"));
        heading.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(heading);

        TextView help = new TextView(this);
        help.setText(create ? sourceHelp : (isFa ? "تغییر عنوان، اولویت و موعد بدون خروج از ویجت" : "Update title, priority or date without leaving your home screen."));
        help.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        help.setTextColor(Color.parseColor("#94A3B8"));
        help.setPadding(0, 4 * dp, 0, 16 * dp);
        root.addView(help);

        // Title input row with Voice Mic Button ("حرف من")
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setOrientation(LinearLayout.HORIZONTAL);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);

        titleInput = new EditText(this);
        titleInput.setTag("widget-action-title");
        titleInput.setHint(isFa ? "عنوان تسک..." : "Task title...");
        titleInput.setHintTextColor(Color.parseColor("#64748B"));
        titleInput.setTextColor(Color.parseColor("#FFFFFF"));
        titleInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        titleInput.setSingleLine(true);
        titleInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        titleInput.setText(task == null ? (prefillTitle == null ? "" : prefillTitle) : task.optString("title"));
        titleInput.setBackground(roundedCard(Color.parseColor("#171F2F"), Color.parseColor("#334155"), 12 * dp));
        titleInput.setPadding(14 * dp, 12 * dp, 14 * dp, 12 * dp);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        titleRow.addView(titleInput, titleLp);

        // Mic Button ("حرف من" - Voice Speech Input)
        Button micBtn = new Button(this);
        micBtn.setText("🎤");
        micBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        micBtn.setBackground(roundedCard(Color.parseColor("#281A4C"), Color.parseColor("#8B5CF6"), 12 * dp));
        LinearLayout.LayoutParams micLp = new LinearLayout.LayoutParams(48 * dp, 48 * dp);
        if (isFa) micLp.setMarginEnd(8 * dp); else micLp.setMarginStart(8 * dp);
        micBtn.setLayoutParams(micLp);
        micBtn.setContentDescription(isFa ? "ورودی صوتی (حرف من)" : "Voice input");
        micBtn.setOnClickListener(v -> startVoiceRecognition());
        titleRow.addView(micBtn);

        root.addView(labeled(isFa ? "عنوان تسک (یا با دکمه میکروفون صحبت کنید)" : "Title (or tap mic to speak)", titleRow, dp));

        // Priority Spinner
        Spinner priority = spinner(isFa ? PRIORITY_LABELS_FA : PRIORITY_LABELS_EN,
            indexOf(PRIORITIES, task == null ? "none" : task.optString("priority", "none")), dp);
        priority.setTag("widget-action-priority");
        root.addView(labeled(isFa ? "اولویت تسک" : "Priority", priority, dp));

        // Due Date Spinner
        Spinner dueDate = spinner(create ? (isFa ? CREATE_DUE_LABELS_FA : CREATE_DUE_LABELS_EN) : (isFa ? EDIT_DUE_LABELS_FA : EDIT_DUE_LABELS_EN),
            create && prefillToday ? 1 : 0, dp);
        dueDate.setTag("widget-action-due");
        root.addView(labeled(isFa ? "موعد انجام" : "Due date", dueDate, dp));

        // Save Button
        Button save = new Button(this);
        save.setTag("widget-action-save");
        save.setText(create ? (isFa ? "✓ ایجاد تسک" : "Add task") : (isFa ? "✓ ذخیره تغییرات" : "Save quick changes"));
        save.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        save.setTextColor(Color.WHITE);
        save.setTypeface(null, android.graphics.Typeface.BOLD);
        save.setBackgroundResource(R.drawable.widget_btn_primary);
        LinearLayout.LayoutParams saveLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 48 * dp);
        saveLp.topMargin = 16 * dp;
        save.setLayoutParams(saveLp);
        root.addView(save);

        save.setOnClickListener(v -> {
            String value = titleInput.getText().toString().trim();
            if (value.isEmpty()) {
                titleInput.setError(isFa ? "عنوان تسک الزامی است" : "A title is required");
                return;
            }
            int selection = dueDate.getSelectedItemPosition();
            boolean preserveDue = !create && selection == 0;
            int dateChoice = create ? selection : selection - 1;
            String resolvedDue = dateChoice == 1 ? LocalDate.now().toString()
                : dateChoice == 2 ? LocalDate.now().plusDays(1).toString() : "";
            WidgetTaskActionWorker.enqueue(this, create ? "create" : "edit", taskId, value,
                PRIORITIES[priority.getSelectedItemPosition()], resolvedDue, preserveDue);
            Toast.makeText(this, isFa ? "تسک با موفقیت ذخیره شد..." : "Saving from widget…", Toast.LENGTH_SHORT).show();
            finish();
        });

        if (!create) {
            boolean done = task.optBoolean("completed") || "done".equals(task.optString("status"));

            // Toggle Complete Button
            Button complete = new Button(this);
            complete.setText(done ? (isFa ? "↺ علامت‌گذاری به عنوان انجام نشده" : "Mark not complete") : (isFa ? "✓ انجام شد (تیک زدن)" : "Mark complete"));
            complete.setTextColor(Color.parseColor("#C4B5FD"));
            complete.setBackgroundResource(R.drawable.widget_btn_secondary);
            LinearLayout.LayoutParams compLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
            compLp.topMargin = 10 * dp;
            complete.setLayoutParams(compLp);
            root.addView(complete);
            complete.setOnClickListener(v -> {
                AgendaData.setCompleted(this, taskId, !done);
                WidgetTaskActionWorker.enqueue(this, done ? "reopen" : "complete", taskId, "", "", "");
                AgendaWidgetProvider.redraw(this);
                Toast.makeText(this, isFa ? (done ? "تسک باز شد" : "تسک تیک خورد و انجام شد ✓") : "Saving completion…", Toast.LENGTH_SHORT).show();
                finish();
            });

            // Open full details
            Button full = new Button(this);
            full.setText(isFa ? "↗ باز کردن جزئیات کامل در برنامه" : "Open full task details");
            full.setTextColor(Color.parseColor("#94A3B8"));
            full.setBackgroundResource(R.drawable.widget_btn_secondary);
            LinearLayout.LayoutParams fullLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 44 * dp);
            fullLp.topMargin = 8 * dp;
            full.setLayoutParams(fullLp);
            root.addView(full);
            full.setOnClickListener(v -> {
                startActivity(AgendaWidgetProvider.appIntent(this, "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(AgendaData.prefs(this).getString("dataUserId", "")) + "&fromWidget=1"));
                finish();
            });
        }
    }

    /** Task actions menu opened from the small widget action control. */
    private void showTaskMenu(LinearLayout root, String taskId, JSONObject task, int dp) {
        TextView heading = new TextView(this);
        heading.setTag("widget-action-heading");
        heading.setText(isFa ? "عملیات تسک" : "Task actions");
        heading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        heading.setTextColor(Color.parseColor("#F1F5F9"));
        heading.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(heading);

        // Task Card Preview
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(roundedCard(Color.parseColor("#171F2F"), Color.parseColor("#2C3A50"), 14 * dp));
        card.setPadding(16 * dp, 14 * dp, 16 * dp, 14 * dp);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.topMargin = 12 * dp;
        cardLp.bottomMargin = 16 * dp;
        card.setLayoutParams(cardLp);

        TextView title = new TextView(this);
        title.setText(task.optString("title"));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        title.setTextColor(Color.WHITE);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(title);

        boolean done = task.optBoolean("completed") || "done".equals(task.optString("status"));
        String priorityStr = task.optString("priority", "none");
        String metaText = (done ? (isFa ? "وضعیت: انجام‌شده ✓ · " : "Status: Done · ") : (isFa ? "وضعیت: در انتظار · " : "Status: Todo · "))
            + (isFa ? "اولویت: " + ("urgent".equals(priorityStr) ? "فوری و مهم (Urgent)" : "high".equals(priorityStr) ? "زیاد (High)" : "medium".equals(priorityStr) ? "متوسط (Medium)" : "low".equals(priorityStr) ? "کم (Low)" : "عادی (بدون اولویت)") : "Priority: " + ("urgent".equals(priorityStr) ? "Urgent" : priorityStr));
        TextView meta = new TextView(this);
        meta.setText(metaText);
        meta.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        meta.setTextColor(Color.parseColor("#94A3B8"));
        meta.setPadding(0, 4 * dp, 0, 0);
        card.addView(meta);

        root.addView(card);

        // 1. Toggle Complete Action
        Button complete = new Button(this);
        complete.setText(done ? (isFa ? "↺ علامت‌گذاری به عنوان انجام‌نشده" : "Mark not complete") : (isFa ? "✓ تیک زدن و انجام شد" : "Mark complete"));
        complete.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        complete.setTextColor(Color.WHITE);
        complete.setBackgroundResource(R.drawable.widget_btn_primary);
        LinearLayout.LayoutParams compLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
        compLp.bottomMargin = 8 * dp;
        complete.setLayoutParams(compLp);
        root.addView(complete);
        complete.setOnClickListener(v -> {
            AgendaData.setCompleted(this, taskId, !done);
            WidgetTaskActionWorker.enqueue(this, done ? "reopen" : "complete", taskId, "", "", "");
            AgendaWidgetProvider.redraw(this);
            Toast.makeText(this, isFa ? (done ? "تسک بازگردانی شد" : "تسک با موفقیت انجام شد ✓") : "Saved completion", Toast.LENGTH_SHORT).show();
            finish();
        });

        // 2. Quick Edit Action
        Button edit = new Button(this);
        edit.setText(isFa ? "✏️ ویرایش عنوان، اولویت و موعد" : "Edit title, priority or date");
        edit.setTextColor(Color.parseColor("#E2E8F0"));
        edit.setBackgroundResource(R.drawable.widget_btn_secondary);
        LinearLayout.LayoutParams editLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
        editLp.bottomMargin = 8 * dp;
        edit.setLayoutParams(editLp);
        root.addView(edit);
        edit.setOnClickListener(v -> {
            startActivity(new Intent(this, WidgetTaskActionActivity.class).putExtra("taskId", taskId).putExtra("mode", "edit"));
            finish();
        });

        // 2.5 Toggle Subtasks in widget (if task has children)
        if (AgendaListService.Factory.hasChildren(this, taskId)) {
            int subCount = AgendaListService.Factory.childCount(this, taskId);
            Button toggleSubs = new Button(this);
            toggleSubs.setText(isFa ? "📁 باز/بستن " + subCount + " زیرمجموعه در ویجت" : "Toggle " + subCount + " subtasks in widget");
            toggleSubs.setTextColor(Color.parseColor("#DDD6FE"));
            toggleSubs.setBackgroundResource(R.drawable.widget_btn_secondary);
            LinearLayout.LayoutParams tsLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
            tsLp.bottomMargin = 8 * dp;
            toggleSubs.setLayoutParams(tsLp);
            root.addView(toggleSubs);
            toggleSubs.setOnClickListener(v -> {
                android.content.SharedPreferences opts = AgendaData.options(this);
                android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(this);
                for (Class<?> type : AgendaWidgetProvider.TYPES) {
                    for (int wId : m.getAppWidgetIds(new android.content.ComponentName(this, type))) {
                        String key = "widget." + wId + ".collapsed." + taskId;
                        opts.edit().putBoolean(key, !opts.getBoolean(key, false)).commit();
                    }
                }
                AgendaWidgetProvider.redraw(this);
                Toast.makeText(this, isFa ? "وضعیت ساب‌تسک‌ها در ویجت تغییر کرد" : "Toggled subtasks in widget", Toast.LENGTH_SHORT).show();
                finish();
            });
        }

        // 3. Move to Tomorrow / Postpone
        Button postpone = new Button(this);
        postpone.setText(isFa ? "📅 انتقال موعد به فردا" : "Postpone to Tomorrow");
        postpone.setTextColor(Color.parseColor("#C4B5FD"));
        postpone.setBackgroundResource(R.drawable.widget_btn_secondary);
        LinearLayout.LayoutParams postLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
        postLp.bottomMargin = 8 * dp;
        postpone.setLayoutParams(postLp);
        root.addView(postpone);
        postpone.setOnClickListener(v -> {
            String tomorrow = LocalDate.now().plusDays(1).toString();
            WidgetTaskActionWorker.enqueue(this, "edit", taskId, task.optString("title"), task.optString("priority", "none"), tomorrow, false);
            AgendaWidgetProvider.redraw(this);
            Toast.makeText(this, isFa ? "موعد تسک به فردا منتقل شد" : "Postponed to tomorrow", Toast.LENGTH_SHORT).show();
            finish();
        });

        // 4. Open in App Details
        Button open = new Button(this);
        open.setText(isFa ? "↗ باز کردن در برنامه اصلی" : "Open full task details");
        open.setTextColor(Color.parseColor("#94A3B8"));
        open.setBackgroundResource(R.drawable.widget_btn_secondary);
        LinearLayout.LayoutParams openLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
        openLp.bottomMargin = 8 * dp;
        open.setLayoutParams(openLp);
        root.addView(open);
        open.setOnClickListener(v -> {
            startActivity(AgendaWidgetProvider.appIntent(this, "task?taskId=" + Uri.encode(taskId) + "&owner=" + Uri.encode(AgendaData.prefs(this).getString("dataUserId", "")) + "&fromWidget=1"));
            finish();
        });

        // 5. Delete Task Action
        Button delete = new Button(this);
        delete.setText(isFa ? "🗑️ حذف تسک" : "Delete task");
        delete.setTextColor(Color.parseColor("#F87171"));
        delete.setBackgroundResource(R.drawable.widget_btn_danger);
        LinearLayout.LayoutParams delLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 46 * dp);
        delLp.topMargin = 6 * dp;
        delete.setLayoutParams(delLp);
        root.addView(delete);
        delete.setOnClickListener(v -> {
            AgendaData.deleteTask(this, taskId);
            WidgetTaskActionWorker.enqueue(this, "delete", taskId, "", "", "");
            AgendaWidgetProvider.redraw(this);
            Toast.makeText(this, isFa ? "تسک حذف شد" : "Task deleted", Toast.LENGTH_SHORT).show();
            finish();
        });
    }

    /** Trigger Android native speech recognizer */
    private void startVoiceRecognition() {
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, isFa ? "fa-IR" : Locale.getDefault().toString());
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, isFa ? "حرف من: عنوان تسک را بگویید..." : "Speak task title...");
            startActivityForResult(intent, REQ_CODE_SPEECH);
        } catch (Exception e) {
            Toast.makeText(this, isFa ? "سرویس تشخیص گفتار روی این گوشی فعال نیست" : "Speech recognition unavailable", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_CODE_SPEECH && resultCode == RESULT_OK && data != null) {
            ArrayList<String> matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty() && titleInput != null) {
                String spoken = matches.get(0).trim();
                String existing = titleInput.getText().toString().trim();
                titleInput.setText(existing.isEmpty() ? spoken : existing + " " + spoken);
                titleInput.setSelection(titleInput.getText().length());
                Toast.makeText(this, isFa ? "صدا دریافت شد: " + spoken : "Transcribed: " + spoken, Toast.LENGTH_SHORT).show();
            }
        }
    }

    private Spinner spinner(String[] values, int selected, int dp) {
        Spinner s = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, values) {
            @Override
            public View getView(int position, View convertView, android.view.ViewGroup parent) {
                View v = super.getView(position, convertView, parent);
                if (v instanceof TextView) {
                    ((TextView) v).setTextColor(Color.parseColor("#F1F5F9"));
                    ((TextView) v).setTextSize(14);
                }
                return v;
            }
        };
        s.setAdapter(adapter);
        s.setBackground(roundedCard(Color.parseColor("#171F2F"), Color.parseColor("#334155"), 12 * dp));
        s.setPadding(12 * dp, 10 * dp, 12 * dp, 10 * dp);
        s.setSelection(Math.max(0, selected));
        return s;
    }

    private LinearLayout labeled(String label, View child, int dp) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(0, 8 * dp, 0, 4 * dp);
        TextView text = new TextView(this);
        text.setText(label);
        text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        text.setTextColor(Color.parseColor("#94A3B8"));
        text.setPadding(0, 0, 0, 6 * dp);
        row.addView(text);
        row.addView(child);
        return row;
    }

    private GradientDrawable roundedCard(int bgColor, int strokeColor, int radius) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(bgColor);
        gd.setCornerRadius(radius);
        if (strokeColor != 0) gd.setStroke(1, strokeColor);
        return gd;
    }

    private int indexOf(String[] items, String value) {
        for (int i = 0; i < items.length; i++) if (items[i].equals(value)) return i;
        return 0;
    }
}
