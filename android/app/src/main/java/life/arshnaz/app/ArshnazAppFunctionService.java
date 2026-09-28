package life.arshnaz.app;

import android.app.appfunctions.AppFunctionException;
import android.app.appfunctions.AppFunctionService;
import android.app.appfunctions.ExecuteAppFunctionRequest;
import android.app.appfunctions.ExecuteAppFunctionResponse;
import android.app.appsearch.GenericDocument;
import android.content.pm.SigningInfo;
import android.os.CancellationSignal;
import android.os.OutcomeReceiver;
import androidx.annotation.RequiresApi;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

/**
 * Android 16 (API 36+) native AppFunctionService exposing narrow task capabilities to Gemini
 * and system orchestration.
 * <p>
 * Bound and protected by {@code android.permission.BIND_APP_FUNCTION_SERVICE} to ensure only the
 * authorized Android system framework can bind and invoke functions.
 */
@RequiresApi(36)
public final class ArshnazAppFunctionService extends AppFunctionService {

    @Override
    public void onExecuteFunction(
            ExecuteAppFunctionRequest request,
            String callingPackage,
            SigningInfo callingSigningInfo,
            CancellationSignal cancellationSignal,
            OutcomeReceiver<ExecuteAppFunctionResponse, AppFunctionException> callback) {

        // 1. Check feature-gate option (default: enabled)
        if (!AgendaData.options(this).getBoolean("appFunctionsEnabled", true)) {
            callback.onError(new AppFunctionException(
                AppFunctionException.ERROR_DISABLED,
                "AppFunctions are disabled in app settings."));
            return;
        }

        if (request == null) {
            callback.onError(new AppFunctionException(
                AppFunctionException.ERROR_INVALID_ARGUMENT,
                "Request cannot be null."));
            return;
        }

        String functionId = request.getFunctionIdentifier();
        GenericDocument paramsDoc = request.getParameters();
        Map<String, Object> params = extractParameters(paramsDoc);

        // 2. Dispatch through the bounded task engine
        AppFunctionTaskDispatcher.Result result = AppFunctionTaskDispatcher.dispatch(this, functionId, params);

        if (!result.success) {
            int errorCode = mapErrorCode(result.errorCode);
            callback.onError(new AppFunctionException(errorCode, result.errorMessage));
            return;
        }

        GenericDocument responseDoc = buildResponseDocument(result);
        callback.onResult(new ExecuteAppFunctionResponse(responseDoc));
    }

    private Map<String, Object> extractParameters(GenericDocument doc) {
        Map<String, Object> map = new HashMap<>();
        if (doc == null) return map;

        Set<String> propertyNames = doc.getPropertyNames();
        if (propertyNames == null) return map;

        for (String key : propertyNames) {
            String[] strArr = doc.getPropertyStringArray(key);
            if (strArr != null && strArr.length > 0) {
                map.put(key, strArr[0]);
                continue;
            }
            long[] longArr = doc.getPropertyLongArray(key);
            if (longArr != null && longArr.length > 0) {
                map.put(key, longArr[0]);
                continue;
            }
            boolean[] boolArr = doc.getPropertyBooleanArray(key);
            if (boolArr != null && boolArr.length > 0) {
                map.put(key, boolArr[0]);
            }
        }
        return map;
    }

    private GenericDocument buildResponseDocument(AppFunctionTaskDispatcher.Result result) {
        GenericDocument.Builder<?> builder = new GenericDocument.Builder<>("", "result", "TaskFunctionResponse");
        if (result.data != null) {
            Iterator<String> keys = result.data.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object val = result.data.opt(key);
                if (val instanceof Boolean) {
                    builder.setPropertyBoolean(key, (Boolean) val);
                } else if (val instanceof Number) {
                    builder.setPropertyLong(key, ((Number) val).longValue());
                } else if (val != null) {
                    builder.setPropertyString(key, val.toString());
                }
            }
        }
        if (!result.items.isEmpty()) {
            GenericDocument[] docItems = new GenericDocument[result.items.size()];
            for (int i = 0; i < result.items.size(); i++) {
                JSONObject item = result.items.get(i);
                GenericDocument.Builder<?> itemDoc = new GenericDocument.Builder<>("", item.optString("taskId", String.valueOf(i)), "TaskItem");
                itemDoc.setPropertyString("taskId", item.optString("taskId", ""));
                itemDoc.setPropertyString("title", item.optString("title", ""));
                itemDoc.setPropertyString("dueDateTime", item.optString("dueDateTime", ""));
                itemDoc.setPropertyString("priority", item.optString("priority", "none"));
                itemDoc.setPropertyBoolean("completed", item.optBoolean("completed", false));
                itemDoc.setPropertyString("status", item.optString("status", "todo"));
                docItems[i] = itemDoc.build();
            }
            builder.setPropertyDocument("tasks", docItems);
        }
        return builder.build();
    }

    private int mapErrorCode(int dispatcherError) {
        switch (dispatcherError) {
            case AppFunctionTaskDispatcher.ERROR_INVALID_ARGUMENT:
                return AppFunctionException.ERROR_INVALID_ARGUMENT;
            case AppFunctionTaskDispatcher.ERROR_FUNCTION_NOT_FOUND:
                return AppFunctionException.ERROR_FUNCTION_NOT_FOUND;
            case AppFunctionTaskDispatcher.ERROR_APP_SESSION_REQUIRED:
                return AppFunctionException.ERROR_DISABLED;
            default:
                return AppFunctionException.ERROR_APP_UNKNOWN_ERROR;
        }
    }
}
