// Procedural SVG plants. Every plant is drawn once at full size with all of its
// parts; the status (data-status) decides through CSS which parts are grown, so
// changing status animates smoothly instead of swapping drawings.
//
// Part classes:   p-s seed only · p-g growing and later · p-gonly growing only
//                 p-b bloomed only · p-d dormant only · fall = dropped when dormant

import { seededRandom } from "./model.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

const PALETTES = {
  thought: ["#E8B4B8", "#8FB8D8", "#EAD9A8", "#C9B6E4", "#F2C2A0"],
  idea: ["#8FB8D8", "#9ED9C9", "#C9B6E4", "#A9C9F0"],
  project: ["#E8B4B8", "#F3DDE1", "#EAD9A8"],
  goal: ["#D8C99B", "#C9B6E4", "#E8B4B8", "#8FB8D8"],
};

const f = (n) => Math.round(n * 10) / 10;

/** A leaf pointing up from the origin. */
function leaf(len, w, cls = "c-leaf") {
  return `<path class="${cls}" d="M0 0 C ${f(w)} ${f(-len * 0.25)} ${f(w * 0.85)} ${f(-len * 0.75)} 0 ${f(-len)} C ${f(-w * 0.85)} ${f(-len * 0.75)} ${f(-w)} ${f(-len * 0.25)} 0 0Z"/>` +
    `<path class="c-rib" d="M0 -1 L0 ${f(-len * 0.82)}"/>`;
}

function part(classes, x, y, rotate, inner, delay = 0, scale = 1) {
  const s = scale === 1 ? "" : ` scale(${f(scale)})`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rotate)})${s}"><g class="part ${classes}" style="--d:${f(delay)}s">${inner}</g></g>`;
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** The seed stage: a small sprout pushing out of a mound, the same for every type. */
function seedling(type) {
  const tall = { thought: 22, idea: 20, project: 28, goal: 32 }[type];
  const leafSize = type === "project" ? 13 : 11;
  const bend = type === "goal" ? 2 : -2;
  const spark = type === "idea" || type === "goal"
    ? `<g transform="translate(${bend} ${-tall - 8})"><g class="part p-s seed-spark" style="--d:.5s"><circle class="c-glow-warm" r="11"/><circle class="c-spark" r="2.2"/></g></g>`
    : "";
  return `<g class="seedling">` +
    `<path class="c-stem seedling-stem" d="M0 0 C 2 ${f(-tall * 0.35)} ${f(bend - 2)} ${f(-tall * 0.7)} ${bend} ${-tall}"/>` +
    part("p-s", bend, -tall, -58, leaf(leafSize, leafSize * 0.55), 0.3) +
    part("p-s", bend, -tall, 58, leaf(leafSize * 0.9, leafSize * 0.5, "c-leaf-2"), 0.4) +
    spark +
    `</g>`;
}

function cotyledons(x, y, size) {
  return part("p-s", x, y, -52, leaf(size, size * 0.42), 0.15) +
    part("p-s", x, y, 52, leaf(size, size * 0.42), 0.25);
}

function flowerHead(r, petals = 6) {
  let out = "";
  for (let i = 0; i < petals; i++) {
    out += `<ellipse class="c-petal" cx="0" cy="${f(-r)}" rx="${f(r * 0.55)}" ry="${f(r)}" transform="rotate(${f((360 / petals) * i)})"/>`;
  }
  for (let i = 0; i < petals; i++) {
    out += `<ellipse class="c-petal-2" cx="0" cy="${f(-r * 0.7)}" rx="${f(r * 0.22)}" ry="${f(r * 0.5)}" transform="rotate(${f((360 / petals) * i + 180 / petals)})"/>`;
  }
  return `<g class="bloom-head">${out}<circle class="c-center" r="${f(r * 0.42)}"/><circle class="c-center-hi" cx="${f(-r * 0.12)}" cy="${f(-r * 0.14)}" r="${f(r * 0.15)}"/></g>`;
}

function blossom(r) {
  let out = "";
  for (let i = 0; i < 5; i++) out += `<circle class="c-petal" cx="0" cy="${f(-r)}" r="${f(r * 0.85)}" transform="rotate(${i * 72})"/>`;
  return out + `<circle class="c-center" r="${f(r * 0.6)}"/>`;
}

