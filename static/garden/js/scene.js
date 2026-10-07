import { SVG_NS } from "./plants.js";
import { seededRandom, depthScale, WORLD, DEPTH_SQUASH as SQ } from "./model.js";

const f = (n) => Math.round(n * 10) / 10;

export function buildDefs(defs) {
  defs.innerHTML = `
    <radialGradient id="g-glow-idea"><stop offset="0" class="gs-idea-0"/><stop offset="1" class="gs-idea-1"/></radialGradient>
    <radialGradient id="g-glow-warm"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".9"/><stop offset=".35" stop-color="#F5D98A" stop-opacity=".35"/><stop offset="1" stop-color="#F5D98A" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-halo"><stop offset="0" stop-color="#FFF6D8" stop-opacity=".55"/><stop offset=".6" stop-color="#FFF6D8" stop-opacity=".12"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-firefly"><stop offset="0" stop-color="#F4F9B0" stop-opacity=".95"/><stop offset=".3" stop-color="#D9EE8A" stop-opacity=".4"/><stop offset="1" stop-color="#D9EE8A" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-node"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-ground" gradientUnits="userSpaceOnUse" x1="0" y1="-10" x2="0" y2="760">
      <stop offset="0" class="gs-ground-0"/><stop offset=".08" class="gs-ground-1"/><stop offset=".5" class="gs-ground-2"/><stop offset="1" class="gs-ground-3"/>
    </linearGradient>
    <linearGradient id="g-mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="gs-mist" stop-opacity="0"/><stop offset=".5" class="gs-mist" stop-opacity=".55"/><stop offset="1" class="gs-mist" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="g-patch-light"><stop offset="0" stop-color="#FFFBE0" stop-opacity=".13"/><stop offset="1" stop-color="#FFFBE0" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-patch-dark"><stop offset="0" stop-color="#0A2814" stop-opacity=".16"/><stop offset="1" stop-color="#0A2814" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-roots-surface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="gs-ground-1"/><stop offset=".75" class="gs-ground-2"/><stop offset="1" class="gs-ground-3"/>
    </linearGradient>
    <linearGradient id="g-soil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="gs-soil-0"/><stop offset=".35" class="gs-soil-1"/><stop offset="1" class="gs-soil-2"/>
    </linearGradient>
  `;
}

function hillPath(rnd, amplitude, base, span = 3200) {
  const phases = [rnd() * 6, rnd() * 6, rnd() * 6];
  let d = `M${-span} 60 L${-span} ${f(-base)}`;
  for (let x = -span; x <= span; x += 40) {
    const y = -base - amplitude * (0.55 * Math.sin(x / 520 + phases[0]) + 0.3 * Math.sin(x / 210 + phases[1]) + 0.15 * Math.sin(x / 90 + phases[2]));
    d += ` L${x} ${f(y)}`;
  }
  return d + ` L${span} 60Z`;
}

/** Distant hills, drawn around x=0 and moved with parallax by the camera. */
export function buildFarLayer(group) {
  const rnd = seededRandom("hills");
  let trees = "";
  for (let i = 0; i < 46; i++) {
    const x = -2600 + rnd() * 5200;
    const h = 18 + rnd() * 26;
    const y = -38 - rnd() * 30;
    trees += `<g transform="translate(${f(x)} ${f(y)})"><rect class="far-trunk" x="-1.5" y="${f(-h * 0.4)}" width="3" height="${f(h * 0.4 + 6)}"/><ellipse class="far-tree" cx="0" cy="${f(-h * 0.55)}" rx="${f(h * 0.32)}" ry="${f(h * 0.5)}"/></g>`;
  }
  group.innerHTML = `
    <g class="far" data-parallax="0.25"><path class="hill hill-1" d="${hillPath(rnd, 120, 170)}"/></g>
    <g class="far" data-parallax="0.45"><path class="hill hill-2" d="${hillPath(rnd, 80, 95)}"/>${trees}</g>
    <g class="far" data-parallax="0.7"><path class="hill hill-3" d="${hillPath(rnd, 40, 34)}"/></g>
  `;
}

function trailShape() {
  // A soft path meandering from the foreground to the horizon, narrowing with depth.
  const left = [];
  const right = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const gy = 1300 - t * 1302;
    const y = gy * SQ;
    const x = 980 + Math.sin(t * 5.2 + 0.6) * 260 * (1 - t * 0.6) + t * 140;
    const w = 20 + 110 * Math.max(0, gy / 1300) ** 1.4;
    left.push(`${f(x - w)} ${f(y)}`);
    right.unshift(`${f(x + w)} ${f(y)}`);
  }
  return `M${left.join(" L")} L${right.join(" L")}Z`;
}

