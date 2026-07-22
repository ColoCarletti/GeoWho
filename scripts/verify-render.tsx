// Server-render the full app to confirm the whole tree mounts without errors.
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "../src/App";

const html = renderToString(createElement(App));

let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}`);
  if (!cond) failures++;
};

check("renders the GeoWho title", html.includes("GeoWho"));
check("renders the world map <svg>", html.includes("<svg"));
check("renders the land path", html.includes("<path"));
check("renders both pins (★ / ✝)", html.includes("★") && html.includes("✝"));
check("renders the Born / Died labels", html.includes("Born") && html.includes("Died"));
check("renders the name input", html.includes("Type a name"));
check("has no hints/stats/help leftovers", !/unlocks on next miss|Statistics|How to play/.test(html));

console.log(failures === 0 ? "\n✅ RENDER OK" : `\n❌ ${failures} render check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
