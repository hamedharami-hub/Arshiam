import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { GRID_SIZE, getMaterial, getResidentCount, type BuildingType, type DayPhase, type PlacedBuilding } from "@/lib/island";

const TW = 72;
const TH = 36;
const PAD = 24;
const TOP = 90;
const CLIFF = 22;

// Illustration palette for the isometric scene (kept in one place as scene tokens).
const C = {
  grassA: "#7cc46a",
  grassB: "#6db85c",
  sand: "#ecd9a3",
  cliff: "#9b6b43",
  cliffDark: "#7d5434",
  leaf: "#4f9a4a",
  leafLight: "#6dbb5f",
  straw: "#d9b25c",
  roofRed: "#a8473a",
  roofBlue: "#3f6f9e",
  water: "#5fb4d6",
  light: "#ffe27a",
  white: "#f4f1ea",
  stripe: "#d8574a",
};

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

const pts = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");

/** Isometric box centred on (cx, cy) ground point. w = fraction of tile, h = height in px. */
function Box({ cx, cy, w, h, color, lift = 0 }: { cx: number; cy: number; w: number; h: number; color: string; lift?: number }) {
  const hw = (w * TW) / 2, hh = (w * TH) / 2;
  const b = cy - lift;
  const t = b - h;
  return (
    <g>
      <polygon points={pts([[cx - hw, b], [cx, b + hh], [cx, t + hh], [cx - hw, t]])} fill={shade(color, 0.82)} />
      <polygon points={pts([[cx, b + hh], [cx + hw, b], [cx + hw, t], [cx, t + hh]])} fill={shade(color, 0.66)} />
      <polygon points={pts([[cx, t - hh], [cx + hw, t], [cx, t + hh], [cx - hw, t]])} fill={shade(color, 1.05)} />
    </g>
  );
}

function Roof({ cx, cy, w, base, rise, color }: { cx: number; cy: number; w: number; base: number; rise: number; color: string }) {
  const hw = (w * TW) / 2, hh = (w * TH) / 2;
  const t = cy - base;
  const apex: [number, number] = [cx, t - rise];
  return (
    <g>
      <polygon points={pts([[cx - hw, t], [cx, t + hh], apex])} fill={shade(color, 0.92)} />
      <polygon points={pts([[cx, t + hh], [cx + hw, t], apex])} fill={shade(color, 0.7)} />
    </g>
  );
}

function Door({ cx, cy, color = "#5a3a22" }: { cx: number; cy: number; color?: string }) {
  return <polygon points={pts([[cx + 6, cy + 4], [cx + 12, cy + 1], [cx + 12, cy - 9], [cx + 6, cy - 6]])} fill={color} />;
}

