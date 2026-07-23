import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoDistance,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";
import topoData from "world-atlas/countries-110m.json";
import type { Person } from "../types";

// Prepared once: filled landmass, interior country borders, and a graticule.
const land = feature(topoData, topoData.objects.land as GeometryCollection);
const borders = mesh(
  topoData,
  topoData.objects.countries as GeometryCollection,
  (a, b) => a !== b
);
const graticule = geoGraticule10();

const SIZE = 320;
const C = SIZE / 2;
const BASE_R = 150;
const MIN_S = 1;
const MAX_S = 4;
const BIRTH = "#0d9488";
const DEATH = "#e11d48";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Geographic midpoint of two points, so a figure's globe faces both markers. */
function midpoint(aLng: number, aLat: number, bLng: number, bLat: number): [number, number] {
  const d = Math.PI / 180;
  const toVec = (lng: number, lat: number) => [
    Math.cos(lat * d) * Math.cos(lng * d),
    Math.cos(lat * d) * Math.sin(lng * d),
    Math.sin(lat * d),
  ];
  const [ax, ay, az] = toVec(aLng, aLat);
  const [bx, by, bz] = toVec(bLng, bLat);
  const x = ax + bx;
  const y = ay + by;
  const z = az + bz;
  const m = Math.hypot(x, y, z) || 1;
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(clamp(z / m, -1, 1)) * 180) / Math.PI];
}

interface Props {
  person: Person;
}

export default function WorldMap({ person }: Props) {
  const { blng, blat, dlng, dlat } = person;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; lng: number; lat: number } | null>(null);

  const [center, setCenter] = useState<[number, number]>(() =>
    midpoint(blng, blat, dlng, dlat)
  );
  const [scale, setScale] = useState(1);

  // face both markers whenever the figure changes
  useEffect(() => {
    setCenter(midpoint(blng, blat, dlng, dlat));
    setScale(1);
  }, [person.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const path = useMemo(() => {
    const projection = geoOrthographic()
      .translate([C, C])
      .scale(BASE_R * scale)
      .clipAngle(90)
      .rotate([-center[0], -center[1]]);
    return { fn: geoPath(projection), projection };
  }, [center, scale]);

  const project = (lng: number, lat: number) => {
    const visible = geoDistance([lng, lat], center) < Math.PI / 2;
    const pt = path.projection([lng, lat]);
    return { pt, visible: visible && !!pt };
  };
  const b = project(blng, blat);
  const d = project(dlng, dlat);

  // wheel to zoom (native listener so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_S, MAX_S));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    drag.current = { px: e.clientX, py: e.clientY, lng: center[0], lat: center[1] };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const k = 0.32 / scale; // degrees per pixel, gentler when zoomed in
    // Drag "grabs" the globe: the surface follows the cursor, so the view
    // centre moves opposite to the drag.
    setCenter([
      drag.current.lng - (e.clientX - drag.current.px) * k,
      clamp(drag.current.lat + (e.clientY - drag.current.py) * k, -85, 85),
    ]);
  }
  function endDrag() {
    drag.current = null;
  }

  const r = BASE_R * scale;
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-lg font-semibold leading-none text-slate-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block w-full select-none"
        role="img"
        aria-label="Spinnable globe: ★ marks the birthplace, ✝ the place of death"
        style={{ touchAction: "none", cursor: drag.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          <radialGradient id="ocean" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="var(--globe-hi)" />
            <stop offset="100%" stopColor="var(--globe-lo)" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={r + 6} fill="var(--globe-halo)" />
        <circle cx={C} cy={C} r={r} fill="url(#ocean)" />
        <path d={path.fn(graticule) ?? ""} fill="none" stroke="var(--globe-grid)" strokeWidth={0.5} />
        <path d={path.fn(land) ?? ""} fill="var(--globe-land)" />
        <path d={path.fn(borders) ?? ""} fill="none" stroke="var(--globe-border)" strokeWidth={0.5} />
        <path
          d={
            path.fn({
              type: "LineString",
              coordinates: [[blng, blat], [dlng, dlat]],
            } as GeoPermissibleObjects) ?? ""
          }
          fill="none"
          stroke="var(--globe-arc)"
          strokeWidth={1.4}
          strokeDasharray="1.5 5"
          strokeLinecap="round"
        />
        {b.visible && <Marker x={b.pt![0]} y={b.pt![1]} glyph="★" tone={BIRTH} />}
        {d.visible && <Marker x={d.pt![0]} y={d.pt![1]} glyph="✝" tone={DEATH} />}
      </svg>

      <div className="absolute right-1 top-1 flex flex-col gap-1.5">
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => setScale((s) => clamp(s * 1.5, MIN_S, MAX_S))} disabled={scale >= MAX_S}>
          +
        </button>
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => setScale((s) => clamp(s / 1.5, MIN_S, MAX_S))} disabled={scale <= MIN_S}>
          −
        </button>
        <button
          type="button"
          className={btn}
          aria-label="Reset view"
          onClick={() => {
            setCenter(midpoint(blng, blat, dlng, dlat));
            setScale(1);
          }}
        >
          ⟳
        </button>
      </div>
    </div>
  );
}

function Marker({ x, y, glyph, tone }: { x: number; y: number; glyph: string; tone: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: 14,
        fontWeight: 700,
        fill: tone,
        stroke: "var(--globe-lo)",
        strokeWidth: 2.5,
        paintOrder: "stroke",
        pointerEvents: "none",
      }}
    >
      {glyph}
    </text>
  );
}
