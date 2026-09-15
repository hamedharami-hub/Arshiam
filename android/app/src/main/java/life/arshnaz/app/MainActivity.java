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
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().clearCache(true);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Widget taps can arrive while this singleTask activity is already showing
     * a different screen. Forward the replacement intent to Capacitor instead
     * of silently resuming the old WebView route.
     */
    @Override
    public void onNewIntent(android.content.Intent intent) {
        setIntent(intent);
        super.onNewIntent(intent);
    }
}
