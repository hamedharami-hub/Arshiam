package life.arshnaz.app;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.widget.*;
import android.view.View;

public class WidgetConfigureActivity extends Activity {
    static final String[] SCOPES={"today","tomorrow","next7","overdue","undated","all","high"};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_CANCELED);
        int id=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
        if(id==AppWidgetManager.INVALID_APPWIDGET_ID || AppWidgetManager.getInstance(this).getAppWidgetInfo(id)==null) { finish(); return; }
        String prefix="widget."+id+".";
        android.content.SharedPreferences p=AgendaData.options(this);
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(24,48,24,24); root.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        ScrollView scroll=new ScrollView(this); scroll.addView(root); setContentView(scroll);
        final int padding=(int)(24*getResources().getDisplayMetrics().density);
        root.setPadding(padding,padding,padding,padding);
        scroll.setOnApplyWindowInsetsListener((v,insets)->{
            root.setPadding(padding,padding+insets.getSystemWindowInsetTop(),padding,padding+insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView title=new TextView(this); title.setText("ARSHNAZ Widget Settings"); title.setTextSize(24); root.addView(title);
        TextView help=new TextView(this); help.setText("Combine two views, tap a task to open it, or tap its checkbox to complete and reopen it."); root.addView(help);
        Spinner scope=new Spinner(this);
        String[] labels=new String[SCOPES.length]; for(int i=0;i<labels.length;i++) labels[i]=AgendaData.label(SCOPES[i]);
        scope.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,labels));
        for(int i=0;i<SCOPES.length;i++) if(SCOPES[i].equals(AgendaWidgetProvider.scope(this,id))) scope.setSelection(i);
        scope.setContentDescription("Task view"); TextView viewLabel=new TextView(this); viewLabel.setText("View 1"); root.addView(viewLabel); root.addView(scope);
        Spinner secondary=new Spinner(this); String[] secondaryLabels=new String[SCOPES.length+1]; secondaryLabels[0]="Off";
        for(int i=0;i<SCOPES.length;i++) secondaryLabels[i+1]=AgendaData.label(SCOPES[i]);
        secondary.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,secondaryLabels));
        String savedSecondary=AgendaWidgetProvider.secondaryScope(this,id);
        for(int i=0;i<SCOPES.length;i++) if(SCOPES[i].equals(savedSecondary)) secondary.setSelection(i+1);
        secondary.setContentDescription("Optional combined task view"); root.addView(labeled("View 2 (optional combined view)",secondary));
        Spinner theme=spinner(new String[]{"Dark","Light"},p.getBoolean(prefix+"light",false)?1:0); root.addView(labeled("Theme",theme));
        CheckBox done=check(root,"Show completed tasks",p.getBoolean(prefix+"done",false));
        CheckBox high=check(root,"High priority only",p.getBoolean(prefix+"high",false));
        Spinner textSize=spinner(new String[]{"Small","Medium","Large"},indexOf(new String[]{"small","medium","large"},p.getString(prefix+"textSize",p.getBoolean(prefix+"large",false)?"large":"medium"))); root.addView(labeled("Text size",textSize));
        Spinner sort=spinner(new String[]{"Time","Priority","Title"},indexOf(new String[]{"time","priority","title"},p.getString(prefix+"sort","time"))); root.addView(labeled("Sort by",sort));
        Spinner limit=spinner(new String[]{"3 tasks","4 tasks","6 tasks","8 tasks","12 tasks","All available tasks"},indexOf(new String[]{"3","4","6","8","12","100"},String.valueOf(p.getInt(prefix+"limit",4)))); root.addView(labeled("Tasks shown",limit));
        Button save=new Button(this); save.setText("Save widget"); root.addView(save);
        save.setOnClickListener(v->{
            p.edit().putString(prefix+"scope",SCOPES[scope.getSelectedItemPosition()])
              .putString(prefix+"secondaryScope",secondary.getSelectedItemPosition()==0?"none":SCOPES[secondary.getSelectedItemPosition()-1])
              .putBoolean(prefix+"light",theme.getSelectedItemPosition()==1).putBoolean(prefix+"done",done.isChecked())
              .putBoolean(prefix+"high",high.isChecked()).putBoolean(prefix+"large",textSize.getSelectedItemPosition()==2)
              .putString(prefix+"textSize",new String[]{"small","medium","large"}[textSize.getSelectedItemPosition()])
              .putString(prefix+"sort",new String[]{"time","priority","title"}[sort.getSelectedItemPosition()])
              .putInt(prefix+"limit",new int[]{3,4,6,8,12,100}[limit.getSelectedItemPosition()]).commit();
            AgendaWidgetProvider.update(this,AppWidgetManager.getInstance(this),id);
            if(AgendaData.prefs(this).getBoolean("sessionReady",false)) ArshnazWidgetWorker.enqueue(this);
            setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)); finish();
        });
    }
    private CheckBox check(LinearLayout root,String label,boolean value) {
        CheckBox box=new CheckBox(this); box.setText(label); box.setChecked(value); root.addView(box); return box;
    }
    private Spinner spinner(String[] values,int selected) { Spinner s=new Spinner(this); s.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,values)); s.setSelection(Math.max(0,selected)); return s; }
    private LinearLayout labeled(String label,View value) { LinearLayout row=new LinearLayout(this); row.setOrientation(LinearLayout.VERTICAL); TextView text=new TextView(this); text.setText(label); row.addView(text); row.addView(value); return row; }
    private int indexOf(String[] values,String value) { for(int i=0;i<values.length;i++) if(values[i].equals(value)) return i; return 0; }
}
