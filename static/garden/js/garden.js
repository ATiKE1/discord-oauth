import { Camera } from "./camera.js";
import { buildDefs, buildFarLayer, buildGround, buildFireflies, svgEl } from "./scene.js";
import { createPlantElement } from "./plants.js";
import { VineLayer, pairKey } from "./vines.js";
import { depthScale, statusAt, seededRandom, project, WORLD, DEPTH_SQUASH } from "./model.js";
import { showTooltip, hideTooltip } from "./ui.js";

const f = (n) => Math.round(n * 10) / 10;

export class GardenView {
  constructor(store, { onPlantTap, onBackgroundTap }) {
    this.store = store;
    this.svg = document.getElementById("garden");
    this.plantsLayer = document.getElementById("plants");
    this.fx = document.getElementById("fx");
    this.plants = new Map();
    this.order = "";

    buildDefs(document.getElementById("defs"));
    buildFarLayer(document.getElementById("parallax-far"));
    buildGround(document.getElementById("ground"));
    buildFireflies(document.getElementById("fireflies"));
    this.farLayers = [...document.querySelectorAll("#parallax-far .far")];
    this.vines = new VineLayer(document.getElementById("vines"));

    this.camera = new Camera(this.svg, document.getElementById("camera"), {
      minK: 0.2,
      maxK: 3.2,
      bounds: { x0: -150, x1: WORLD.width + 150, y0: -380, y1: WORLD.depth * DEPTH_SQUASH + 80 },
      onChange: (cam) => this.onCamera(cam),
      onTap: (target) => {
        const plant = target.closest?.(".plant");
        if (plant && !plant.classList.contains("is-future")) onPlantTap(plant.dataset.id);
        else onBackgroundTap();
      },
    });
    this.camera.onPanStart = hideTooltip;

    this.svg.addEventListener("pointerover", (e) => {
      if (e.pointerType !== "mouse") return;
      const plant = e.target.closest(".plant");
      if (!plant || plant === this.hovered || plant.classList.contains("is-future")) return;
      this.hovered = plant;
      const item = store.get(plant.dataset.id);
      if (item) showTooltip(item, plant.querySelector(".body").getBoundingClientRect(), plant.dataset.status);
    });
    this.svg.addEventListener("pointerout", (e) => {
      const plant = e.target.closest(".plant");
      if (plant && !plant.contains(e.relatedTarget)) {
        this.hovered = null;
        hideTooltip();
      }
    });

    this.camera.set(this.fitTarget());
  }

  onCamera(cam) {
    const w = cam.width;
    for (const layer of this.farLayers) {
      const p = Number(layer.dataset.parallax);
      const k = Math.pow(cam.k, p) * 0.9;
      const centre = cam.x + (WORLD.width / 2) * cam.k;
      const tx = w / 2 + (centre - w / 2) * p;
      layer.setAttribute("transform", `translate(${f(tx)} ${f(cam.y)}) scale(${k.toFixed(4)})`);
    }
    if (this.hovered) {
      this.hovered = null;
      hideTooltip();
    }
  }

  fitTarget() {
    const items = this.store.state.items;
    let x0 = 260, x1 = 1740, y0 = -330, y1 = 520;
    for (const { position, type } of items) {
      const p = project(position);
      const tall = { project: 300, goal: 330, thought: 110, idea: 110 }[type] * depthScale(position.y);
      x0 = Math.min(x0, p.x - 110);
      x1 = Math.max(x1, p.x + 110);
      y0 = Math.min(y0, p.y - tall - 120);
      y1 = Math.max(y1, p.y + 30);
    }
    const { width: w, height: h } = this.camera;
    if (w / h < 0.9) {
      // Portrait: fill the height and let the sides run off-screen (pan to explore).
      const pad = { top: 90, bottom: 150 };
      const byHeight = (h - pad.top - pad.bottom) / (y1 - y0);
      const k = Math.min(byHeight, (w / (x1 - x0)) * 1.6);
      const cx = (x0 + x1) / 2;
      return { k, x: w / 2 - cx * k, y: pad.top + (h - pad.top - pad.bottom - (y1 - y0) * k) / 2 - y0 * k };
    }
    return this.camera.fitRect({ x0, x1, y0, y1 }, { top: 96, right: 60, bottom: 140, left: 60 });
  }