export function buildGround(group) {
  const rnd = seededRandom("meadow");
  let patches = "";
  for (let i = 0; i < 22; i++) {
    const gy = rnd() * 1250;
    const s = depthScale(gy);
    patches += `<ellipse class="patch" fill="url(#g-patch-${i % 2 ? "light" : "dark"})" cx="${f(-300 + rnd() * 2600)}" cy="${f(gy * SQ)}" rx="${f((180 + rnd() * 260) * s)}" ry="${f((34 + rnd() * 40) * s)}"/>`;
  }

  let tufts = "";
  for (let i = 0; i < 420; i++) {
    const gy = Math.pow(rnd(), 0.75) * 1300 - 4;
    const y = gy * SQ;
    const x = -500 + rnd() * 3000;
    const s = depthScale(gy) * (0.6 + rnd() * 0.6);
    const blades = 3 + Math.floor(rnd() * 3);
    let d = "";
    for (let b = 0; b < blades; b++) {
      const bx = (b - blades / 2) * 3.2;
      const h = 8 + rnd() * 11;
      const lean = (rnd() - 0.5) * 12;
      d += `M${f(bx - 1.4)} 0 Q ${f(bx + lean * 0.3)} ${f(-h * 0.6)} ${f(bx + lean)} ${f(-h)} Q ${f(bx + lean * 0.2 + 1)} ${f(-h * 0.5)} ${f(bx + 1.6)} 0Z`;
    }
    const tone = gy < 260 ? "tuft-far" : gy < 700 ? "tuft-mid" : "tuft-near";
    const wind = i % 3 === 0 ? " wind" : "";
    tufts += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path class="tuft ${tone}${wind}" style="--wd:${f(-rnd() * 6)}s" d="${d}"/></g>`;
  }

  let flowers = "";
  for (let i = 0; i < 90; i++) {
    const gy = 40 + rnd() * 1200;
    const y = gy * SQ;
    const x = -200 + rnd() * 2400;
    const s = depthScale(gy);
    const tone = ["wild-a", "wild-b", "wild-c"][Math.floor(rnd() * 3)];
    flowers += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path class="wild-stem" d="M0 0 Q 1 -5 0 -9"/><circle class="wild ${tone}" cx="0" cy="-10" r="2.2"/></g>`;
  }

  let pebbles = "";
  for (let i = 0; i < 18; i++) {
    const gy = 100 + rnd() * 1150;
    const s = depthScale(gy);
    pebbles += `<ellipse class="pebble" cx="${f(-100 + rnd() * 2200)}" cy="${f(gy * SQ)}" rx="${f((4 + rnd() * 6) * s)}" ry="${f((2.4 + rnd() * 2.6) * s)}"/>`;
  }

  // Ambient flora: shrubs along the far edge and ferns framing the foreground.
  let shrubs = "";
  const shrub = (x, gy, size) => {
    const s = depthScale(gy) * size;
    const blobs = [[-16, -8, 15], [14, -9, 14], [0, -17, 18], [-4, -6, 13]]
      .map(([bx, by, r], i) => `<circle class="${i === 2 ? "shrub-hi" : "shrub"}" cx="${bx}" cy="${by}" r="${r}"/>`).join("");
    return `<g transform="translate(${f(x)} ${f(gy * SQ)}) scale(${f(s)})"><ellipse class="shrub-shadow" cx="0" cy="1" rx="30" ry="5"/>${blobs}</g>`;
  };
  for (let i = 0; i < 18; i++) shrubs += shrub(-300 + rnd() * 2600, 10 + rnd() * 90, 0.7 + rnd() * 0.6);
  for (let i = 0; i < 7; i++) shrubs += shrub(rnd() > 0.5 ? -250 + rnd() * 350 : 1900 + rnd() * 350, 200 + rnd() * 900, 1 + rnd() * 0.6);
  let ferns = "";
  const fern = (x, gy, size, flip) => {
    let fronds = "";
    for (let k = 0; k < 5; k++) {
      const a = -70 + k * 30 + (rnd() - 0.5) * 10;
      const len = 34 + rnd() * 16;
      fronds += `<path class="fern" transform="rotate(${f(a)})" d="M0 0 C 4 ${f(-len * 0.4)} 3 ${f(-len * 0.8)} 0 ${f(-len)} C -3 ${f(-len * 0.8)} -4 ${f(-len * 0.4)} 0 0Z"/>`;
    }
    return `<g transform="translate(${f(x)} ${f(gy * SQ)}) scale(${f(depthScale(gy) * size * (flip ? -1 : 1))} ${f(depthScale(gy) * size)})">${fronds}</g>`;
  };
  for (let i = 0; i < 10; i++) {
    const left = i % 2 === 0;
    ferns += fern(left ? -120 + rnd() * 380 : 1740 + rnd() * 380, 900 + rnd() * 380, 0.9 + rnd() * 0.6, !left);
  }

  group.innerHTML = `
    <rect class="ground-base" x="-8000" y="-8" width="18000" height="5000" fill="url(#g-ground)"/>
    <rect x="-8000" y="-30" width="18000" height="90" fill="url(#g-mist)" class="mist"/>
    ${patches}
    <path class="trail" d="${trailShape()}"/>
    ${shrubs}${pebbles}${flowers}${tufts}${ferns}
  `;
}

export function buildFireflies(group) {
  const rnd = seededRandom("fireflies");
  let out = "";
  for (let i = 0; i < 34; i++) {
    const x = -100 + rnd() * (WORLD.width + 200);
    const y = -260 + rnd() * 900;
    const style = `--fx:${f((rnd() - 0.5) * 120)}px;--fy:${f((rnd() - 0.5) * 80)}px;--ft:${f(9 + rnd() * 10)}s;--fd:${f(-rnd() * 18)}s;--bt:${f(2 + rnd() * 3)}s`;
    out += `<g transform="translate(${f(x)} ${f(y)})"><g class="firefly${i % 3 ? " night-only" : ""}" style="${style}"><circle class="ff-glow" r="13"/><circle class="ff-core" r="1.8"/></g></g>`;
  }
  group.innerHTML = out;
}

export function buildStars(container) {
  const rnd = seededRandom("stars");
  let out = "";
  for (let i = 0; i < 110; i++) {
    const size = rnd() < 0.85 ? 1 + rnd() : 2 + rnd() * 1.2;
    out += `<span style="left:${f(rnd() * 100)}%;top:${f(Math.pow(rnd(), 1.4) * 62)}%;width:${f(size)}px;height:${f(size)}px;--tw:${f(2 + rnd() * 5)}s;--td:${f(-rnd() * 6)}s"></span>`;
  }
  container.innerHTML = out;
}

export function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
