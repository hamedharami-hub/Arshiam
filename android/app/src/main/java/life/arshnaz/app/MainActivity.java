package life.arshnaz.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ArshnazWidgetPlugin.class);
        registerPlugin(ArshnazGoogleAuthPlugin.class);
        registerPlugin(ArshnazSpeechPlugin.class);
        registerPlugin(NativeExperiencePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
