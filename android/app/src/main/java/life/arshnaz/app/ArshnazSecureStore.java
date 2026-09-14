package life.arshnaz.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public final class ArshnazSecureStore {
    private static volatile SharedPreferences sInstance;

    private ArshnazSecureStore() {}

    public static SharedPreferences open(Context context) throws Exception {
        if (sInstance != null) {
            return sInstance;
        }
        synchronized (ArshnazSecureStore.class) {
            if (sInstance == null) {
                Context appCtx = context.getApplicationContext();
                MasterKey key = new MasterKey.Builder(appCtx)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
                sInstance = EncryptedSharedPreferences.create(
                    appCtx,
                    "arshnaz_secure_widget",
                    key,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                );
            }
            return sInstance;
        }
    }

    public static synchronized void reset() {
        sInstance = null;
    }
}
