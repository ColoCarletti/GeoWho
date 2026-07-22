import type { Person, WorldMap as WorldMapData } from "../types";

interface Props {
  world: WorldMapData;
  person: Person;
}

/** A small, flat location marker: a dot inside a thin ring of the same hue. */
function Pin({ x, y, tone }: { x: number; y: number; tone: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill="none" stroke={tone} strokeWidth={1.5} opacity={0.4} />
      <circle cx={x} cy={y} r={4} fill={tone} stroke="var(--map-bg)" strokeWidth={1.5} />
    </g>
  );
}

/** The world map — a clean rectangular map with two location markers. */
export default function WorldMap({ world, person }: Props) {
  const { bx, by, dx, dy } = person;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"
      style={{ background: "var(--map-bg)" }}
    >
      <svg
        viewBox={`0 0 ${world.w} ${world.h}`}
        className="block w-full"
        role="img"
        aria-label="World map showing birthplace and place of death"
      >
        <rect width={world.w} height={world.h} fill="var(--map-bg)" />
        <path d={world.land} className="fill-slate-300 dark:fill-slate-700" />
        <line
          x1={bx}
          y1={by}
          x2={dx}
          y2={dy}
          className="stroke-slate-400/70 dark:stroke-slate-500/60"
          strokeWidth={1.25}
          strokeDasharray="1.5 6"
          strokeLinecap="round"
        />
        <Pin x={bx} y={by} tone="#0d9488" />
        <Pin x={dx} y={dy} tone="#e11d48" />
      </svg>
    </div>
  );
}
