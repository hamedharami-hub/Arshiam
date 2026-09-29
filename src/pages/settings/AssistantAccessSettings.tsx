import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Key,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  FolderTree,
  BookOpen,
  CheckSquare,
  Clock,
  Trash2,
  Terminal,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type Scope =
  | "tasks:read"
  | "tasks:write"
  | "folders:read"
  | "folders:write"
  | "memories:read"
  | "memories:write"
  | "calendar:read"
  | "calendar:write";

export interface Grant {
  id: string;
  name: string;
  scopes: Scope[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string | null;
  revokedAt: string | null;
}

const SCOPE_GROUPS = [
  {
    id: "tasks",
    titleFa: "مدیریت وظایف (Tasks)",
    titleEn: "Task Management",
    icon: CheckSquare,
    scopes: [
      { id: "tasks:read" as Scope, labelFa: "خواندن وظایف و جزئیات", labelEn: "Read tasks & details" },
      { id: "tasks:write" as Scope, labelFa: "ساخت، ویرایش و تکمیل وظایف", labelEn: "Create, edit & complete tasks" },
    ],
  },
  {
    id: "folders",
    titleFa: "فولدرها و فهرست‌ها (Folders)",
    titleEn: "Folders & Lists",
    icon: FolderTree,
    scopes: [
      { id: "folders:read" as Scope, labelFa: "خواندن فولدرها و ساختار", labelEn: "Read folders & hierarchy" },
      { id: "folders:write" as Scope, labelFa: "ساخت و ویرایش فولدرها", labelEn: "Create & edit folders" },
    ],
  },
  {
    id: "memories",
    titleFa: "خاطرات و یادداشت‌ها (Memories & Notes)",
    titleEn: "Memories & Notes",
    icon: BookOpen,
    scopes: [
      { id: "memories:read" as Scope, labelFa: "خواندن خاطرات و یادداشت‌ها", labelEn: "Read notes & memories" },
      { id: "memories:write" as Scope, labelFa: "ثبت و ویرایش خاطره یا یادداشت", labelEn: "Create & edit notes/memories" },
    ],
  },
  {
    id: "calendar",
    titleFa: "تقویم و زمان‌بندی (Calendar & Schedule)",
    titleEn: "Calendar & Schedule",
    icon: Calendar,
    scopes: [
      { id: "calendar:read" as Scope, labelFa: "خواندن برنامه روزانه، هفتگی و ماهانه", labelEn: "Read daily/weekly/monthly schedule" },
      { id: "calendar:write" as Scope, labelFa: "ثبت رویداد و بررسی تداخل زمانی", labelEn: "Schedule events & check conflicts" },
    ],
  },
];

const ALL_SCOPES: Scope[] = [
  "tasks:read",
  "tasks:write",
  "folders:read",
  "folders:write",
  "memories:read",
  "memories:write",
  "calendar:read",
  "calendar:write",
];

const READONLY_SCOPES: Scope[] = [
  "tasks:read",
  "folders:read",
  "memories:read",
  "calendar:read",
];

async function request(path: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("لطفاً برای مدیریت عامل‌ها وارد حساب خود شوید.");
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "درخواست با خطا مواجه شد.");
  return body;
}

