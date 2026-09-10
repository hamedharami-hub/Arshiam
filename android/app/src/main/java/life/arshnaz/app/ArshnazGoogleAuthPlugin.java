package life.arshnaz.app;

import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.core.content.ContextCompat;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Obtain a Google credential in system UI; Firebase JS validates the credential. */
@CapacitorPlugin(name = "ArshnazGoogleAuth")
public class ArshnazGoogleAuthPlugin extends Plugin {
    private boolean signingIn;

    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("clientId", "");
        if (!clientId.endsWith(".apps.googleusercontent.com")) {
            call.reject("Google Web client ID is missing", "GOOGLE_CONFIG");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (signingIn) { call.reject("Sign-in already running", "GOOGLE_BUSY"); return; }
            signingIn = true;
            try {
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(new GetSignInWithGoogleOption.Builder(clientId).build())
                    .build();
                CredentialManager.create(getContext()).getCredentialAsync(
                    getActivity(), request, null, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse result) {
                            signingIn = false;
                            try {
                                String type = result.getCredential().getType();
                                if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(type)
                                    && !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL.equals(type)) {
                                    call.reject("Unexpected credential", "GOOGLE_CREDENTIAL");
                                    return;
                                }
                                GoogleIdTokenCredential credential =
                                    GoogleIdTokenCredential.createFrom(result.getCredential().getData());
                                call.resolve(new JSObject().put("idToken", credential.getIdToken()));
                            } catch (Exception e) {
                                call.reject("Invalid Google credential", "GOOGLE_CREDENTIAL");
                            }
                        }
                        @Override public void onError(GetCredentialException e) {
                            signingIn = false;
                            call.reject("Google sign-in could not complete",
                                e instanceof GetCredentialCancellationException ? "GOOGLE_CANCELLED" : "GOOGLE_CONFIG",
                                new JSObject().put("providerErrorType", e.getClass().getName())
                                    .put("exceptionClass", e.getClass().getSimpleName()));
                        }
                    });
            } catch (Exception e) {
                signingIn = false;
                call.reject("Google sign-in unavailable", "GOOGLE_CONFIG");
            }
        });
    }
}
