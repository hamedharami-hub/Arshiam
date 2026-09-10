package life.arshnaz.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/** Native Android speech recognition for Capacitor WebViews. */
@CapacitorPlugin(
    name = "ArshnazSpeech",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class ArshnazSpeechPlugin extends Plugin implements RecognitionListener {
    private SpeechRecognizer recognizer;
    private PluginCall activeCall;

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionResult");
            return;
        }
        startRecognition(call);
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission denied", "PERMISSION_DENIED");
            return;
        }
        startRecognition(call);
    }

    private void startRecognition(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("Speech recognition service unavailable", "UNAVAILABLE");
                return;
            }
            stopRecognizer(false);
            activeCall = call;
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(this);

            String language = call.getString("language", "fa-IR");
            boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", false));
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
            recognizer.startListening(intent);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopRecognizer(true);
            call.resolve();
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        result.put("onDeviceAvailable", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    private void stopRecognizer(boolean rejectActive) {
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
            recognizer.destroy();
            recognizer = null;
        }
        if (rejectActive && activeCall != null) {
            activeCall.reject("Speech recognition stopped", "ABORTED");
        }
        activeCall = null;
    }

    private void resolveResults(Bundle results) {
        if (activeCall == null) return;
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        float[] confidence = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
        if (matches == null || matches.isEmpty()) {
            rejectActive("No speech detected", "NO_SPEECH");
            return;
        }
        JSObject response = new JSObject();
        response.put("transcript", matches.get(0));
        if (confidence != null && confidence.length > 0) response.put("confidence", confidence[0]);
        PluginCall call = activeCall;
        activeCall = null;
        call.resolve(response);
        stopRecognizer(false);
    }

    private void rejectActive(String message, String code) {
        if (activeCall == null) return;
        PluginCall call = activeCall;
        activeCall = null;
        call.reject(message, code);
        stopRecognizer(false);
    }

    private String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "AUDIO";
            case SpeechRecognizer.ERROR_CLIENT: return "CLIENT";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "PERMISSION_DENIED";
            case SpeechRecognizer.ERROR_NETWORK: return "NETWORK";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "NETWORK_TIMEOUT";
            case SpeechRecognizer.ERROR_NO_MATCH: return "NO_MATCH";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "BUSY";
            case SpeechRecognizer.ERROR_SERVER: return "SERVER";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "NO_SPEECH";
            default: return "UNKNOWN";
        }
    }

    @Override public void onReadyForSpeech(Bundle params) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() {}
    @Override public void onEvent(int eventType, Bundle params) {}
    @Override public void onPartialResults(Bundle partialResults) {}
    @Override public void onResults(Bundle results) { resolveResults(results); }
    @Override public void onError(int error) { rejectActive("Speech recognition failed", errorCode(error)); }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> stopRecognizer(true));
        super.handleOnDestroy();
    }
}
