// Underground mode: a cross-section of the soil where every plant becomes a root
// node, and connections become glowing mycelium threads — the knowledge graph.

import { Camera } from "./camera.js";
import { plantMarkup } from "./plants.js";
import { STATUSES, WORLD, seededRandom, statusAt } from "./model.js";
import { pairKey } from "./vines.js";
import { showTooltip, hideTooltip } from "./ui.js";

const f = (n) => Math.round(n * 10) / 10;

function nodePosition(item, status) {
  const growth = STATUSES[status].growth;
  return { x: item.position.x, y: 150 + growth * 330 + (item.position.y / WORLD.depth) * 260 };
}

function rootlets(rnd, from, to, growth) {
  let d = "";
  const count = 2 + Math.round(growth * 5);
  for (let i = 0; i < count; i++) {
    const t = 0.2 + rnd() * 0.7;
    const x = from.x + (to.x - from.x) * t + (rnd() - 0.5) * 10;
    const y = from.y + (to.y - from.y) * t;
    const side = rnd() > 0.5 ? 1 : -1;
    const len = (40 + rnd() * 90) * (0.4 + growth);
    const ex = x + side * len;
    const ey = y + len * (0.4 + rnd() * 0.5);
    d += `M${f(x)} ${f(y)} Q ${f(x + side * len * 0.5)} ${f(y + 6)} ${f(ex)} ${f(ey)} `;
    if (rnd() > 0.4) {
      const mx = x + side * len * 0.6;
      const my = y + len * 0.3;
      d += `M${f(mx)} ${f(my)} q ${f(side * 14)} ${f(10)} ${f(side * 18)} ${f(30 + rnd() * 20)} `;
    }
  }
  return d;
}

function soilDecor() {
  const rnd = seededRandom("soil");
  let strata = "";
  for (let i = 0; i < 5; i++) {
    const base = 120 + i * 170 + rnd() * 40;
    let d = `M-600 ${f(base)}`;
    for (let x = -600; x <= 2600; x += 80) d += ` L${x} ${f(base + Math.sin(x / 260 + i * 2) * 16 + Math.sin(x / 90 + i) * 5)}`;
    d += ` L2600 ${f(base + 60)} L-600 ${f(base + 60)}Z`;
    strata += `<path class="stratum s${i % 3}" d="${d}"/>`;
  }
  let stones = "";
  for (let i = 0; i < 40; i++) {
    const r = 4 + rnd() * 14;
    stones += `<ellipse class="stone" cx="${f(-300 + rnd() * 2600)}" cy="${f(60 + rnd() * 1100)}" rx="${f(r)}" ry="${f(r * (0.5 + rnd() * 0.3))}" transform="rotate(${f(rnd() * 40 - 20)})"/>`;
  }
  let motes = "";
  for (let i = 0; i < 50; i++) {
    motes += `<circle class="mote" cx="${f(-200 + rnd() * 2400)}" cy="${f(40 + rnd() * 1100)}" r="${f(1 + rnd() * 1.8)}" style="--md:${f(-rnd() * 6)}s"/>`;
  }
  let blades = "";
  for (let x = -600; x < 2600; x += 9) {
    const h = 8 + rnd() * 16;
    blades += `M${x} 0 q ${f(rnd() * 4)} ${f(-h / 2)} ${f(rnd() * 6 - 1)} ${f(-h)} q 1 ${f(h / 2)} 3 ${f(h)}Z `;
  }
  return `
    <rect class="roots-surface" x="-800" y="-900" width="3600" height="902" fill="url(#g-roots-surface)"/>
    <rect x="-800" y="0" width="3600" height="1600" fill="url(#g-soil)"/>
    ${strata}${stones}${motes}
    <path class="topsoil" d="M-800 0 L2800 0 L2800 14 Q 1000 26 -800 14Z"/>
    <path class="roots-grass" d="${blades}"/>
  `;
}