function mushroom(w, h, spots) {
  const half = w / 2;
  const stalk = `<path class="c-stalk" d="M${f(-w * 0.09)} 0 C ${f(-w * 0.12)} ${f(-h * 0.4)} ${f(-w * 0.06)} ${f(-h * 0.75)} ${f(-w * 0.04)} ${f(-h)} L ${f(w * 0.04)} ${f(-h)} C ${f(w * 0.07)} ${f(-h * 0.75)} ${f(w * 0.12)} ${f(-h * 0.4)} ${f(w * 0.09)} 0Z"/>`;
  const cap = `<path class="c-cap" d="M${f(-half)} ${f(-h + 3)} C ${f(-half)} ${f(-h - half * 0.7)} ${f(-half * 0.45)} ${f(-h - half)} 0 ${f(-h - half)} C ${f(half * 0.45)} ${f(-h - half)} ${f(half)} ${f(-h - half * 0.7)} ${f(half)} ${f(-h + 3)} C ${f(half * 0.5)} ${f(-h - 1)} ${f(-half * 0.5)} ${f(-h - 1)} ${f(-half)} ${f(-h + 3)}Z"/>`;
  const gills = `<path class="c-gills" d="M${f(-half * 0.8)} ${f(-h + 1.5)} Q 0 ${f(-h + 4)} ${f(half * 0.8)} ${f(-h + 1.5)}"/>`;
  const dots = spots
    .map(([x, y, r]) => `<circle class="c-spot" cx="${f(x * half)}" cy="${f(-h - half * y)}" r="${f(r * half)}"/>`)
    .join("");
  return stalk + cap + gills + dots;
}

function thought(rnd, lean) {
  const top = { x: lean, y: -88 };
  let s = `<path class="c-stem" d="M0 0 C ${f(lean * 0.2)} -30 ${f(lean * 0.9)} -55 ${f(top.x)} ${f(top.y)}"/>`;
  s += part("p-g", lean * 0.12, -22, -58 + rnd() * 10, leaf(27, 9), 0.1);
  s += part("p-g fall", lean * 0.45, -42, 52 + rnd() * 10, leaf(22, 8, "c-leaf-2"), 0.25);
  s += cotyledons(top.x, top.y, 15);
  s += part("p-gonly", top.x, top.y, lean * 0.4,
    `<path class="c-bud" d="M0 3 C -7 -3 -5 -15 0 -19 C 5 -15 7 -3 0 3Z"/><path class="c-leaf" d="M0 2 C -6 -1 -7 -6 -6 -9 C -3 -6 -1 -3 0 2Z M0 2 C 6 -1 7 -6 6 -9 C 3 -6 1 -3 0 2Z"/>`, 0.4);
  s += part("p-b", top.x, top.y, 0, `<g class="breathe">${flowerHead(12)}</g>`, 0.45);
  if (rnd() > 0.35) {
    s += part("p-b", lean * 0.32, -46, 0,
      `<path class="c-stem thin" d="M0 0 Q -9 -6 -19 -22"/><g transform="translate(-19 -22) scale(.5)">${flowerHead(12, 5)}</g>`, 0.8);
  }
  if (rnd() > 0.45) {
    s += part("p-b", lean * 0.15, -28, 0,
      `<path class="c-stem thin" d="M0 0 Q 9 -4 17 -15"/><g transform="translate(17 -15) scale(.42)">${flowerHead(12, 5)}</g>`, 1);
  }
  return { body: s, height: 112, width: 60 };
}

function idea(rnd, lean) {
  const spotsA = [[-0.45, 0.45, 0.12], [0.25, 0.7, 0.1], [0.5, 0.3, 0.08], [-0.05, 0.25, 0.07]];
  let s = `<circle class="c-glow" cx="0" cy="-52" r="46"/>`;
  s += `<g transform="rotate(${f(lean * 0.25)})">${mushroom(46, 46, spotsA)}</g>`;
  s += part("p-s", 0, -70, 0, `<circle class="c-spark" r="3"/>`, 0.4);
  s += part("p-g", -22, 2, -8 - rnd() * 6, mushroom(28, 26, [[-0.3, 0.5, 0.14], [0.35, 0.45, 0.1]]), 0.25);
  s += part("p-b fall", 20, 2, 10 + rnd() * 6, mushroom(22, 20, [[0.1, 0.55, 0.15]]), 0.45);
  s += part("p-g", 8, 0, 28, leaf(18, 6), 0.35);
  let spores = "";
  for (let i = 0; i < 6; i++) {
    const x = (rnd() - 0.5) * 60;
    const y = -70 - rnd() * 40;
    spores += `<circle class="spore" cx="${f(x)}" cy="${f(y)}" r="${f(1.2 + rnd() * 1.6)}" style="--sd:${f(rnd() * 4)}s"/>`;
  }
  s += part("p-b", 0, 0, 0, spores, 0.9);
  return { body: s, height: 100, width: 70 };
}