  resetView() {
    this.camera.flyTo(this.fitTarget(), 1000);
  }

  /** The open, unobstructed part of the screen, in garden (unprojected) coordinates. */
  plantableRect() {
    const { width: w, height: h } = this.camera;
    const a = this.camera.toWorld(w * 0.12, h * 0.42);
    const b = this.camera.toWorld(w * 0.88, h - 150);
    return { x0: a.x, x1: b.x, y0: a.y / DEPTH_SQUASH, y1: b.y / DEPTH_SQUASH };
  }

  /** Bring a plant into view (and slightly zoom in) unless it is already comfortably visible. */
  focusItem(id, { force = false, zoom } = {}) {
    const item = this.store.get(id);
    if (!item) return;
    const { x, y } = project(item.position);
    const s = this.camera.toScreen(x, y);
    const w = this.camera.width;
    const h = this.camera.height;
    const selected = !!this.store.state.selectedId;
    const sheet = selected && w <= 760; // mobile bottom sheet covers the lower part
    const side = selected && w > 760; // desktop panel covers the right side
    const fx = side ? 0.36 : 0.5;
    const fy = sheet ? 0.3 : 0.66;
    const comfy = sheet
      ? s.x > w * 0.15 && s.x < w * 0.85 && s.y > h * 0.22 && s.y < h * 0.36
      : s.x > w * 0.12 && s.x < w * (side ? 0.62 : 0.88) && s.y > h * 0.3 && s.y < h * 0.82;
    if (comfy && !force) return;
    const k = zoom ?? Math.max(this.camera.k, Math.min(1.1, this.fitTarget().k * (sheet ? 1 : 1.35)));
    this.camera.flyTo(this.camera.focusOn(x, y - 60 * depthScale(item.position.y), k, fx, fy), 900);
  }

  render(change = {}) {
    const { items, selectedId, viewDate, connectFrom } = this.store.state;
    const visible = new Set();
    const seen = new Set();

    for (const item of items) {
      seen.add(item.id);
      let el = this.plants.get(item.id);
      if (el && el.dataset.type !== item.type) {
        el.remove();
        el = null;
      }
      if (!el) {
        el = createPlantElement(item);
        this.plants.set(item.id, el);
        this.plantsLayer.append(el);
      }
      const s = depthScale(item.position.y);
      const p = project(item.position);
      el.setAttribute("transform", `translate(${p.x} ${f(p.y)}) scale(${s.toFixed(3)})`);
      const status = statusAt(item, viewDate);
      el.dataset.status = status ?? item.status;
      el.classList.toggle("is-future", status === null);
      el.classList.toggle("is-selected", item.id === selectedId);
      el.classList.toggle("is-source", item.id === connectFrom);
      el.classList.toggle("is-linked", !!connectFrom && this.store.get(connectFrom)?.connections.includes(item.id));
      el.setAttribute("aria-label", item.title);
      if (status !== null) visible.add(item.id);
    }

    for (const [id, el] of this.plants) {
      if (!seen.has(id)) {
        this.plants.delete(id);
        el.classList.add("is-uprooting");
        setTimeout(() => el.remove(), 700);
      }
    }

    // Painter's order: plants further back are drawn first.
    const sorted = items.slice().sort((a, b) => a.position.y - b.position.y);
    const order = sorted.map((i) => i.id).join();
    if (order !== this.order) {
      this.order = order;
      for (const item of sorted) this.plantsLayer.append(this.plants.get(item.id));
    }

    const grow = change.type === "connect" ? { key: pairKey(change.id, change.other), from: change.id } : null;
    this.vines.render(items, { visible, selectedId, grow });
    this.svg.classList.toggle("connect-mode", !!connectFrom);
  }

