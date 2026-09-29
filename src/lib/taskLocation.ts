export type TaskLocationErrorCode = "unsupported" | "permission_denied" | "unavailable" | "timeout" | "unknown";

export class TaskLocationError extends Error {
  constructor(public readonly code: TaskLocationErrorCode) {
    super(code);
    this.name = "TaskLocationError";
  }
}

export function getCurrentTaskLocation(timeoutMs = 12_000): Promise<{ latitude: number; longitude: number; text: string }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new TaskLocationError("unsupported"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
          reject(new TaskLocationError("unavailable"));
          return;
        }
        const latitude = Number(coords.latitude.toFixed(6));
        const longitude = Number(coords.longitude.toFixed(6));
        resolve({ latitude, longitude, text: `${latitude}, ${longitude}` });
      },
      (error) => {
        const code: TaskLocationErrorCode = error.code === 1
          ? "permission_denied"
          : error.code === 2
            ? "unavailable"
            : error.code === 3
              ? "timeout"
              : "unknown";
        reject(new TaskLocationError(code));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function taskLocationErrorMessage(error: unknown, isEn: boolean): string {
  const code = error instanceof TaskLocationError ? error.code : "unknown";
  const messages: Record<TaskLocationErrorCode, { fa: string; en: string }> = {
    unsupported: { fa: "این دستگاه یا مرورگر از موقعیت مکانی پشتیبانی نمی‌کند.", en: "This device or browser does not support location." },
    permission_denied: { fa: "دسترسی موقعیت رد شده است؛ آن را از تنظیمات مرورگر یا برنامه فعال کنید.", en: "Location permission was denied. Enable it in the browser or app settings." },
    unavailable: { fa: "موقعیت فعلی پیدا نشد. GPS و اینترنت را بررسی کنید.", en: "Your current location could not be determined. Check GPS and connectivity." },
    timeout: { fa: "دریافت موقعیت بیش از حد طول کشید؛ دوباره تلاش کنید.", en: "Location lookup timed out. Please try again." },
    unknown: { fa: "دریافت موقعیت با خطا روبه‌رو شد.", en: "Location lookup failed." },
  };
  return isEn ? messages[code].en : messages[code].fa;
}
