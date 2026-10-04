import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "./SectionCard";
import { PROVIDER_INFO, type Provider } from "@/lib/aiSettings";
import {
  KEYED_PROVIDERS, aiErrorMessage, deleteProviderKey, getProviderKey, maskKey, saveProviderKey, testProviderKey,
  type KeyedProvider, type KeyTestResult,
} from "@/lib/aiProviders";

type Outcome = { kind: "ok" | "error"; text: string };

function ProviderKeyRow({ provider, isEn, model }: { provider: KeyedProvider; isEn: boolean; model: string }) {
  const [saved, setSaved] = useState(() => getProviderKey(provider as Provider));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const lang = isEn ? "en" : "fa";
  const label = PROVIDER_INFO[provider].label;

  const save = () => {
    saveProviderKey(provider, draft);
    setSaved(getProviderKey(provider as Provider));
    setDraft("");
    setOutcome({ kind: "ok", text: isEn ? "Key saved on this device." : "کلید روی این دستگاه ذخیره شد." });
  };
  const remove = () => {
    deleteProviderKey(provider);
    setSaved("");
    setOutcome({ kind: "ok", text: isEn ? "Key deleted." : "کلید حذف شد." });
  };
  const test = async () => {
    const key = draft.trim() || saved;
    if (!key) { setOutcome({ kind: "error", text: aiErrorMessage("invalid_key", lang, { provider: label }) }); return; }
    setBusy(true); setOutcome(null);
    const result: KeyTestResult = await testProviderKey(provider, key, model);
    setBusy(false);
    if (!result.ok) { setOutcome({ kind: "error", text: aiErrorMessage(result.kind ?? "unknown", lang, { provider: label }) }); return; }
    if (result.modelAvailable === false) {
      setOutcome({ kind: "error", text: (isEn ? "Key is valid. " : "کلید معتبر است. ") + aiErrorMessage("model_unavailable", lang, { provider: label, model, fallback: result.fallback }) });
      return;
    }
    setOutcome({ kind: "ok", text: isEn ? "Key is valid." : "کلید معتبر است." });
  };

  return (
    <div className="space-y-2 border-b border-border/60 py-3 last:border-b-0" data-testid={`ai-key-row-${provider}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground" dir="ltr" data-testid={`ai-key-mask-${provider}`}>
          {saved ? maskKey(saved) : (isEn ? "No key saved" : "کلیدی ذخیره نشده")}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input type="password" autoComplete="off" dir="ltr" value={draft} onChange={e => setDraft(e.target.value)} placeholder={saved ? (isEn ? "Replace key…" : "جایگزینی کلید…") : "API key"} aria-label={`${label} API key`} className="min-w-0 flex-1 basis-48" data-testid={`ai-key-input-${provider}`} />
        <Button type="button" size="sm" onClick={save} disabled={!draft.trim()} data-testid={`ai-key-save-${provider}`}>{isEn ? "Save" : "ذخیره"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={test} disabled={busy} data-testid={`ai-key-test-${provider}`}>
          {busy && <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}{isEn ? "Test key" : "تست کلید"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={!saved} aria-label={isEn ? `Delete ${label} key` : `حذف کلید ${label}`} data-testid={`ai-key-delete-${provider}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
      </div>
      {outcome && (
        <p role={outcome.kind === "error" ? "alert" : "status"} data-testid={`ai-key-result-${provider}`} data-kind={outcome.kind} className={`flex items-start gap-2 text-xs leading-6 ${outcome.kind === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
          {outcome.kind === "error" ? <XCircle className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span>{outcome.text}</span>
        </p>
      )}
    </div>
  );
}

export function AIProviderKeysCard({ isEn }: { isEn: boolean }) {
  return (
    <SectionCard
      icon={KeyRound}
      title={isEn ? "Provider keys" : "کلید هر سرویس"}
      description={isEn ? "Each provider has its own key, stored only in this browser's localStorage. Keys are never sent anywhere except the provider you test or call." : "هر سرویس کلید جداگانه دارد و فقط در localStorage همین مرورگر می‌ماند. کلید فقط به همان سرویسی که تست یا صدا می‌زنی ارسال می‌شود."}
    >
      <div>{KEYED_PROVIDERS.map(p => <ProviderKeyRow key={p} provider={p} isEn={isEn} model={PROVIDER_INFO[p].defaultModel} />)}</div>
    </SectionCard>
  );
}