  plantElement(id) {
    return this.plants.get(id);
  }

  playPlanting(id) {
    const el = this.plants.get(id);
    if (!el) return;
    el.classList.add("is-planting");
    setTimeout(() => this.burst(id, "soil"), 620);
    setTimeout(() => this.burst(id, "sprout"), 1300);
    setTimeout(() => el.classList.remove("is-planting"), 2400);
  }

  playStatusChange(id, status) {
    const el = this.plants.get(id);
    if (!el) return;
    el.classList.remove("is-changing");
    void el.getBoundingClientRect();
    el.classList.add("is-changing");
    setTimeout(() => el.classList.remove("is-changing"), 1100);
    if (status === "bloomed") setTimeout(() => this.burst(id, "bloom"), 900);
    if (status === "dormant") setTimeout(() => this.burst(id, "autumn"), 300);
    if (status === "growing") setTimeout(() => this.burst(id, "sprout"), 500);
  }

  burst(id, kind) {
    const item = this.store.get(id);
    const el = this.plants.get(id);
    if (!item || !el) return;
    const s = depthScale(item.position.y);
    const height = { project: 200, goal: 280, thought: 80, idea: 70 }[item.type];
    const rnd = seededRandom(id + kind + Date.now());
    const p = project(item.position);
    const g = svgEl("g", { class: `burst burst-${kind}`, transform: `translate(${p.x} ${f(p.y)}) scale(${s.toFixed(3)})` });
    const petal = getComputedStyle(el).getPropertyValue("--petal").trim() || "#E8B4B8";
    const config = {
      bloom: { n: 26, cy: -height * 0.8, spread: 150, rise: 120, colors: [petal, "#F5E3A0", "#FFF6D8", petal] },
      sprout: { n: 10, cy: -24, spread: 50, rise: 50, colors: ["#BFE3A6", "#F5E3A0", "#E4F2C8"] },
      soil: { n: 12, cy: -2, spread: 46, rise: 26, colors: ["#8A6A48", "#6E5338", "#A88462"] },
      autumn: { n: 12, cy: -height * 0.7, spread: 110, rise: -140, colors: ["#C98A4B", "#B5623A", "#D9A85B"] },
    }[kind];

    if (kind === "bloom") {
      g.append(svgEl("ellipse", { class: "burst-ring", cx: 0, cy: f(config.cy), rx: 40, ry: 40 }));
    }
    for (let i = 0; i < config.n; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = config.spread * (0.4 + rnd() * 0.6);
      const tx = Math.cos(angle) * dist;
      const ty = kind === "autumn" ? -config.rise * (0.6 + rnd() * 0.6) : Math.sin(angle) * dist * 0.6 - config.rise * rnd();
      const r = kind === "soil" ? 1.6 + rnd() * 2 : 1.8 + rnd() * 2.6;
      const shape = kind === "autumn"
        ? svgEl("ellipse", { rx: f(r * 1.6), ry: f(r * 0.8) })
        : svgEl("circle", { r: f(r) });
      shape.setAttribute("class", "particle");
      shape.setAttribute("fill", config.colors[i % config.colors.length]);
      shape.setAttribute("style", `--tx:${f(tx)}px;--ty:${f(ty)}px;--pd:${f(rnd() * 0.25)}s;--pt:${f(1 + rnd() * 0.9)}s;--rot:${f(rnd() * 360)}deg`);
      const wrap = svgEl("g", { transform: `translate(0 ${f(config.cy)})` });
      wrap.append(shape);
      g.append(wrap);
    }
    this.fx.append(g);
    setTimeout(() => g.remove(), 2600);
  }
}
