import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Sparkles, 
  Droplets, 
  Sun, 
  Cloud, 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Award, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getGardenState, saveGardenState, type GardenState } from "@/lib/garden";
import { db, doc, setDoc, getDoc, serverTimestamp } from "@/lib/firebase";

export default function CaravanView() {
  const { user } = useAuth();
  const [garden, setGarden] = useState<GardenState>(getGardenState);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
  const [caravanEssence, setCaravanEssence] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync garden state from Arshnaz events
  useEffect(() => {
    const onGardenUpdate = (e: Event) => {
      const updated = (e as CustomEvent<GardenState>).detail || getGardenState();
      setGarden(updated);
    };
    window.addEventListener("arshnaz-garden-updated", onGardenUpdate);
    return () => window.removeEventListener("arshnaz-garden-updated", onGardenUpdate);
  }, []);

  // Listen to postMessage events from the 3D Caravan game
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, data } = event.data;

      if (type === "CARAVAN_READY") {
        sendStateToGame();
      } else if (type === "CARAVAN_STATE_UPDATE") {
        if (typeof data?.essence === "number") {
          setCaravanEssence(data.essence);
        }
      } else if (type === "CARAVAN_REQUEST_SYNC_CLOUD") {
        handleSaveToCloud(data);
      } else if (type === "CARAVAN_MILESTONE_RESTORED") {
        // Award bonus water drops in Arshnaz when user restores the Silent Garden!
        const current = getGardenState();
        const updated = {
          ...current,
          waterDrops: current.waterDrops + 50,
          sunEnergy: current.sunEnergy + 25,
          totalHarvests: current.totalHarvests + 1,
        };
        saveGardenState(updated);
        toast.success("✨ پاداش احیای باغ خاموش در کاروان!", {
          description: "+۵۰ قطره آب و +۲۵ انرژی خورشید به باغچهٔ ارشناز شما افزوده شد.",
          duration: 5000,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  // Send current Arshnaz points and user profile to Caravan game iframe
  const sendStateToGame = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    const currentGarden = getGardenState();
    iframeRef.current.contentWindow.postMessage({
      type: "ARSHNAZ_SYNC_STATE",
      data: {
        userId: user?.uid || null,
        userName: user?.displayName || user?.email || "مسافر کاروان",
        waterDrops: currentGarden.waterDrops,
        sunEnergy: currentGarden.sunEnergy,
        focusBlossoms: currentGarden.focusBlossoms || 0,
        gardenLevel: currentGarden.gardenLevel || 1,
        activePlant: currentGarden.activePlant?.name || null,
      }
    }, "*");
  }, [user]);

  // Handle converting 10 Arshnaz Sun Energy into 10 Caravan Light Essence
  const handleConvertSunToEssence = () => {
    const current = getGardenState();
    if (current.sunEnergy < 10) {
      toast.error("انرژی خورشید کافی نیست", {
        description: "حداقل به ۱۰ واحد انرژی خورشید نیاز دارید. با انجام تسک‌ها انرژی کسب کنید!",
      });
      return;
    }

    const updated = {
      ...current,
      sunEnergy: current.sunEnergy - 10,
    };
    saveGardenState(updated);
    setGarden(updated);

    // Send converted essence to the game iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "ARSHNAZ_AWARD_ESSENCE",
        amount: 10,
        reason: "تبدیل انرژی خورشید ارشناز",
      }, "*");
    }

    toast.success("✦ تبدیل موفق امتیاز ارشناز!", {
      description: "۱۰ واحد انرژی خورشید ارشناز به ۱۰ گوهر نور در کاروان تبدیل شد.",
    });
  };

  // Handle saving caravan state to Firebase Firestore
  const handleSaveToCloud = async (overrideData?: any) => {
    if (!user?.uid) {
      toast.error("ابتدا وارد حساب ارشناز شوید", {
        description: "برای همگام‌سازی ابری فایربیس، لطفاً وارد حساب کاربری خود شوید.",
      });
      return;
    }

    setSyncingCloud(true);
    try {
      // Get game state from localStorage or overrideData
      let caravanRaw = overrideData;
      if (!caravanRaw) {
        const raw = localStorage.getItem("caravan_personal_world_v1");
        if (raw) caravanRaw = JSON.parse(raw);
      }

      if (caravanRaw) {
        const saveDocRef = doc(db, "users", user.uid, "caravan_profile", "save_v1");
        await setDoc(saveDocRef, {
          ...caravanRaw,
          userId: user.uid,
          updatedAt: serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
          arshnazGardenLevel: garden.gardenLevel,
        }, { merge: true });

        const nowStr = new Date().toLocaleTimeString("fa-IR");
        setLastCloudSync(nowStr);
        toast.success("☁️ ذخیرهٔ ابری فایربیس با موفقیت ثبت شد", {
          description: `اطلاعات و دنیای سه‌بعدی شما در ساعت ${nowStr} در فایربیس ذخیره شد.`,
        });

        // Notify iframe
        iframeRef.current?.contentWindow?.postMessage({
          type: "ARSHNAZ_CLOUD_SAVED",
          time: nowStr,
        }, "*");
      }
    } catch (err: any) {
      console.error("Firebase caravan save failed:", err);
      toast.error("خطا در همگام‌سازی با فایربیس", {
        description: err?.message || "اتصال اینترنت را بررسی کنید.",
      });
    } finally {
      setSyncingCloud(false);
    }
  };

  // Handle restoring caravan state from Firebase Firestore
  const handleRestoreFromCloud = async () => {
    if (!user?.uid) {
      toast.error("ابتدا وارد حساب شوید");
      return;
    }

    setSyncingCloud(true);
    try {
      const saveDocRef = doc(db, "users", user.uid, "caravan_profile", "save_v1");
      const snap = await getDoc(saveDocRef);
      if (!snap.exists()) {
        toast.info("هنوز ذخیرهٔ ابری در فایربیس یافت نشد", {
          description: "دکمهٔ «ذخیره در ابر» را بزنید تا پیشرفت شما ذخیره شود.",
        });
        return;
      }

      const cloudData = snap.data();
      localStorage.setItem("caravan_personal_world_v1", JSON.stringify(cloudData));

      // Reload or notify game
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: "ARSHNAZ_CLOUD_LOADED",
          data: cloudData,
        }, "*");
      }

      toast.success("📥 پیشرفت بازی از فایربیس بازگردانی شد!");
    } catch (err: any) {
      console.error("Firebase restore failed:", err);
      toast.error("خطا در بازیابی از فایربیس");
    } finally {
      setSyncingCloud(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col w-full bg-slate-950 text-slate-100 ${
        isFullscreen ? "h-screen fixed inset-0 z-50" : "h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-amber-900/30 shadow-2xl"
      }`}
    >
      {/* Top HUD Bridge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>کاروان رؤیاها</span>
            <span className="text-[10px] text-amber-400/70 font-normal hidden sm:inline">· فصل یک: ریشه‌های نور</span>
          </div>

          <Badge variant="outline" className="bg-amber-950/40 border-amber-600/40 text-amber-300 gap-1 text-[11px] px-2 py-0.5">
            ✧ {caravanEssence} گوهر نور
          </Badge>
        </div>

        {/* Arshnaz Live Points and Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Live Arshnaz Points Badges */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 text-[10px]">امتیازهای ارشناز:</span>
            <span className="flex items-center gap-0.5 text-sky-400 font-semibold" title="قطره‌های آب ارشناز">
              <Droplets className="w-3.5 h-3.5" />
              {garden.waterDrops}
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-0.5 text-amber-400 font-semibold" title="انرژی خورشید ارشناز">
              <Sun className="w-3.5 h-3.5" />
              {garden.sunEnergy}
            </span>
            {garden.focusBlossoms > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-0.5 text-rose-400 font-semibold" title="شکوفه‌های تمرکز پومودورو">
                  <Award className="w-3.5 h-3.5" />
                  {garden.focusBlossoms}
                </span>
              </>
            )}
          </div>

          {/* Quick Convert Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertSunToEssence}
            disabled={garden.sunEnergy < 10}
            className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"
            title="تبدیل ۱۰ انرژی خورشید به ۱۰ گوهر نور در کاروان"
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>تبدیل ۱۰ انرژی خورشید</span>
          </Button>

          {/* Cosmic Galaxy Navigation Shortcuts */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              iframeRef.current?.contentWindow?.postMessage({ type: "ARSHNAZ_OPEN_GALAXY" }, "*");
            }}
            className="h-7 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30 gap-1"
            title="نقشه کهکشان و سیارات"
          >
            <span>🌌 کهکشان</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              iframeRef.current?.contentWindow?.postMessage({ type: "ARSHNAZ_GO_CODERS" }, "*");
              toast.info("💻 پرواز به سوی سیارهٔ کدنویس‌ها", {
                description: "کالبدهای تیره و انگشتان نور در حال کامپایل واقعیت هستند."
              });
            }}
            className="h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"
            title="سیارهٔ کدنویس‌ها · آرتاک"
          >
            <span>💻 کدنویس‌ها</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              iframeRef.current?.contentWindow?.postMessage({ type: "ARSHNAZ_GO_ANJEERAN" }, "*");
              toast.info("⎊ پرواز به سوی سیارهٔ انجیران", {
                description: "مهندسان معلق در حال ساخت قطعات سازهٔ چشم بزرگ هستند."
              });
            }}
            className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1"
            title="سیارهٔ انجیران · مهراسپند"
          >
            <span>⎊ انجیران</span>
          </Button>

          {/* Cloud Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSaveToCloud()}
            disabled={syncingCloud || !user}
            className="h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"
            title={user ? "ذخیره در سرور ابری فایربیس ارشناز" : "ابتدا وارد حساب شوید"}
          >
            {syncingCloud ? (
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
            ) : (
              <Cloud className="w-3 h-3 text-emerald-400" />
            )}
            <span className="hidden sm:inline">ذخیره در فایربیس</span>
          </Button>

          {/* Fullscreen Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-7 w-7 text-slate-400 hover:text-slate-100"
            title={isFullscreen ? "خروج از تمام‌صفحه" : "حالت تمام‌صفحه"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          {/* Open Standalone in New Tab */}
          <a
            href="/caravan/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-100 p-1"
            title="باز کردن در پنجرهٔ مجزا"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main 3D Game Canvas Iframe */}
      <div className="flex-1 w-full h-full relative bg-black">
        <iframe
          ref={iframeRef}
          src="/caravan/index.html"
          className="w-full h-full border-0 block"
          title="کاروان رؤیاها · ریشه‌های نور"
          allow="autoplay; fullscreen"
          onLoad={sendStateToGame}
        />
      </div>
    </div>
  );
}
