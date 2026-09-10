package app.lovable.d7e345911914455da5aa800df1140813;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.widget.*;
import android.view.View;

public class WidgetConfigureActivity extends Activity {
    static final String[] SCOPES={"today","tomorrow","next7","overdue","undated","all"};
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setResult(RESULT_CANCELED);
        int id=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
        if(id==AppWidgetManager.INVALID_APPWIDGET_ID || AppWidgetManager.getInstance(this).getAppWidgetInfo(id)==null) { finish(); return; }
        String prefix="widget."+id+".";
        android.content.SharedPreferences p=AgendaData.options(this);
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(24,48,24,24); root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        ScrollView scroll=new ScrollView(this); scroll.addView(root); setContentView(scroll);
        final int padding=(int)(24*getResources().getDisplayMetrics().density);
        root.setPadding(padding,padding,padding,padding);
        scroll.setOnApplyWindowInsetsListener((v,insets)->{
            root.setPadding(padding,padding+insets.getSystemWindowInsetTop(),padding,padding+insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView title=new TextView(this); title.setText("تنظیم ویجت ARSHNAZ"); title.setTextSize(24); root.addView(title);
        TextView help=new TextView(this); help.setText("تنظیمات فقط برای همین ویجت ذخیره می‌شود. عنوان تسک‌ها روی صفحهٔ اصلی قابل مشاهده است."); root.addView(help);
        Spinner scope=new Spinner(this);
        String[] labels=new String[SCOPES.length]; for(int i=0;i<labels.length;i++) labels[i]=AgendaData.label(SCOPES[i]);
        scope.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,labels));
        for(int i=0;i<SCOPES.length;i++) if(SCOPES[i].equals(AgendaWidgetProvider.scope(this,id))) scope.setSelection(i);
        scope.setContentDescription("بازهٔ نمایش تسک‌ها"); root.addView(scope);
        CheckBox light=check(root,"ظاهر روشن",p.getBoolean(prefix+"light",false));
        CheckBox done=check(root,"نمایش انجام‌شده‌ها",p.getBoolean(prefix+"done",false));
        CheckBox high=check(root,"فقط اولویت بالا",p.getBoolean(prefix+"high",false));
        CheckBox large=check(root,"متن بزرگ‌تر",p.getBoolean(prefix+"large",false));
        Button save=new Button(this); save.setText("ذخیره و نمایش ویجت"); root.addView(save);
        save.setOnClickListener(v->{
            p.edit().putString(prefix+"scope",SCOPES[scope.getSelectedItemPosition()])
              .putBoolean(prefix+"light",light.isChecked()).putBoolean(prefix+"done",done.isChecked())
              .putBoolean(prefix+"high",high.isChecked()).putBoolean(prefix+"large",large.isChecked()).commit();
            AgendaWidgetProvider.update(this,AppWidgetManager.getInstance(this),id);
            if(AgendaData.prefs(this).getBoolean("sessionReady",false)) ArshnazWidgetWorker.enqueue(this);
            setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)); finish();
        });
    }
    private CheckBox check(LinearLayout root,String label,boolean value) {
        CheckBox box=new CheckBox(this); box.setText(label); box.setChecked(value); root.addView(box); return box;
    }
}
