// Bundled into the standalone artifact so its "Play it" demo shows the same
// realistic globe as the app. Exposes window.GeoGlobe.mount(svgEl, person).
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from "d3-geo";
import { feature, mesh } from "topojson-client";
import topo from "world-atlas/countries-110m.json";

const land = feature(topo, topo.objects.land);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
const grat = geoGraticule10();

const C = 160;
const BASE_R = 150;
const MIN = 1;
const MAX = 4;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function midpoint(aLng, aLat, bLng, bLat) {
  const d = Math.PI / 180;
  const v = (lng, lat) => [
    Math.cos(lat * d) * Math.cos(lng * d),
    Math.cos(lat * d) * Math.sin(lng * d),
    Math.sin(lat * d),
  ];
  const a = v(aLng, aLat);
  const b = v(bLng, bLat);
  let x = a[0] + b[0];
  let y = a[1] + b[1];
  let z = a[2] + b[2];
  const m = Math.hypot(x, y, z) || 1;
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(clamp(z / m, -1, 1)) * 180) / Math.PI];
}

export function mount(svg, p) {
  const q = (s) => svg.querySelector(s);
  const el = {
    ocean: q(".ocean"),
    halo: q(".halo"),
    grat: q(".grat"),
    land: q(".land"),
    bord: q(".bord"),
    arc: q(".arc"),
    mkb: q(".mkb"),
    mkd: q(".mkd"),
  };
  const box = svg.closest(".globe");
  let center = midpoint(p.blng, p.blat, p.dlng, p.dlat);
  let scale = 1;
  let drag = null;

  function draw() {
    const r = BASE_R * scale;
    const proj = geoOrthographic()
      .translate([C, C])
      .scale(r)
      .clipAngle(90)
      .rotate([-center[0], -center[1]]);
    const path = geoPath(proj);
    el.ocean.setAttribute("r", r);
    el.halo.setAttribute("r", r + 6);
    el.grat.setAttribute("d", path(grat) || "");
    el.land.setAttribute("d", path(land) || "");
    el.bord.setAttribute("d", path(borders) || "");
    el.arc.setAttribute(
      "d",
      path({ type: "LineString", coordinates: [[p.blng, p.blat], [p.dlng, p.dlat]] }) || ""
    );
    const bv = geoDistance([p.blng, p.blat], center) < Math.PI / 2;
    const dv = geoDistance([p.dlng, p.dlat], center) < Math.PI / 2;
    const bp = proj([p.blng, p.blat]);
    const dp = proj([p.dlng, p.dlat]);
    if (bp) {
      el.mkb.setAttribute("x", bp[0]);
      el.mkb.setAttribute("y", bp[1]);
    }
    if (dp) {
      el.mkd.setAttribute("x", dp[0]);
      el.mkd.setAttribute("y", dp[1]);
    }
    el.mkb.style.display = bv ? "" : "none";
    el.mkd.style.display = dv ? "" : "none";
    box.querySelector('[data-z="in"]').disabled = scale >= MAX;
    box.querySelector('[data-z="out"]').disabled = scale <= MIN;
  }

  box.querySelector('[data-z="in"]').onclick = () => {
    scale = clamp(scale * 1.5, MIN, MAX);
    draw();
  };
  box.querySelector('[data-z="out"]').onclick = () => {
    scale = clamp(scale / 1.5, MIN, MAX);
    draw();
  };
  box.querySelector('[data-z="reset"]').onclick = () => {
    center = midpoint(p.blng, p.blat, p.dlng, p.dlat);
    scale = 1;
    draw();
  };
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      scale = clamp(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN, MAX);
      draw();
    },
    { passive: false }
  );
  svg.addEventListener("pointerdown", (e) => {
    drag = { px: e.clientX, py: e.clientY, lng: center[0], lat: center[1] };
    svg.classList.add("grabbing");
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const k = 0.32 / scale;
    // grab-and-spin: the surface follows the cursor
    center = [
      drag.lng - (e.clientX - drag.px) * k,
      clamp(drag.lat + (e.clientY - drag.py) * k, -85, 85),
    ];
    draw();
  });
  const stop = () => {
    drag = null;
    svg.classList.remove("grabbing");
  };
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointerleave", stop);
  draw();
}
