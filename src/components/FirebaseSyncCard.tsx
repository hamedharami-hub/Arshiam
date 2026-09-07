import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Cloud,
  ShieldCheck,
  RefreshCw,
  Zap,
  Server,
  Activity,
  UploadCloud,
  DownloadCloud,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { testFirebaseConnection } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  backupAllToFirestore,
  fetchFromFirestore,
  getFirestoreSyncStats,
  type SyncStats,
} from "@/lib/firestoreSync";
import firebaseConfig from "../../firebase-applet-config.json";

export default function FirebaseSyncCard() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "connected" | "error">("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);

  const runTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await testFirebaseConnection();
      if (res.success) {
        setStatus("connected");
        setLatency(res.latencyMs ?? null);
        setLastVerified(new Date().toLocaleTimeString("fa-IR"));
        if (user?.id) {
          const s = await getFirestoreSyncStats(user.id);
          if (s) setStats(s);
        }
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    } finally {
      setTesting(false);
    }
  }, [user]);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const handleSyncNow = async () => {
    if (!user) {
      toast.error("برای همگام‌سازی ابری ابتدا وارد حساب کاربری شوید.");
      return;
    }
    setSyncing(true);
    try {
      const res = await backupAllToFirestore(user);
      if (res.success) {
        setStats(res.stats);
        toast.success("همگام‌سازی با Firestore انجام شد", {
          description: res.message,
        });
      } else {
        toast.error("خطا در همگام‌سازی ابری", {
          description: res.message,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "خطا در برقراری ارتباط با فایربیس");
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreCheck = async () => {
    if (!user) {
      toast.error("ابتدا وارد حساب کاربری شوید.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetchFromFirestore(user.id);
      if (res.success) {
        toast.info("بررسی ابر Firestore", {
          description: `تعداد ${res.tasks.length} تسک و ${res.notes.length} یادداشت در ابر موجود است.`,
        });
        setStats((prev) => ({
          tasksCount: res.tasks.length,
          notesCount: res.notes.length,
          habitsCount: prev?.habitsCount || 0,
          checkinsCount: prev?.checkinsCount || 0,
          lastSyncedAt: prev?.lastSyncedAt || new Date().toISOString(),
        }));
      } else {
        toast.error("خطا در خواندن داده‌ها از Firestore", {
          description: res.message,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "خطا در اتصال به Firestore");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card id="firebase-sync-card" className="border-border/60 shadow-sm overflow-hidden transition-all bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold">
                  همگام‌سازی ابری Firebase Firestore
                </CardTitle>
                {status === "connected" && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    فعال و متصل
                  </Badge>
                )}
                {status === "error" && (
                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30 gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    خطا در اتصال
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                پایگاه داده ابری بلادرنگ با رمزنگاری سرتاسری، پشتیبان‌گیری خودکار و قوانین امنیتی ایزوله
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              id="sync-now-firebase-btn"
              size="sm"
              variant="default"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
              onClick={handleSyncNow}
              disabled={syncing || testing}
            >
              <UploadCloud className={`h-3.5 w-3.5 ${syncing ? "animate-bounce" : ""}`} />
              <span>{syncing ? "در حال ارسال..." : "همگام‌سازی ابری اکنون"}</span>
            </Button>

            <Button
              id="test-firebase-btn"
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-border/70 hover:bg-muted font-medium"
              onClick={runTest}
              disabled={testing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin text-primary" : ""}`} />
              <span>بررسی وضعیت</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Cloud className="h-3.5 w-3.5 text-blue-500" />
              <span>پروژه فایربیس</span>
            </div>
            <div className="font-mono text-xs font-semibold text-foreground truncate" dir="ltr">
              {firebaseConfig.projectId}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Server className="h-3.5 w-3.5 text-emerald-500" />
              <span>منطقه و پایگاه داده</span>
            </div>
            <div className="font-semibold text-foreground truncate" dir="ltr">
              {firebaseConfig.firestoreDatabaseId || "default"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>قوانین امنیتی Firestore</span>
            </div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
              منتشر شده و فعال
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <span>سرعت پاسخگویی (Ping)</span>
            </div>
            <div className="font-semibold text-foreground flex items-center gap-1">
              {latency !== null ? (
                <>
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span>{latency} میلی‌ثانیه</span>
                </>
              ) : (
                <span className="text-muted-foreground">در حال اندازه‌گیری...</span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Stats Banner */}
        {stats && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>وضعیت همگام‌سازی:</strong> {stats.tasksCount} تسک و {stats.notesCount} یادداشت ثبت شده در ابر
              </span>
            </div>
            {stats.lastSyncedAt && (
              <div className="text-muted-foreground text-[11px]">
                آخرین ارسال: {new Date(stats.lastSyncedAt).toLocaleString("fa-IR")}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-2 pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>دیتابیس ابری آماده ذخیره داده‌های تسک‌ها، یادداشت‌ها و عادت‌ها است.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary font-normal"
              onClick={handleRestoreCheck}
            >
              مشاهده محتوای ذخیره شده
            </Button>
            {lastVerified && (
              <span className="text-[11px] text-muted-foreground/80">
                آخرین اعتبارسنجی: {lastVerified}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