export class RootsView {
  constructor(store, { onNodeTap }) {
    this.store = store;
    this.svg = document.getElementById("roots");
    this.group = document.getElementById("roots-camera");
    this.group.innerHTML = `<g class="soil-decor">${soilDecor()}</g><g class="links"></g><g class="taproots"></g><g class="surface-plants"></g><g class="nodes"></g>`;
    this.camera = new Camera(this.svg, this.group, {
      minK: 0.2,
      maxK: 2.5,
      bounds: { x0: -100, x1: WORLD.width + 100, y0: -100, y1: 1000 },
      onChange: () => hideTooltip(),
      onTap: (target) => {
        const node = target.closest?.("[data-id]");
        if (node) onNodeTap(node.dataset.id);
      },
    });

    this.svg.addEventListener("pointerover", (e) => {
      if (e.pointerType !== "mouse") return;
      const node = e.target.closest(".root-node");
      if (!node) return;
      const item = store.get(node.dataset.id);
      if (item) showTooltip(item, node.getBoundingClientRect(), node.dataset.status);
    });
    this.svg.addEventListener("pointerout", (e) => {
      if (e.target.closest(".root-node")) hideTooltip();
    });
  }

  fit(animated) {
    const narrow = this.camera.width < 640;
    const target = this.camera.fitRect(
      { x0: narrow ? 300 : 120, x1: narrow ? 1700 : 1880, y0: -150, y1: 900 },
      { top: 80, right: 24, bottom: 120, left: 24 },
    );
    if (animated) this.camera.flyTo(target, 900);
    else this.camera.set(target);
  }

  render() {
    const { items, viewDate, selectedId } = this.store.state;
    const live = items
      .map((item) => ({ item, status: statusAt(item, viewDate) }))
      .filter((entry) => entry.status !== null);
    const pos = new Map(live.map(({ item, status }) => [item.id, nodePosition(item, status)]));
    // Nudge nodes apart so their labels never overlap.
    const placed = [...pos.values()].sort((a, b) => a.y - b.y);
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = placed[j];
        const b = placed[i];
        if (Math.abs(a.x - b.x) < 190 && Math.abs(a.y - b.y) < 64) b.y = a.y + 64;
      }
    }

    let taproots = "";
    let surface = "";
    let nodes = "";
    for (const { item, status } of live) {
      const p = pos.get(item.id);
      const rnd = seededRandom(item.id + "roots");
      const growth = STATUSES[status].growth;
      const top = { x: item.position.x, y: 6 };
      const wobble = (rnd() - 0.5) * 60;
      taproots += `<g class="taproot type-${item.type}${item.id === selectedId ? " is-active" : ""}">` +
        `<path class="rootlet" d="${rootlets(rnd, top, p, growth)}"/>` +
        `<path class="tap" style="--rw:${f(2 + growth * 5)}" d="M${top.x} ${top.y} C ${f(top.x + wobble)} ${f(top.y + (p.y - top.y) * 0.35)} ${f(p.x - wobble)} ${f(top.y + (p.y - top.y) * 0.7)} ${f(p.x)} ${f(p.y)}"/></g>`;

      const { style, html } = plantMarkup(item);
      surface += `<g transform="translate(${item.position.x} 4) scale(.42)"><g class="plant mini" data-type="${item.type}" data-status="${status}" style="${style}">${html}</g></g>`;

      const label = item.title.length > 24 ? item.title.slice(0, 23) + "…" : item.title;
      nodes += `<g class="root-node type-${item.type}${item.id === selectedId ? " is-selected" : ""}" data-id="${item.id}" data-status="${status}" transform="translate(${f(p.x)} ${f(p.y)})">` +
        `<circle class="node-halo" r="44"/><circle class="node-ring" r="17"/><circle class="node-core" r="${f(7 + growth * 5)}"/>` +
        `<text class="node-label" y="44">${escapeXml(label)}</text></g>`;
    }

    let links = "";
    const done = new Set();
    for (const { item } of live) {
      for (const other of item.connections) {
        const key = pairKey(item.id, other);
        if (done.has(key) || !pos.has(other)) continue;
        done.add(key);
        const a = pos.get(item.id);
        const b = pos.get(other);
        const sag = 60 + Math.abs(a.x - b.x) * 0.12;
        const d = `M${f(a.x)} ${f(a.y)} C ${f(a.x + (b.x - a.x) * 0.25)} ${f(a.y + sag)} ${f(a.x + (b.x - a.x) * 0.75)} ${f(b.y + sag)} ${f(b.x)} ${f(b.y)}`;
        const active = item.id === selectedId || other === selectedId ? " is-active" : "";
        links += `<g class="root-link${active}"><path class="link-base" d="${d}"/><path class="link-flow" d="${d}"/></g>`;
      }
    }

    this.group.querySelector(".taproots").innerHTML = taproots;
    this.group.querySelector(".surface-plants").innerHTML = surface;
    this.group.querySelector(".nodes").innerHTML = nodes;
    this.group.querySelector(".links").innerHTML = links;
    this.count = done.size;
  }
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
