import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Scope = "tasks:read" | "tasks:create" | "tasks:update" | "tasks:delete";
type Grant = { id: string; name: string; scopes: Scope[]; createdAt: string; expiresAt: string; revokedAt: string | null };
const scopeLabels: Record<Scope, string> = {
  "tasks:read": "Read tasks and plans / خواندن تسک‌ها و برنامه‌ها",
  "tasks:create": "Add tasks / افزودن تسک",
  "tasks:update": "Edit tasks / ویرایش تسک",
  "tasks:delete": "Delete tasks / حذف تسک",
};

async function request(path: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to manage assistant access.");
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Request failed.");
  return body;
}

export function AssistantAccessSettings() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [scopes, setScopes] = useState<Scope[]>(["tasks:read", "tasks:create", "tasks:update"]);
  const [newToken, setNewToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const result = await request("/api/assistant-access");
    setGrants(result.data);
  };
  useEffect(() => { void refresh().catch((e) => setError(e.message)); }, []);

  const toggleScope = (scope: Scope, checked: boolean) => {
    setScopes((previous) => checked ? [...previous, scope] : previous.filter((item) => item !== scope));
  };

  const create = async () => {
    setBusy(true); setError(""); setNewToken("");
    try {
      const result = await request("/api/assistant-access", {
        method: "POST", body: JSON.stringify({ name, scopes, expiresInDays: days }),
      });
      setNewToken(result.token);
      setName("");
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    setBusy(true); setError("");
    try {
      await request(`/api/assistant-access/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return <section className="rounded-xl border p-4 space-y-4">
    <div>
      <h2 className="text-lg font-semibold">Assistant access / دسترسی دستیار</h2>
      <p className="text-sm text-muted-foreground">Each access belongs only to your account. Choose permissions and revoke it here at any time. The token is shown only once.</p>
    </div>
    <div className="space-y-2">
      <label htmlFor="assistant-access-name" className="text-sm">Access name / نام دسترسی</label>
      <Input id="assistant-access-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Codex job search" maxLength={80} />
      <label htmlFor="assistant-access-days" className="text-sm">Expires after days / اعتبار به روز</label>
      <Input id="assistant-access-days" type="number" min={1} max={365} value={days} onChange={(event) => setDays(Number(event.target.value))} />
    </div>
    <div className="space-y-2">
      {(Object.keys(scopeLabels) as Scope[]).map((scope) => <label key={scope} className="flex items-center gap-2 text-sm">
        <Checkbox checked={scopes.includes(scope)} onCheckedChange={(checked) => toggleScope(scope, checked === true)} />
        {scopeLabels[scope]}
      </label>)}
    </div>
    <Button disabled={busy || !name.trim() || scopes.length === 0} onClick={create}>Create access / ساخت دسترسی</Button>
    {newToken && <div className="rounded border p-3 space-y-2">
      <p className="text-sm font-medium">Copy this token now. It will not be displayed again. / کلید را همین حالا کپی کن؛ دوباره نمایش داده نمی‌شود.</p>
      <Input value={newToken} readOnly aria-label="New assistant token" dir="ltr" />
      <Button variant="outline" onClick={() => void navigator.clipboard.writeText(newToken)}>Copy token / کپی کلید</Button>
      <Button variant="ghost" onClick={() => setNewToken("")}>Hide / پنهان‌کردن</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="space-y-2">
      <h3 className="font-medium">Existing access / دسترسی‌های موجود</h3>
      {grants.length === 0 && <p className="text-sm text-muted-foreground">No assistant access yet.</p>}
      {grants.map((grant) => <div key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
        <div><strong>{grant.name}</strong><p className="text-muted-foreground">{grant.scopes.join(", ")} · expires {new Date(grant.expiresAt).toLocaleDateString()}</p></div>
        {grant.revokedAt ? <span>Revoked / لغوشده</span> : <Button variant="destructive" size="sm" disabled={busy} onClick={() => void revoke(grant.id)}>Revoke / لغو</Button>}
      </div>)}
    </div>
  </section>;
}
