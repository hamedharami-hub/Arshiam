import { useState } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { ReviewSwipeCard } from "@/components/review/ReviewSwipeCard";
import { DEFAULT_GESTURES, setGestureSettings } from "@/lib/reviewSettings";

const CARDS = ["Metoprolol class?", "Ramipril MOA?", "Atorvastatin MOA?", "Propranolol caution?", "Lisinopril side effect?", "Statin monitoring?"];

function Harness() {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const push = (m: string) => setLog((l) => [...l, m]);
  return (
    <div className="p-6 max-w-md mx-auto space-y-3">
      <div data-testid="h-index">{i}</div>
      <div data-testid="h-flipped">{String(flipped)}</div>
      <ReviewSwipeCard flipped={flipped} isEn={false} className="h-56 rounded-2xl border bg-card flex items-center justify-center select-none"
        onFlip={() => { setFlipped((f) => !f); push("flip"); }}
        onRate={(r) => { push(`rate:${r}`); setI((n) => n + 1); setFlipped(false); }}
        onEdit={() => push("edit")}>
        <div className="text-lg font-bold">{flipped ? `answer ${i}` : CARDS[i % CARDS.length]}</div>
      </ReviewSwipeCard>
      <button data-testid="h-off" onClick={() => setGestureSettings({ ...DEFAULT_GESTURES, enabled: false })}>off</button>
      <button data-testid="h-on" onClick={() => setGestureSettings(DEFAULT_GESTURES)}>on</button>
      <pre data-testid="h-log">{log.join(",")}</pre>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
