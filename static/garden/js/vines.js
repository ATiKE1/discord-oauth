// Organic connections: a vine lying on the ground between two plants, with
// small leaves and curls along it. New vines grow from one plant to the other.

import { seededRandom, depthScale, project } from "./model.js";
import { svgEl } from "./scene.js";

const f = (n) => Math.round(n * 10) / 10;

export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Cubic S-curve between two ground points. */
export function vinePath(from, to, seed, bulge = 0.13) {
  const rnd = seededRandom(seed);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const side = rnd() > 0.5 ? 1 : -1;
  const o1 = len * bulge * (0.6 + rnd() * 0.6) * side;
  const o2 = len * bulge * (0.3 + rnd() * 0.5) * -side;
  const c1 = { x: from.x + dx * 0.3 + nx * o1, y: from.y + dy * 0.3 + ny * o1 * 0.6 };
  const c2 = { x: from.x + dx * 0.72 + nx * o2, y: from.y + dy * 0.72 + ny * o2 * 0.6 };
  return `M${f(from.x)} ${f(from.y)} C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(to.x)} ${f(to.y)}`;
}

function leafPath(size) {
  return `M0 0 C ${f(size * 0.45)} ${f(-size * 0.3)} ${f(size * 0.4)} ${f(-size * 0.8)} 0 ${f(-size)} C ${f(-size * 0.4)} ${f(-size * 0.8)} ${f(-size * 0.45)} ${f(-size * 0.3)} 0 0Z`;
}

export class VineLayer {
  constructor(group) {
    this.group = group;
    this.vines = new Map();
  }

  render(items, { visible, selectedId, grow: growInfo }) {
    const byId = new Map(items.map((item) => [item.id, item]));
    const wanted = new Map();
    for (const item of items) {
      for (const other of item.connections) {
        if (!byId.has(other)) continue;
        const key = pairKey(item.id, other);
        if (!wanted.has(key)) wanted.set(key, [item, byId.get(other)]);
      }
    }

    for (const [key, el] of this.vines) {
      if (!wanted.has(key)) {
        el.classList.add("is-leaving");
        setTimeout(() => el.remove(), 600);
        this.vines.delete(key);
      }
    }

    for (const [key, [a, b]] of wanted) {
      let el = this.vines.get(key);
      const pa = project(a.position);
      const pb = project(b.position);
      const from = { x: pa.x, y: pa.y + 3, depth: a.position.y };
      const to = { x: pb.x, y: pb.y + 3, depth: b.position.y };
      const sig = `${from.x},${from.y},${to.x},${to.y}`;
      if (!el || el.dataset.sig !== sig) {
        el?.remove();
        // The vine grows from the plant the connection was started on.
        const grow = growInfo?.key === key;
        const start = grow && growInfo.from === b.id ? to : from;
        const end = start === from ? to : from;
        el = this.createVine(key, start, end, grow);
        el.dataset.sig = sig;
        this.vines.set(key, el);
      }
      el.classList.toggle("is-hidden", !(visible.has(a.id) && visible.has(b.id)));
      el.classList.toggle("is-active", selectedId === a.id || selectedId === b.id);
    }
  }

  createVine(key, from, to, grow) {
    const width = (depthScale(from.depth) + depthScale(to.depth)) / 2;
    const g = svgEl("g", { class: "vine", style: `--vw:${f(width)}` });
    const d = vinePath(from, to, key);
    const shadow = svgEl("path", { d, class: "vine-shadow", transform: "translate(0 3)" });
    const main = svgEl("path", { d, class: "vine-main" });
    const hi = svgEl("path", { d, class: "vine-hi" });
    const sap = svgEl("path", { d, class: "vine-sap" });
    g.append(shadow, main, hi, sap);
    this.group.append(g);

    const len = main.getTotalLength();
    const rnd = seededRandom(key + "leaves");
    const leaves = svgEl("g", { class: "vine-leaves" });
    const count = Math.max(2, Math.floor(len / 46));
    for (let i = 1; i < count; i++) {
      const at = (i / count) * len + (rnd() - 0.5) * 14;
      const p = main.getPointAtLength(at);
      const q = main.getPointAtLength(Math.min(len, at + 1));
      const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      const side = i % 2 ? 1 : -1;
      const size = (8 + rnd() * 6) * width;
      const delay = grow ? 0.25 + (at / len) * 1.3 : 0;
      const wrap = svgEl("g", { transform: `translate(${f(p.x)} ${f(p.y)}) rotate(${f(angle + 90 + side * (40 + rnd() * 25))})` });
      const leafEl = svgEl("path", { d: leafPath(size), class: `vine-leaf${rnd() > 0.6 ? " alt" : ""}`, style: `--d:${f(delay)}s` });
      wrap.append(leafEl);
      leaves.append(wrap);
      if (rnd() > 0.72) {
        const curl = svgEl("path", {
          d: `M0 0 c ${f(side * 6 * width)} ${f(-4 * width)} ${f(side * 10 * width)} ${f(2 * width)} ${f(side * 5 * width)} ${f(6 * width)} c ${f(-side * 3 * width)} ${f(2 * width)} ${f(-side * 5 * width)} ${f(-2 * width)} ${f(-side * 2 * width)} ${f(-3 * width)}`,
          class: "vine-curl",
          transform: `translate(${f(p.x)} ${f(p.y)}) rotate(${f(angle)})`,
          style: `--d:${f(delay + 0.1)}s`,
        });
        leaves.append(curl);
      }
    }
    g.append(leaves);

    for (const path of [shadow, main, hi]) {
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = grow ? `${len}` : "0";
    }
    if (grow) {
      g.classList.add("is-growing");
      // Commit the hidden state before starting the transition.
      main.getBoundingClientRect();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          for (const path of [shadow, main, hi]) path.style.strokeDashoffset = "0";
          g.classList.add("is-grown");
        });
      });
      setTimeout(() => g.classList.remove("is-growing"), 2200);
    } else {
      g.classList.add("is-grown");
    }
    return g;
  }
}