export function renderBuilding(type: BuildingType, cx: number, cy: number): ReactNode {
  const m = (id: Parameters<typeof getMaterial>[0]) => getMaterial(id).color;
  switch (type) {
    case "tree":
      return (<g><Box cx={cx} cy={cy} w={0.1} h={12} color={m("wood")} /><circle cx={cx} cy={cy - 24} r={13} fill={C.leaf} /><circle cx={cx - 4} cy={cy - 28} r={7} fill={C.leafLight} /></g>);
    case "palm":
      return (<g><Box cx={cx} cy={cy} w={0.07} h={30} color={m("wood")} />{[-1, 1].map((d) => <ellipse key={d} cx={cx + d * 10} cy={cy - 32} rx={13} ry={4} fill={C.leaf} transform={`rotate(${d * 22} ${cx + d * 10} ${cy - 32})`} />)}<ellipse cx={cx} cy={cy - 36} rx={6} ry={8} fill={C.leafLight} /></g>);
    case "hut":
      return (<g><Box cx={cx} cy={cy} w={0.5} h={16} color={m("wood")} /><Roof cx={cx} cy={cy} w={0.6} base={16} rise={18} color={C.straw} /><Door cx={cx} cy={cy} /></g>);
    case "well":
      return (<g><Box cx={cx} cy={cy} w={0.4} h={10} color={m("stone")} /><polygon points={pts([[cx, cy - 15], [cx + 10, cy - 10], [cx, cy - 5], [cx - 10, cy - 10]])} fill={C.water} /><line x1={cx - 11} y1={cy - 10} x2={cx - 11} y2={cy - 30} stroke={m("wood")} strokeWidth={2} /><line x1={cx + 11} y1={cy - 10} x2={cx + 11} y2={cy - 30} stroke={m("wood")} strokeWidth={2} /><Roof cx={cx} cy={cy} w={0.42} base={30} rise={8} color={C.roofRed} /></g>);
    case "windmill":
      return (<g><Box cx={cx} cy={cy} w={0.42} h={34} color={m("stone")} /><Roof cx={cx} cy={cy} w={0.48} base={34} rise={14} color={C.roofRed} /><g className="island-blades" style={{ transformOrigin: `${cx + 8}px ${cy - 32}px` }}>{[0, 90, 180, 270].map((a) => <rect key={a} x={cx + 7} y={cy - 54} width={3} height={22} fill={C.white} transform={`rotate(${a} ${cx + 8} ${cy - 32})`} />)}</g><Door cx={cx} cy={cy} /></g>);
    case "house":
      return (<g><Box cx={cx} cy={cy} w={0.58} h={22} color={m("brick")} /><Roof cx={cx} cy={cy} w={0.66} base={22} rise={20} color={C.roofRed} /><Door cx={cx} cy={cy} /><polygon points={pts([[cx - 16, cy - 6], [cx - 9, cy - 3], [cx - 9, cy - 11], [cx - 16, cy - 14]])} fill={C.light} /></g>);
    case "market":
      return (<g><Box cx={cx} cy={cy} w={0.7} h={15} color={m("brick")} />{[0, 1, 2, 3].map((i) => <polygon key={i} points={pts([[cx - 25 + i * 6.3, cy - 15 + i * 3.1], [cx - 19 + i * 6.3, cy - 12 + i * 3.1], [cx - 19 + i * 6.3, cy - 20 + i * 3.1], [cx - 25 + i * 6.3, cy - 23 + i * 3.1]])} fill={i % 2 ? C.white : C.stripe} />)}<Door cx={cx} cy={cy} /></g>);
    case "lighthouse":
      return (<g><Box cx={cx} cy={cy} w={0.34} h={16} color={C.white} /><Box cx={cx} cy={cy} w={0.3} h={14} color={C.stripe} lift={16} /><Box cx={cx} cy={cy} w={0.26} h={14} color={C.white} lift={30} /><Box cx={cx} cy={cy} w={0.24} h={10} color={m("glass")} lift={44} /><circle className="island-glow" cx={cx} cy={cy - 50} r={9} fill={C.light} opacity={0.7} /><Roof cx={cx} cy={cy} w={0.28} base={54} rise={10} color={C.roofRed} /></g>);
    case "fountain":
      return (<g><Box cx={cx} cy={cy} w={0.66} h={6} color={m("marble")} /><polygon points={pts([[cx, cy - 16], [cx + 18, cy - 7], [cx, cy + 2], [cx - 18, cy - 7]])} fill={C.water} /><Box cx={cx} cy={cy} w={0.12} h={18} color={m("marble")} /><circle className="island-glow" cx={cx} cy={cy - 24} r={5} fill={C.water} /></g>);
    case "tower":
      return (<g><Box cx={cx} cy={cy} w={0.42} h={56} color={m("marble")} /><Roof cx={cx} cy={cy} w={0.5} base={56} rise={22} color={C.roofBlue} /><Door cx={cx} cy={cy} /><polygon points={pts([[cx - 10, cy - 30], [cx - 6, cy - 28], [cx - 6, cy - 36], [cx - 10, cy - 38]])} fill={C.light} /></g>);
    case "palace":
      return (<g><Box cx={cx} cy={cy} w={0.8} h={22} color={m("marble")} /><Box cx={cx} cy={cy} w={0.42} h={14} color={m("marble")} lift={22} /><ellipse cx={cx} cy={cy - 40} rx={14} ry={12} fill={m("gold")} /><ellipse cx={cx - 4} cy={cy - 44} rx={4} ry={4} fill={C.light} opacity={0.7} /><line x1={cx} y1={cy - 52} x2={cx} y2={cy - 62} stroke={m("gold")} strokeWidth={2} /><Door cx={cx} cy={cy} color={m("gold")} /></g>);
    case "flowerbed":
      return (<g><Box cx={cx} cy={cy} w={0.6} h={5} color="#7a5233" />{[[-12, -6, "#ff7aa8"], [-3, -9, "#ffd166"], [6, -6, "#c58cff"], [-6, -2, "#ff8f6b"], [3, -2, "#7ad3ff"], [12, -5, "#ff7aa8"]].map(([dx, dy, c], i) => <g key={i}><circle cx={cx + (dx as number)} cy={cy + (dy as number) - 3} r={3.2} fill={c as string} /><circle cx={cx + (dx as number)} cy={cy + (dy as number) - 3} r={1.2} fill="#fff6c9" /></g>)}</g>);
    case "lantern":
      return (<g><Box cx={cx} cy={cy} w={0.16} h={4} color="#3c3c44" /><rect x={cx - 1.2} y={cy - 32} width={2.4} height={28} fill="#3c3c44" /><Box cx={cx} cy={cy} w={0.16} h={8} color={C.light} lift={30} /><Roof cx={cx} cy={cy} w={0.2} base={38} rise={5} color="#3c3c44" /></g>);
    case "bench":
      return (<g><Box cx={cx - 8} cy={cy + 2} w={0.06} h={6} color="#5a3a22" /><Box cx={cx + 8} cy={cy - 2} w={0.06} h={6} color="#5a3a22" /><Box cx={cx} cy={cy} w={0.42} h={2.5} color={getMaterial("wood").color} lift={6} /><polygon points={pts([[cx - 15, cy - 13], [cx + 15, cy - 20], [cx + 15, cy - 14], [cx - 15, cy - 7]])} fill={shade(getMaterial("wood").color, 0.9)} /></g>);
    case "statue":
      return (<g><Box cx={cx} cy={cy} w={0.4} h={12} color={getMaterial("marble").color} /><Box cx={cx} cy={cy} w={0.12} h={16} color={getMaterial("gold").color} lift={12} /><circle cx={cx} cy={cy - 34} r={6} fill={getMaterial("gold").color} /><polygon points={pts([[cx - 3, cy - 42], [cx, cy - 50], [cx + 3, cy - 42]])} fill={C.light} /></g>);
    case "arch":
      return (<g fill="none" strokeLinecap="round">{["#e85d5d", "#f4a259", "#f6d55c", "#7cc46a", "#5fb4d6", "#8e7cc3"].map((c, i) => <path key={c} d={`M ${cx - 24 + i * 2.4} ${cy + 2 - i * 1.2} Q ${cx} ${cy - 58 + i * 5} ${cx + 24 - i * 2.4} ${cy - 2 - i * 1.2}`} stroke={c} strokeWidth={2.6} />)}</g>);
    default:
      return null;
  }
}

