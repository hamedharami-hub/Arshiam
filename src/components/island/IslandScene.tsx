import { memo, type ReactNode } from "react";
import { GRID_SIZE, getMaterial, type BuildingType, type PlacedBuilding } from "@/lib/island";

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
    default:
      return null;
  }
}

const toScreen = (x: number, y: number) => {
  const ox = PAD + (GRID_SIZE * TW) / 2;
  return { sx: ox + ((x - y) * TW) / 2, sy: TOP + ((x + y) * TH) / 2 };
};

export interface IslandSceneProps {
  buildings: PlacedBuilding[];
  selectedId: string | null;
  ghostType: BuildingType | null;
  hover: { x: number; y: number } | null;
  isNight?: boolean;
  labelFor: (x: number, y: number, b?: PlacedBuilding) => string;
  onHover: (tile: { x: number; y: number } | null) => void;
  onTile: (x: number, y: number) => void;
  onBuilding: (b: PlacedBuilding) => void;
}

export const IslandScene = memo(function IslandScene({ buildings, selectedId, ghostType, hover, isNight, labelFor, onHover, onTile, onBuilding }: IslandSceneProps) {
  const W = GRID_SIZE * TW + PAD * 2;
  const H = TOP + GRID_SIZE * TH + CLIFF + PAD + 10;
  const top = toScreen(0, 0), right = toScreen(GRID_SIZE, 0), bottom = toScreen(GRID_SIZE, GRID_SIZE), left = toScreen(0, GRID_SIZE);
  const occupiedSet = new Set(buildings.map((b) => `${b.x}:${b.y}`));
  const sorted = [...buildings].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) tiles.push({ x, y });
  const showGhost = ghostType && hover && !occupiedSet.has(`${hover.x}:${hover.y}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="island-svg" role="group" aria-label="island map" data-testid="island-map" onMouseLeave={() => onHover(null)}>
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
            role="button"
            tabIndex={0}
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
      {showGhost && hover && (() => {
        const { sx, sy } = toScreen(hover.x, hover.y);
        return <g className="island-ghost" pointerEvents="none">{renderBuilding(ghostType, sx, sy + TH / 2)}</g>;
      })()}
      {isNight && <rect x={0} y={0} width={W} height={H} fill="#0b1a33" opacity={0.18} pointerEvents="none" />}
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