export function AssistantAccessSettings() {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [grants, setGrants] = useState<Grant[]>([]);
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [scopes, setScopes] = useState<Scope[]>(ALL_SCOPES);
  const [newToken, setNewToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const baseApiUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/agent`
      : "https://your-domain.com/api/v1/agent";

  const refresh = async () => {
    try {
      const result = await request("/api/assistant-access");
      setGrants(result.data || []);
    } catch (err: any) {
      toast.error(err.message || "خطا در بارگیری توکن‌ها");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggleScope = (scope: Scope, checked: boolean) => {
    setScopes((prev) => (checked ? [...prev, scope] : prev.filter((s) => s !== scope)));
  };

  const createToken = async () => {
    if (!name.trim()) {
      toast.error(T("لطفاً یک نام برای توکن عامل وارد کنید", "Please enter a token name"));
      return;
    }
    if (scopes.length === 0) {
      toast.error(T("حداقل یک مجوز باید انتخاب شود", "Select at least one scope"));
      return;
    }

    setBusy(true);
    setNewToken("");
    try {
      const result = await request("/api/assistant-access", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), scopes, expiresInDays: days }),
      });
      setNewToken(result.token);
      setName("");
      toast.success(T("توکن عامل هوش مصنوعی با موفقیت ساخته شد", "AI agent token created successfully"));
      await refresh();
    } catch (err: any) {
      toast.error(err.message || T("خطا در ایجاد توکن", "Failed to create token"));
    } finally {
      setBusy(false);
    }
  };

  const revokeToken = async (id: string) => {
    setBusy(true);
    try {
      await request(`/api/assistant-access/${id}`, { method: "DELETE" });
      toast.success(T("توکن با موفقیت لغو و غیرفعال شد", "Token successfully revoked"));
      await refresh();
    } catch (err: any) {
      toast.error(err.message || T("خطا در لغو توکن", "Failed to revoke token"));
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text: string, isToken: boolean) => {
    void navigator.clipboard.writeText(text);
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.success(T("توکن کپی شد", "Token copied to clipboard"));
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast.success(T("آدرس API کپی شد", "API URL copied"));
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6 shadow-xs animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {T("اتصال عامل‌های هوش مصنوعی (AI Agents)", "AI Agent Connections")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {T(
                "ایجاد توکن شخصی اختصاصی برای اتصال عامل‌های هوشمند به وظایف، تقویم و خاطرات حساب شما",
                "Create personal tokens for AI agents to securely interact with your tasks, calendar, and memories"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Base API URL Info Card */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            {T("آدرس پایه API اختصاصی عامل", "Base Agent API URL")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(baseApiUrl, false)}
            className="h-7 text-xs px-2.5 gap-1 text-primary hover:bg-primary/10 rounded-lg"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? T("کپی شد", "Copied") : T("کپی آدرس", "Copy URL")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/40 font-mono text-xs text-foreground select-all" dir="ltr">
          <span className="truncate">{baseApiUrl}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {T(
            "عامل شما باید درخواست‌ها را با هدر Authorization: Bearer <TOKEN> ارسال کند.",
            "Your agent must provide Authorization: Bearer <TOKEN> header on all requests."
          )}
        </p>
      </div>

      {/* Token Creation Card */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" />
            {T("ساخت توکن دسترسی جدید", "Create New Access Token")}
          </h3>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScopes(ALL_SCOPES)}
              className="h-6 text-[11px] px-2 rounded-md"
            >
              {T("دسترسی کامل", "Full Access")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScopes(READONLY_SCOPES)}
              className="h-6 text-[11px] px-2 rounded-md"
            >
              {T("فقط‌خواندنی", "Read-Only")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {T("نام توکن / عامل *", "Token / Agent Name *")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={T("مثلاً: Claude Code یا Gemini Assistant", "e.g. My Personal AI Agent")}
              className="h-9 text-xs"
              maxLength={80}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {T("مدت اعتبار (روز)", "Expires In (Days)")}
            </label>
            <div className="flex items-center gap-1.5">
              {[30, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`flex-1 h-9 rounded-lg border text-xs font-medium transition ${
                    days === d
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d} {T("روز", "d")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scopes Selection */}
        <div className="space-y-3 pt-1 border-t border-border/40">
          <label className="text-xs font-semibold text-foreground block">
            {T("مجوزهای دسترسی (Scopes)", "Access Permissions (Scopes)")}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCOPE_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.id} className="p-3 rounded-xl bg-muted/25 border border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? group.titleEn : group.titleFa}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.scopes.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none"
                      >
                        <Checkbox
                          checked={scopes.includes(s.id)}
                          onCheckedChange={(checked) => toggleScope(s.id, checked === true)}
                          className="mt-0.5"
                        />
                        <span className="leading-tight">{isEn ? s.labelEn : s.labelFa}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          disabled={busy || !name.trim() || scopes.length === 0}
          onClick={createToken}
          className="w-full sm:w-auto h-9 text-xs px-5 gap-1.5 rounded-xl"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{T("ایجاد توکن دسترسی عامل", "Generate Agent Token")}</span>
        </Button>
      </div>

      {/* Newly Created Token Display (Shown Once) */}
      {newToken && (
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {T(
                  "توکن جدید با موفقیت ایجاد شد — این کلید را همین حالا ذخیره کنید!",
                  "Token created successfully — Save this secret key now!"
                )}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {T(
                  "برای امنیت حساب، این کلید تنها یک‌بار به شما نمایش داده می‌شود و هرگز دوباره قابل مشاهده نخواهد بود.",
                  "For your security, this raw token will only be shown once and cannot be retrieved later."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newToken}
              readOnly
              dir="ltr"
              className="font-mono text-xs bg-background border-emerald-500/30 text-emerald-700 dark:text-emerald-300 h-9"
            />
            <Button
              type="button"
              onClick={() => copyToClipboard(newToken, true)}
              className="h-9 px-3 gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-xs">{copiedToken ? T("کپی شد", "Copied") : T("کپی کلید", "Copy Token")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Existing Tokens List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span>{T("توکن‌های عامل‌های ثبت‌شده", "Registered Agent Tokens")}</span>
            <span className="text-xs text-muted-foreground">({grants.length})</span>
          </h3>
        </div>

        {grants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
            <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {T(
                "هنوز هیچ توکنی برای عامل‌های هوش مصنوعی ایجاد نکرده‌اید.",
                "No agent access tokens have been created yet."
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {grants.map((grant) => {
              const isRevoked = Boolean(grant.revokedAt);
              const isExpired = Date.parse(grant.expiresAt) <= Date.now();
              const isActive = !isRevoked && !isExpired;

              return (
                <div
                  key={grant.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? "bg-card border-border/70 hover:border-primary/40 shadow-xs"
                      : "bg-muted/20 border-border/40 opacity-75"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate">{grant.name}</span>
                      {isActive && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          {T("فعال", "Active")}
                        </Badge>
                      )}
                      {isRevoked && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                          {T("لغوشده", "Revoked")}
                        </Badge>
                      )}
                      {!isRevoked && isExpired && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          {T("منقضی‌شده", "Expired")}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {grant.scopes.map((scope) => (
                        <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono">
                          {scope}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {T("انقضا:", "Expires:")} {new Date(grant.expiresAt).toLocaleDateString()}
                        </span>
                      </span>
                      {grant.lastUsedAt && (
                        <span>
                          {T("آخرین استفاده:", "Last used:")} {new Date(grant.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void revokeToken(grant.id)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{T("لغو دسترسی", "Revoke")}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
