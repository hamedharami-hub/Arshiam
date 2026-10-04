import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MASCOT_EVENT, useMascotMode, useMascotLook, type MascotPose } from "@/lib/mascot";
import "./AngelCompanion.css";

const POSITIONS: Record<MascotPose, string> = { celebrate: "0% 0%", tomorrow: "100% 0%", garden: "0% 100%", thinking: "100% 100%" };
export function MascotCharacter({ pose, busy = false, size = 112 }: { pose: MascotPose; busy?: boolean; size?: number }) {
  const mode = useMascotMode();
  const look = useMascotLook();
  if (mode === "off") return null;
  const image = look === "blonde" ? "angel-companion-poses" : `angel-companion-${look}`;
  return <span aria-hidden="true" className={`companion-character companion-${pose} ${busy ? "companion-busy" : ""}`} data-mode={mode} data-look={look} style={{ width: size, height: size, backgroundPosition: POSITIONS[pose], backgroundImage: `url('/images/${image}.png')` }} />;
}

export function AngelCompanion() {
  const mode = useMascotMode();
  const look = useMascotLook();
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const [pose, setPose] = useState<MascotPose | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (mode === "off") return;
    const image = new Image();
    image.src = `/images/${look === "blonde" ? "angel-companion-poses" : `angel-companion-${look}`}.png`;
  }, [look, mode]);
  useEffect(() => {
    setPose(null);
    if (mode === "off") { setPose(null); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMoment = (event: Event) => {
      const next = (event as CustomEvent<MascotPose>).detail;
      if (!Object.prototype.hasOwnProperty.call(POSITIONS, next) || Date.now() - last.current < 6000) return;
      last.current = Date.now();
      setPose(next);
      clearTimeout(timer);
      timer = setTimeout(() => setPose(null), mode === "calm" ? 1800 : 3000);
    };
    window.addEventListener(MASCOT_EVENT, onMoment);
    return () => { clearTimeout(timer); window.removeEventListener(MASCOT_EVENT, onMoment); };
  }, [mode]);
  if (!pose || mode === "off") return null;
  const labels = { celebrate: en ? "One lovely step forward!" : "یک قدم قشنگ جلو رفتی!", tomorrow: en ? "See you tomorrow!" : "برای فردا آماده‌ست!", garden: en ? "Your garden is growing!" : "باغت داره بزرگ می‌شه!", thinking: en ? "Let's think together." : "با هم فکر کنیم." };
  return <aside className="companion-moment" data-mode={mode} key={pose} role="status" aria-live="polite">
    <button className="companion-dismiss" onClick={() => setPose(null)} aria-label={en ? "Dismiss companion" : "بستن فرشته"}>×</button>
    <MascotCharacter pose={pose} busy={pose === "thinking"} />
    <span className="companion-caption">{labels[pose]}</span>
  </aside>;
}
