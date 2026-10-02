package life.arshnaz.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ArshnazWidgetPlugin.class);
        registerPlugin(ArshnazGoogleAuthPlugin.class);
        registerPlugin(ArshnazSpeechPlugin.class);
        registerPlugin(NativeExperiencePlugin.class);
        super.onCreate(savedInstanceState);
        tryUpdateBridgeIntentUriFallback(bridge, getIntent() != null ? getIntent().getData() : null);
        forwardIntentToWeb(getIntent());
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().clearCache(true);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Widget taps arrive while this singleTask activity is running or in the background.
     * 1. Forward the intent to Capacitor Bridge's public onNewIntent() lifecycle so all
     *    registered plugins (such as AppPlugin) are properly notified.
     * 2. Safely forward the raw native arshnaz:// URL to the webview via JSON encoding so
     *    React's nativeRoute() allowlist and cross-account owner checks remain authoritative.
     */
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        tryUpdateBridgeIntentUriFallback(bridge, intent != null ? intent.getData() : null);
        forwardIntentToWeb(intent);
    }

    /**
     * Fallback for Capacitor 6.x: {@link Bridge} provides a public {@code getIntentUri()} method
     * queried by {@code AppPlugin.getLaunchUrl()}, but does not expose a public setter for the
     * internal {@code intentUri} field once initialized in the constructor.
     * When a replacement intent arrives via {@code onNewIntent}, this fallback updates that cached
     * URI so subsequent {@code getLaunchUrl()} queries reflect the newest intent.
     * If reflection is denied by the security manager or future Capacitor internal changes,
     * it fails safely; live routing continues via {@code bridge.onNewIntent()} and {@code forwardIntentToWeb()}.
     */
    static void tryUpdateBridgeIntentUriFallback(Bridge targetBridge, Uri uri) {
        if (targetBridge == null) return;
        try {
            java.lang.reflect.Field field = Bridge.class.getDeclaredField("intentUri");
            field.setAccessible(true);
            field.set(targetBridge, uri);
        } catch (Throwable ignored) {
            // Fail safely without throwing exceptions or blocking execution.
        }
    }

    /**
     * Extracts the raw deep link URL from either intent data or route extra.
     * Preserves the arshnaz:// URI format so the web application's allowlist and
     * cross-account owner validation remain authoritative.
     */
    public static String extractRawUrl(Intent intent) {
        if (intent == null) return null;
        Uri data = intent.getData();
        if (data != null) return data.toString();
        String route = intent.getStringExtra("arshnaz_route");
        if (route != null && !route.isEmpty()) {
            return route.startsWith("arshnaz://") ? route : "arshnaz://" + route;
        }
        return null;
    }

    /**
     * Extracts taskId for direct queries and testing backward compatibility.
     */
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

    /**
     * Generates a safe JavaScript snippet that passes the navigation URL to the WebView.
     * Uses JSONObject.quote() to guarantee that quotes, newlines, and special characters
     * in task IDs or URLs cannot break JavaScript evaluation or inject malicious code.
     * Also supports delayed WebView loading by storing the URL in window.__arshnazPendingUrl
     * if the React listener (window.__arshnazDispatchUrl) has not yet registered.
     */
    public static String buildDispatchScript(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty()) return null;
        String quoted = JSONObject.quote(rawUrl);
        return "(function() { " +
            "var u = " + quoted + "; " +
            "if (typeof window !== 'undefined') { " +
            "  if (typeof window.__arshnazDispatchUrl === 'function') { window.__arshnazDispatchUrl({ url: u }); } " +
            "  else { window.__arshnazPendingUrl = u; } " +
            "} " +
            "})();";
    }

    void forwardIntentToWeb(Intent intent) {
        if (intent == null || bridge == null) return;
        String rawUrl = extractRawUrl(intent);
        if (rawUrl == null || rawUrl.isEmpty()) return;
        try {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.requestFocus();
                String script = buildDispatchScript(rawUrl);
                if (script != null) {
                    webView.post(() -> webView.evaluateJavascript(script, null));
                }
            }
        } catch (Throwable ignored) {}
    }
}