function project(rnd, lean) {
  const top = { x: lean, y: -150 };
  const crown = { x: lean, y: -178 };
  let s = `<path class="c-trunk" d="M-12 2 C -8 -50 ${f(lean - 7)} -100 ${f(lean - 4)} -150 L ${f(lean + 4)} -150 C ${f(lean + 8)} -100 8 -50 12 2Z"/>`;
  s += `<path class="c-trunk" d="M-12 2 Q -20 4 -24 7 L 24 7 Q 20 4 12 2Z"/>`;
  s += `<path class="c-branch" d="M${f(lean * 0.45)} -92 Q ${f(lean * 0.3 - 24)} -118 ${f(lean - 40)} -152"/>`;
  s += `<path class="c-branch" d="M${f(lean * 0.65)} -112 Q ${f(lean + 22)} -130 ${f(lean + 42)} -166"/>`;
  s += `<path class="c-bark" d="M-3 -18 Q -1 -40 -4 -62 M4 -60 Q 6 -84 3 -100"/>`;
  s += cotyledons(top.x, top.y, 26);

  const blobs = [
    [-40, 14, 40, "c-leaf-3", ""], [38, 10, 42, "c-leaf-3", "fall"], [0, -14, 52, "c-leaf", ""],
    [-22, -48, 38, "c-leaf-2", "fall"], [24, -44, 40, "c-leaf-2", ""], [0, -66, 30, "c-leaf-2", ""],
  ];
  blobs.forEach(([x, y, r, cls, extra], i) => {
    const hi = `<circle class="c-leaf-hi" cx="${f(-r * 0.3)}" cy="${f(-r * 0.35)}" r="${f(r * 0.45)}"/>`;
    s += part(`p-g ${extra}`, crown.x + x, crown.y + y, 0, `<circle class="${cls}" r="${r}"/>${hi}`, 0.08 * i);
  });
  const outer = [[-66, -10, 30, "c-leaf-3"], [64, -18, 30, "c-leaf-3"], [-4, -96, 30, "c-leaf-2"], [-46, -64, 26, "c-leaf-2"], [48, -70, 26, "c-leaf-2"]];
  outer.forEach(([x, y, r, cls], i) => {
    const hi = `<circle class="c-leaf-hi" cx="${f(-r * 0.3)}" cy="${f(-r * 0.35)}" r="${f(r * 0.45)}"/>`;
    s += part("p-b", crown.x + x, crown.y + y, 0, `<circle class="${cls}" r="${r}"/>${hi}`, 0.25 + i * 0.1);
  });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd());
    const x = crown.x + Math.cos(a) * 78 * d;
    const y = crown.y - 22 + Math.sin(a) * 62 * d;
    s += part("p-b", x, y, rnd() * 72, blossom(3 + rnd() * 2.2), 0.7 + rnd() * 0.7);
  }
  return { body: s, height: 300, width: 200 };
}

function goal(rnd, lean) {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: lean * 0.3, y: -100 };
  const p2 = { x: lean * 0.8, y: -200 };
  const p3 = { x: lean, y: -290 };
  const at = (t) => cubic(p0, p1, p2, p3, t);
  let s = `<path class="c-stem goal-stem" d="M0 0 C ${f(p1.x)} ${f(p1.y)} ${f(p2.x)} ${f(p2.y)} ${f(p3.x)} ${f(p3.y)}"/>`;
  [-38, -16, 14, 36].forEach((r, i) => {
    s += part(`p-g${i === 1 ? " fall" : ""}`, 0, 0, r + rnd() * 6, leaf(74 - Math.abs(r) * 0.4, 10, i % 2 ? "c-leaf-2" : "c-leaf"), 0.05 * i);
  });
  const l1 = at(0.33);
  const l2 = at(0.48);
  const l3 = at(0.2);
  const l4 = at(0.6);
  s += part("p-g", l3.x, l3.y, 64, leaf(36, 9, "c-leaf-2"), 0.2);
  s += part("p-g", l1.x, l1.y, -62, leaf(34, 9), 0.25);
  s += part("p-g fall", l2.x, l2.y, 58, leaf(30, 8, "c-leaf-2"), 0.35);
  s += part("p-g fall", l4.x, l4.y, -56, leaf(24, 7), 0.4);
  s += cotyledons(p3.x, p3.y, 22);

  for (let i = 0; i < 6; i++) {
    const p = at(0.66 + i * 0.06);
    const side = i % 2 ? 1 : -1;
    s += part("p-gonly", p.x + side * 4, p.y, side * 30, `<ellipse class="c-bud" cx="0" cy="-5" rx="3.6" ry="6"/>`, 0.4 + i * 0.05);
  }
  const bells = 10;
  for (let i = 0; i < bells; i++) {
    const t = 0.58 + (i / (bells - 1)) * 0.38;
    const p = at(t);
    const side = i % 2 ? 1 : -1;
    const size = 1.25 - (i / bells) * 0.6;
    const bell = `<path class="c-petal" d="M0 0 C -7 1 -9 8 -8 14 C -4 12 4 12 8 14 C 9 8 7 1 0 0Z"/><path class="c-petal-2" d="M-6 13 C -2 11 2 11 6 13 C 3 15 -3 15 -6 13Z"/>`;
    s += part("p-b", p.x + side * 5 * size, p.y, side * 38, bell, 0.35 + i * 0.09, size);
  }
  s += part("p-b", p3.x, p3.y - 6, 0,
    `<circle class="c-glow-warm" r="26"/><path class="c-star" d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z"/>`, 1.3);
  return { body: s, height: 320, width: 80 };
}