// Lighting per real-time phase: tint overlay over the whole scene.
const PHASE_TINT: Record<DayPhase, { color: string; opacity: number }> = {
  morning: { color: "#ffb27a", opacity: 0.12 },
  day: { color: "#ffffff", opacity: 0 },
  sunset: { color: "#ff6a3d", opacity: 0.2 },
  night: { color: "#0a1838", opacity: 0.42 },
};
// Window/door light offsets (relative to building ground centre) shown after dark.
const NIGHT_LIGHTS: Partial<Record<BuildingType, [number, number, number][]>> = {
  hut: [[9, -3, 5]],
  house: [[-12.5, -8.5, 6], [9, -3, 5]],
  windmill: [[9, -3, 5]],
  market: [[9, -3, 5]],
  tower: [[-8, -33, 6], [9, -3, 5]],
  lighthouse: [[0, -50, 16]],
  fountain: [[0, -24, 7]],
  palace: [[9, -3, 6], [-4, -44, 8]],
  lantern: [[0, -34, 12]],
  statue: [[0, -46, 6]],
};
const STARS: [number, number, number][] = [[40, 22, 1.4], [92, 52, 1], [150, 18, 1.2], [210, 40, 0.9], [420, 26, 1.3], [470, 58, 1], [520, 16, 1.1], [560, 48, 1.4], [600, 30, 0.9], [300, 12, 1]];

