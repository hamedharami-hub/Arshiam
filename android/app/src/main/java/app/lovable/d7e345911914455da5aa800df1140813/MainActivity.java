package app.lovable.d7e345911914455da5aa800df1140813;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ArshnazWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