const BUILDERS = { thought, idea, project, goal };

function fallenLeaves(rnd, spread) {
  let out = "";
  for (let i = 0; i < 6; i++) {
    const x = (rnd() - 0.5) * spread;
    const y = (rnd() - 0.3) * 10;
    out += part("p-d", x, y, rnd() * 180 - 90, leaf(9 + rnd() * 4, 4, "c-fallen"), 0.4 + i * 0.12, 1);
  }
  return out;
}

/** Visual parameters derived from the id, so each plant is unique but stable. */
function traits(item) {
  const rnd = seededRandom(item.id);
  const palette = PALETTES[item.type];
  const petal = palette[Math.floor(rnd() * palette.length)];
  const lean = (rnd() - 0.5) * (item.type === "project" ? 18 : 22);
  const swayDelay = -rnd() * 8;
  const swayDuration = 5 + rnd() * 3;
  return { rnd, petal, lean, swayDelay, swayDuration };
}

/** Inner markup of a plant (without positioning). */
export function plantMarkup(item) {
  const t = traits(item);
  const built = BUILDERS[item.type](t.rnd, t.lean);
  const shadowRx = { thought: 20, idea: 30, project: 70, goal: 30 }[item.type];
  const hitW = built.width;
  const hitH = built.height;
  return {
    style: `--petal:${t.petal};--sway-d:${f(t.swayDelay)}s;--sway-t:${f(t.swayDuration)}s`,
    html:
      `<g class="plant-inner">` +
      `<g class="stage-scale"><ellipse class="shadow" cx="0" cy="3" rx="${shadowRx}" ry="${f(shadowRx * 0.24)}"/></g>` +
      `<g class="soil"><ellipse class="mound" cx="0" cy="1" rx="17" ry="5"/><ellipse class="crack" cx="0" cy="1" rx="22" ry="6"/></g>` +
      part("p-s seed-shell", 11, -2, 25, `<ellipse class="c-seed" rx="4.5" ry="3"/><ellipse class="c-seed-hi" cx="-1.2" cy="-1" rx="1.8" ry="1"/>`, 0.2) +
      seedling(item.type) +
      fallenLeaves(t.rnd, shadowRx * 1.6) +
      `<g class="sway"><g class="body">` +
      `<ellipse class="halo" cx="0" cy="${f(-hitH * 0.45)}" rx="${f(hitW * 0.75)}" ry="${f(hitH * 0.6)}"/>` +
      built.body +
      `<rect class="hit" x="${f(-hitW / 2)}" y="${f(-hitH)}" width="${f(hitW)}" height="${f(hitH)}" rx="20"/>` +
      `</g></g>` +
      `<circle class="hit" cx="0" cy="-14" r="24"/>` +
      `<g class="drop"><circle class="drop-glow" r="12"/><circle class="drop-core" r="3.5"/></g>` +
      `</g>`,
  };
}

export function createPlantElement(item) {
  const g = document.createElementNS(SVG_NS, "g");
  const { style, html } = plantMarkup(item);
  g.setAttribute("class", "plant");
  g.setAttribute("style", style);
  g.dataset.id = item.id;
  g.dataset.type = item.type;
  g.dataset.status = item.status;
  g.innerHTML = html;
  return g;
}

/** Standalone SVG for previews (panel, type picker, roots surface). */
export function plantPreviewSVG(item, { status = item.status, className = "" } = {}) {
  const { style, html } = plantMarkup(item);
  const box = { thought: [-55, -125, 110, 135], idea: [-55, -120, 110, 130], project: [-150, -310, 300, 325], goal: [-90, -340, 180, 350] }[item.type];
  return `<svg class="plant-preview ${className}" viewBox="${box.join(" ")}" aria-hidden="true">` +
    `<g class="plant" data-type="${item.type}" data-status="${status}" style="${style}">${html}</g></svg>`;
}
