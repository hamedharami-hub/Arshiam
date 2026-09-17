package life.arshnaz.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ArshnazWidgetPlugin.class);
        registerPlugin(ArshnazGoogleAuthPlugin.class);
        registerPlugin(ArshnazSpeechPlugin.class);
        registerPlugin(NativeExperiencePlugin.class);
        super.onCreate(savedInstanceState);
        syncIntentUri(getIntent());
        forwardIntentToWeb(getIntent());
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
    public void onNewIntent(Intent intent) {
        setIntent(intent);
        syncIntentUri(intent);
        super.onNewIntent(intent);
        forwardIntentToWeb(intent);
    }

    private void syncIntentUri(Intent intent) {
        if (intent == null || bridge == null) return;
        Uri data = intent.getData();
        try {
            java.lang.reflect.Field field = com.getcapacitor.Bridge.class.getDeclaredField("intentUri");
            field.setAccessible(true);
            field.set(bridge, data);
        } catch (Throwable ignored) {}
    }

    void forwardIntentToWeb(Intent intent) {
        if (intent == null) return;
        String taskId = extractTaskId(intent);
        if (taskId != null && !taskId.isEmpty()) {
            forwardRouteToWeb("/app/tasks/" + Uri.encode(taskId));
        }
    }

    public static String extractTaskId(Intent intent) {
        if (intent == null) return null;
        String taskId = intent.getStringExtra("taskId");
        if (taskId != null && !taskId.isEmpty()) return taskId;
        Uri data = intent.getData();
        if (data != null) {
            String qId = data.getQueryParameter("taskId");
            if (qId != null && !qId.isEmpty()) return qId;
        }
        return null;
    }

    void forwardRouteToWeb(String route) {
        if (bridge == null) return;
        try {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.post(() -> {
                    String js = "(function() { " +
                        "if (window.__arshnazNavigate) { window.__arshnazNavigate('" + route + "'); return; } " +
                        "window.dispatchEvent(new CustomEvent('arshnaz:navigate', { detail: { path: '" + route + "' } })); " +
                        "})();";
                    webView.evaluateJavascript(js, null);
                });
            }
        } catch (Throwable ignored) {}
    }
}
