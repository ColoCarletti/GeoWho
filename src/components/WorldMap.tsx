import { useEffect, useRef, useState } from "react";
import type { Person } from "../types";
import { world } from "../lib/people";

interface Props {
  person: Person;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BIRTH = "#0d9488";
const DEATH = "#e11d48";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** A ★ (born) / ✝ (died) marker that keeps a constant screen size while zoomed. */
function Marker({ x, y, glyph, tone, scale }: { x: number; y: number; glyph: string; tone: string; scale: number }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: 26 / scale,
        fontWeight: 700,
        fill: tone,
        stroke: "var(--map-bg)",
        strokeWidth: 5 / scale,
        paintOrder: "stroke",
        pointerEvents: "none",
      }}
    >
      {glyph}
    </text>
  );
}

/** The world map: a ★ at the birthplace, a ✝ at the place of death, with zoom + pan. */
export default function WorldMap({ person }: Props) {
  const { w, h, land } = world;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);

  // scale + the map-space point held at the viewport centre
  const [view, setView] = useState({ scale: 1, cx: w / 2, cy: h / 2 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // reset to the whole map whenever the figure changes
  useEffect(() => {
    setView({ scale: 1, cx: w / 2, cy: h / 2 });
  }, [person.id, w, h]);

  const vbW = w / view.scale;
  const vbH = h / view.scale;
  const vbX = clamp(view.cx - vbW / 2, 0, w - vbW);
  const vbY = clamp(view.cy - vbH / 2, 0, h - vbH);

  function zoomBy(factor: number) {
    setView((v) => ({ ...v, scale: clamp(v.scale * factor, MIN_SCALE, MAX_SCALE) }));
  }
  function reset() {
    setView({ scale: 1, cx: w / 2, cy: h / 2 });
  }

  // wheel-to-zoom, anchored at the cursor (native listener so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { scale, cx, cy } = viewRef.current;
      const rect = svg!.getBoundingClientRect();
      const curW = w / scale;
      const curH = h / scale;
      const x0 = clamp(cx - curW / 2, 0, w - curW);
      const y0 = clamp(cy - curH / 2, 0, h - curH);
      const fracX = (e.clientX - rect.left) / rect.width;
      const fracY = (e.clientY - rect.top) / rect.height;
      const focusX = x0 + fracX * curW;
      const focusY = y0 + fracY * curH;
      const next = clamp(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_SCALE, MAX_SCALE);
      const newW = w / next;
      const newH = h / next;
      setView({ scale: next, cx: focusX - (fracX - 0.5) * newW, cy: focusY - (fracY - 0.5) * newH });
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [w, h]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    drag.current = { px: e.clientX, py: e.clientY, cx: view.cx, cy: view.cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dxMap = ((e.clientX - drag.current.px) / rect.width) * vbW;
    const dyMap = ((e.clientY - drag.current.py) / rect.height) * vbH;
    setView((v) => ({ ...v, cx: drag.current!.cx - dxMap, cy: drag.current!.cy - dyMap }));
  }
  function endDrag() {
    drag.current = null;
  }

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-lg font-semibold leading-none text-slate-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"
      style={{ background: "var(--map-bg)" }}
    >
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="block w-full"
        role="img"
        aria-label="World map showing birthplace (star) and place of death (cross)"
        style={{ touchAction: "none", cursor: view.scale > 1 ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="var(--map-bg)" />
        <path d={land} className="fill-slate-300 dark:fill-slate-700" />
        <line
          x1={person.bx}
          y1={person.by}
          x2={person.dx}
          y2={person.dy}
          className="stroke-slate-400/70 dark:stroke-slate-500/60"
          strokeWidth={1.25}
          strokeDasharray="1.5 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <Marker x={person.bx} y={person.by} glyph="★" tone={BIRTH} scale={view.scale} />
        <Marker x={person.dx} y={person.dy} glyph="✝" tone={DEATH} scale={view.scale} />
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => zoomBy(1.6)} disabled={view.scale >= MAX_SCALE}>
          +
        </button>
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => zoomBy(1 / 1.6)} disabled={view.scale <= MIN_SCALE}>
          −
        </button>
        <button type="button" className={btn} aria-label="Reset view" onClick={reset} disabled={view.scale === 1}>
          ⟳
        </button>
      </div>
    </div>
  );
}