function Sky({ phase, W }: { phase: DayPhase; W: number }) {
  if (phase === "night") {
    return (
      <g pointerEvents="none" data-testid="island-sky-night">
        {STARS.map(([x, y, r], i) => <circle key={i} className="island-star" style={{ animationDelay: `${i * 0.37}s` }} cx={x} cy={y} r={r} fill="#fff" />)}
        <circle cx={W - 70} cy={46} r={16} fill="#f3f0dc" />
        <circle cx={W - 63} cy={41} r={14} fill="#1b2a52" opacity={0.85} />
      </g>
    );
  }
  const sun = phase === "morning" ? { x: 70, y: 66, c: "#ffd27a" } : phase === "day" ? { x: W / 2 + 150, y: 34, c: "#fff1a8" } : { x: W - 70, y: 74, c: "#ff9a5a" };
  return (
    <g pointerEvents="none" data-testid={`island-sky-${phase}`}>
      <circle className="island-glow" cx={sun.x} cy={sun.y} r={30} fill={sun.c} opacity={0.35} />
      <circle cx={sun.x} cy={sun.y} r={16} fill={sun.c} />
    </g>
  );
}

const toScreen = (x: number, y: number) => {
  const ox = PAD + (GRID_SIZE * TW) / 2;
  return { sx: ox + ((x - y) * TW) / 2, sy: TOP + ((x + y) * TH) / 2 };
};

// ---------- Residents ----------
const OUTFITS = ["#e07a5f", "#3d8bfd", "#f2cc8f", "#81b29a", "#c084fc", "#f28482"];
type Walker = { id: number; x: number; y: number; dur: number; next: number; flip: boolean };

function tilePoint(x: number, y: number, jitter = 0): { x: number; y: number } {
  const { sx, sy } = toScreen(x, y);
  return { x: sx + jitter, y: sy + TH * 0.78 };
}

function randomTarget(buildings: PlacedBuilding[], seed: number) {
  if (buildings.length && Math.random() < 0.75) {
    const b = buildings[Math.floor(Math.random() * buildings.length)];
    return tilePoint(b.x, b.y, ((seed % 3) - 1) * 8);
  }
  return tilePoint(Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE));
}

export interface ResidentTalk { index: number; name: string; text: string; key: number }

