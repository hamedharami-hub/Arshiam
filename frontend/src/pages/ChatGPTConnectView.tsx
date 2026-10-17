import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { auth } from "@/lib/firebase";
import { agentServerOrigin } from "@/lib/agentConnection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const labels: Record<string, [string, string]> = {
  "tasks:read": ["خواندن تسک‌ها و برنامه", "Read tasks and schedule"],
  "tasks:create": ["ساخت تسک", "Create tasks"], "tasks:update": ["ویرایش تسک", "Update tasks"],
  "folders:read": ["خواندن نام پوشه‌ها", "Read folder names"], "notes:read": ["خواندن یادداشت‌های عمومی", "Read general notes"],
  "notes:create": ["ساخت یادداشت عمومی", "Create general notes"], "notes:update": ["ویرایش یادداشت عمومی", "Update general notes"],
};
export default function ChatGPTConnectView() {
  const { user } = useAuth(); const { T, isEn } = useBilingual();
  const [params] = useSearchParams(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const scopes = (params.get("scope") || "tasks:read").split(/\s+/).filter(Boolean);
  const consent = async () => {
    if (busy || !user || !auth.currentUser) return;
    setBusy(true); setError("");
    const uid = user.id;
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${agentServerOrigin(location.origin)}/api/oauth?action=consent`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(params)) });
      const body = await response.json();
      if (!response.ok || !body.redirect) throw new Error(body.error || "Connection failed");
      if (auth.currentUser?.uid !== uid) throw new Error("Account changed");
      const redirect = new URL(body.redirect);
      if (redirect.origin !== "https://chatgpt.com") throw new Error("Invalid callback");
      location.assign(redirect.href);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); setBusy(false); }
  };
  return <Card dir={isEn ? "ltr" : "rtl"} className="m-4 p-5 space-y-4 max-w-xl">
    <h1 className="text-xl font-semibold">{T("اتصال حساب ارشیام به ChatGPT", "Connect Arshiam to ChatGPT")}</h1>
    <p>{T("این اتصال فقط به حساب فعلی و مجوزهای زیر دسترسی دارد. محتوا برای پاسخ‌گویی در اختیار ChatGPT قرار می‌گیرد؛ خاطرات و یادداشت‌های اختصاصی تسک شامل نمی‌شوند.", "This connection can access this account with the permissions below. Returned content is shared with ChatGPT; diary and task-private notes are excluded.")}</p>
    <ul className="list-disc ps-5">{scopes.map(scope => <li key={scope}>{labels[scope] ? T(...labels[scope]) : scope}</li>)}</ul>
    <p className="text-sm text-muted-foreground">{T("اعتبار اتصال ۳۰ روز است و از تنظیمات اتصال عامل‌ها قابل لغو است.", "The connection expires in 30 days and can be revoked in assistant access settings.")}</p>
    {error && <p role="alert">{error}</p>}
    <Button onClick={() => void consent()} disabled={busy || scopes.some(scope => !labels[scope])}>{busy ? T("در حال اتصال…", "Connecting…") : T("اجازه و اتصال", "Allow and connect")}</Button>
    <Button variant="outline" onClick={() => location.assign("/app/settings")}>{T("لغو", "Cancel")}</Button>
  </Card>;
}