const Residents = memo(function Residents({ buildings, cheerKey, cheerText, talk, onResident }: { buildings: PlacedBuilding[]; cheerKey: number; cheerText: string; talk?: ResidentTalk | null; onResident?: (index: number) => void }) {
  const count = getResidentCount(buildings);
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const [cheering, setCheering] = useState(false);

  useEffect(() => {
    setWalkers((prev) => Array.from({ length: count }, (_, i) => prev[i] || { id: i, ...randomTarget(buildings, i), dur: 0, next: Date.now() + 800 + i * 700, flip: false }));
  }, [count, buildings]);

  useEffect(() => {
    if (reduced || cheering) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setWalkers((prev) => prev.map((w) => {
        if (now < w.next) return w;
        const t = randomTarget(buildings, w.id + now);
        const dur = Math.min(7, Math.max(1.6, Math.hypot(t.x - w.x, t.y - w.y) / 24));
        return { ...w, ...t, dur, flip: t.x < w.x, next: now + dur * 1000 + 1200 + Math.random() * 2500 };
      }));
    }, 700);
    return () => window.clearInterval(timer);
  }, [buildings, reduced, cheering]);

  useEffect(() => {
    if (!cheerKey) return;
    setCheering(true);
    const t = window.setTimeout(() => setCheering(false), 3600);
    return () => window.clearTimeout(t);
  }, [cheerKey]);

  return (
    <g pointerEvents="none" data-testid="island-residents" data-cheering={cheering ? "true" : "false"}>
      {walkers.map((w, i) => (
        <g
          key={w.id}
          style={{ transform: `translate(${w.x}px, ${w.y}px)`, transition: reduced || cheering ? "none" : `transform ${w.dur}s linear` }}
          data-testid={`island-resident-${i}`}
          className="island-resident"
          pointerEvents={onResident ? "auto" : "none"}
          role={onResident ? "button" : undefined}
          tabIndex={onResident ? 0 : undefined}
          aria-label={onResident ? `resident ${i + 1}` : undefined}
          onClick={onResident ? (e) => { e.stopPropagation(); onResident(i); } : undefined}
          onKeyDown={onResident ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onResident(i); } } : undefined}
        >
          <rect x={-10} y={-30} width={20} height={34} fill="transparent" />
          <g className={cheering ? "island-cheer" : "island-walk"} style={{ animationDelay: `${i * 0.12}s` }}>
            <g transform={w.flip ? "scale(-1.4,1.4)" : "scale(1.4)"}>
              <ellipse cx={0} cy={1} rx={4} ry={1.6} fill="rgba(0,0,0,0.2)" />
              <rect x={-1.8} y={-5} width={1.4} height={5} fill="#3a3a48" />
              <rect x={0.4} y={-5} width={1.4} height={5} fill="#3a3a48" />
              <rect x={-3} y={-12} width={6} height={7.5} rx={2} fill={OUTFITS[i % OUTFITS.length]} />
              {cheering ? (
                <><line x1={-3} y1={-11} x2={-6} y2={-17} stroke="#f1c7a4" strokeWidth={1.5} strokeLinecap="round" /><line x1={3} y1={-11} x2={6} y2={-17} stroke="#f1c7a4" strokeWidth={1.5} strokeLinecap="round" /></>
              ) : null}
              <circle cx={0} cy={-15} r={3.2} fill="#f1c7a4" />
              <path d="M -3.2 -15.5 Q 0 -20 3.2 -15.5 Z" fill="#4a3426" />
            </g>
            {talk && talk.index === i && !cheering && (
              <foreignObject key={talk.key} x={-80} y={-96} width={160} height={70} className="island-talk" data-testid="island-resident-talk">
                <div className="island-talk-bubble">
                  <b>{talk.name}</b>
                  <span>{talk.text}</span>
                </div>
              </foreignObject>
            )}
            {cheering && i < 3 && (
              <g transform="translate(0,-38)" data-testid="island-cheer-bubble">
                <rect x={-22} y={-9} width={44} height={14} rx={7} fill="#ffffff" opacity={0.95} />
                <text x={0} y={1.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#3a3a48" style={{ fontFamily: "inherit" }}>{cheerText}</text>
              </g>
            )}
          </g>
        </g>
      ))}
    </g>
  );
});

export interface IslandSceneProps {
  buildings: PlacedBuilding[];
  selectedId: string | null;
  ghostType: BuildingType | null;
  hover: { x: number; y: number } | null;
  phase?: DayPhase;
  cheerKey?: number;
  cheerText?: string;
  talk?: ResidentTalk | null;
  onResident?: (index: number) => void;
  /** false = decorative preview (no focusable tiles). */
  interactive?: boolean;
  labelFor: (x: number, y: number, b?: PlacedBuilding) => string;
  onHover: (tile: { x: number; y: number } | null) => void;
  onTile: (x: number, y: number) => void;
  onBuilding: (b: PlacedBuilding) => void;
}

export const IslandScene = memo(function IslandScene({ buildings, selectedId, ghostType, hover, phase = "day", cheerKey = 0, cheerText = "Yay!", talk = null, onResident, interactive = true, labelFor, onHover, onTile, onBuilding }: IslandSceneProps) {
  const W = GRID_SIZE * TW + PAD * 2;
  const H = TOP + GRID_SIZE * TH + CLIFF + PAD + 10;
  const top = toScreen(0, 0), right = toScreen(GRID_SIZE, 0), bottom = toScreen(GRID_SIZE, GRID_SIZE), left = toScreen(0, GRID_SIZE);
  const occupiedSet = new Set(buildings.map((b) => `${b.x}:${b.y}`));
  const sorted = [...buildings].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) tiles.push({ x, y });
  const showGhost = ghostType && hover && !occupiedSet.has(`${hover.x}:${hover.y}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`island-svg island-phase-${phase}`} role={interactive ? "group" : "img"} aria-label="island map" data-testid={interactive ? "island-map" : "island-mini-map"} onMouseLeave={() => onHover(null)}>
      <Sky phase={phase} W={W} />
      {/* sand ring */}
      <polygon points={pts([[top.sx, top.sy - 12], [right.sx + 22, right.sy], [bottom.sx, bottom.sy + 12], [left.sx - 22, left.sy]])} fill={C.sand} opacity={0.95} />
      {/* cliffs */}
      <polygon points={pts([[left.sx, left.sy], [bottom.sx, bottom.sy], [bottom.sx, bottom.sy + CLIFF], [left.sx, left.sy + CLIFF]])} fill={C.cliff} />
      <polygon points={pts([[bottom.sx, bottom.sy], [right.sx, right.sy], [right.sx, right.sy + CLIFF], [bottom.sx, bottom.sy + CLIFF]])} fill={C.cliffDark} />
      {tiles.map(({ x, y }) => {
        const { sx, sy } = toScreen(x, y);
        const isHover = hover?.x === x && hover?.y === y;
        const busy = occupiedSet.has(`${x}:${y}`);
        const cls = `island-tile${isHover ? " is-hover" : ""}${isHover && ghostType && busy ? " is-blocked" : ""}`;
        return (
          <polygon
            key={`${x}-${y}`}
            data-testid={`island-tile-${x}-${y}`}
            className={cls}
            points={pts([[sx, sy], [sx + TW / 2, sy + TH / 2], [sx, sy + TH], [sx - TW / 2, sy + TH / 2]])}
            fill={(x + y) % 2 ? C.grassA : C.grassB}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={labelFor(x, y, buildings.find((b) => b.x === x && b.y === y))}
            onMouseEnter={() => onHover({ x, y })}
            onFocus={() => onHover({ x, y })}
            onClick={() => onTile(x, y)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTile(x, y); } }}
          />
        );
      })}
      {sorted.map((b) => {
        const { sx, sy } = toScreen(b.x, b.y);
        const cy = sy + TH / 2;
        return (
          <g
            key={b.id}
            data-testid={`island-building-${b.type}`}
            className={`island-building${selectedId === b.id ? " is-selected" : ""}`}
            onClick={() => onBuilding(b)}
            onMouseEnter={() => onHover({ x: b.x, y: b.y })}
          >
            <ellipse cx={sx} cy={cy + 2} rx={TW * 0.32} ry={TH * 0.26} fill="rgba(0,0,0,0.16)" />
            {renderBuilding(b.type, sx, cy)}
            {selectedId === b.id && <polygon className="island-select-ring" points={pts([[sx, sy], [sx + TW / 2, sy + TH / 2], [sx, sy + TH], [sx - TW / 2, sy + TH / 2]])} fill="none" />}
          </g>
        );
      })}
      <Residents buildings={buildings} cheerKey={cheerKey} cheerText={cheerText} talk={talk} onResident={onResident} />
      {showGhost && hover && (() => {
        const { sx, sy } = toScreen(hover.x, hover.y);
        return <g className="island-ghost" pointerEvents="none">{renderBuilding(ghostType, sx, sy + TH / 2)}</g>;
      })()}
      {PHASE_TINT[phase].opacity > 0 && <rect x={0} y={0} width={W} height={H} fill={PHASE_TINT[phase].color} opacity={PHASE_TINT[phase].opacity} pointerEvents="none" style={{ mixBlendMode: "multiply" }} data-testid="island-tint" />}
      {phase === "night" && (
        <g pointerEvents="none" data-testid="island-night-lights">
          {sorted.flatMap((b) => {
            const { sx, sy } = toScreen(b.x, b.y);
            return (NIGHT_LIGHTS[b.type] || []).map(([dx, dy, r], i) => <circle key={`${b.id}-${i}`} className="island-glow" cx={sx + dx} cy={sy + TH / 2 + dy} r={r} fill={C.light} opacity={0.6} />);
          })}
        </g>
      )}
    </svg>
  );
});

export function BuildingPreview({ type, className }: { type: BuildingType; className?: string }) {
  return (
    <svg viewBox="-40 -70 80 90" className={className} aria-hidden="true">
      <polygon points={pts([[0, -8], [30, 7], [0, 22], [-30, 7]])} fill={C.grassA} />
      {renderBuilding(type, 0, 7)}
    </svg>
  );
}
