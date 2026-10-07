// Pan / zoom for an SVG group: mouse drag, wheel, trackpad pinch, touch pinch,
// inertia and animated flights. screen = world * k + (x, y)

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Camera {
  constructor(svg, group, { minK = 0.25, maxK = 3, bounds, onChange, onTap } = {}) {
    this.svg = svg;
    this.group = group;
    this.minK = minK;
    this.maxK = maxK;
    this.bounds = bounds; // world rect the view centre must stay inside
    this.onChange = onChange;
    this.onTap = onTap;
    this.x = 0;
    this.y = 0;
    this.k = 1;
    this.pointers = new Map();
    this.velocity = { x: 0, y: 0 };
    this.anim = null;
    this.enabled = true;
    this.attach();
  }

  get width() {
    return this.svg.clientWidth;
  }

  get height() {
    return this.svg.clientHeight;
  }

  apply() {
    this.clamp();
    this.group.setAttribute("transform", `translate(${this.x.toFixed(2)} ${this.y.toFixed(2)}) scale(${this.k.toFixed(4)})`);
    this.onChange?.(this);
  }

  clamp() {
    this.k = Math.min(this.maxK, Math.max(this.minK, this.k));
    if (!this.bounds) return;
    const c = this.toWorld(this.width / 2, this.height / 2);
    const cx = Math.min(this.bounds.x1, Math.max(this.bounds.x0, c.x));
    const cy = Math.min(this.bounds.y1, Math.max(this.bounds.y0, c.y));
    this.x += (c.x - cx) * this.k;
    this.y += (c.y - cy) * this.k;
  }

  toWorld(sx, sy) {
    return { x: (sx - this.x) / this.k, y: (sy - this.y) / this.k };
  }

  toScreen(wx, wy) {
    return { x: wx * this.k + this.x, y: wy * this.k + this.y };
  }

  visibleRect() {
    const a = this.toWorld(0, 0);
    const b = this.toWorld(this.width, this.height);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
  }

  zoomAt(sx, sy, factor) {
    const k = Math.min(this.maxK, Math.max(this.minK, this.k * factor));
    const w = this.toWorld(sx, sy);
    this.k = k;
    this.x = sx - w.x * k;
    this.y = sy - w.y * k;
    this.apply();
  }

  /** Camera that fits the given world rect, with screen-space padding. */
  fitRect(rect, pad = { top: 90, right: 40, bottom: 130, left: 40 }) {
    const w = Math.max(1, this.width - pad.left - pad.right);
    const h = Math.max(1, this.height - pad.top - pad.bottom);
    const k = Math.min(this.maxK, Math.max(this.minK, Math.min(w / (rect.x1 - rect.x0), h / (rect.y1 - rect.y0))));
    return {
      k,
      x: pad.left + (w - (rect.x1 - rect.x0) * k) / 2 - rect.x0 * k,
      y: pad.top + (h - (rect.y1 - rect.y0) * k) / 2 - rect.y0 * k,
    };
  }

  /** Target that centres a world point at the given screen fraction. */
  focusOn(wx, wy, k = this.k, fx = 0.5, fy = 0.5) {
    return { k, x: this.width * fx - wx * k, y: this.height * fy - wy * k };
  }

  set({ x, y, k }) {
    this.stop();
    Object.assign(this, { x, y, k });
    this.apply();
  }

  flyTo(target, duration = 900) {
    this.stop();
    const from = { x: this.x, y: this.y, k: this.k };
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOut(t);
      // Interpolate zoom geometrically so the motion feels even.
      this.k = from.k * Math.pow(target.k / from.k, e);
      this.x = from.x + (target.x - from.x) * e;
      this.y = from.y + (target.y - from.y) * e;
      this.apply();
      this.anim = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.anim = requestAnimationFrame(step);
  }

  stop() {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = null;
  }

  attach() {
    const svg = this.svg;
    svg.addEventListener("pointerdown", (e) => this.onDown(e));
    svg.addEventListener("pointermove", (e) => this.onMove(e));
    svg.addEventListener("pointerup", (e) => this.onUp(e));
    svg.addEventListener("pointercancel", (e) => this.onUp(e, true));
    svg.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    window.addEventListener("resize", () => this.apply());
  }

  local(e) {
    const r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    if (!this.enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    this.stop();
    const p = this.local(e);
    this.pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y, target: e.target, time: performance.now() });
    this.moved = this.pointers.size > 1 ? true : false;
    this.last = { ...p, time: performance.now() };
    this.velocity = { x: 0, y: 0 };
    if (this.pointers.size === 2) this.pinch = this.pinchState();
  }

  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  onMove(e) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    const p = this.local(e);
    const dx = p.x - ptr.x;
    const dy = p.y - ptr.y;
    ptr.x = p.x;
    ptr.y = p.y;

    if (this.pointers.size === 2) {
      const next = this.pinchState();
      const factor = next.dist / Math.max(1, this.pinch.dist);
      this.x += next.mid.x - this.pinch.mid.x;
      this.y += next.mid.y - this.pinch.mid.y;
      this.zoomAt(next.mid.x, next.mid.y, factor);
      this.pinch = next;
      return;
    }

    if (!this.moved && Math.hypot(p.x - ptr.startX, p.y - ptr.startY) < 6) return;
    if (!this.moved) {
      this.moved = true;
      this.svg.setPointerCapture?.(e.pointerId);
      this.svg.classList.add("is-panning");
      this.onPanStart?.();
    }
    this.x += dx;
    this.y += dy;
    const now = performance.now();
    const dt = Math.max(1, now - this.last.time);
    this.velocity = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    this.last = { ...p, time: now };
    this.apply();
  }

  onUp(e, cancelled = false) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    this.pointers.delete(e.pointerId);
    this.svg.classList.remove("is-panning");
    if (this.pointers.size === 1) {
      // Finishing a pinch: continue panning with the remaining finger.
      const [rest] = this.pointers.values();
      rest.startX = rest.x;
      rest.startY = rest.y;
      return;
    }
    if (!this.moved && !cancelled) {
      this.onTap?.(ptr.target, e);
      return;
    }
    if (this.moved && performance.now() - this.last.time < 80) this.glide();
  }

  glide() {
    let { x: vx, y: vy } = this.velocity;
    const step = () => {
      vx *= 0.92;
      vy *= 0.92;
      this.x += vx;
      this.y += vy;
      this.apply();
      this.anim = Math.hypot(vx, vy) > 0.3 ? requestAnimationFrame(step) : null;
    };
    this.anim = requestAnimationFrame(step);
  }

  onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this.stop();
    const p = this.local(e);
    // Trackpad pinch arrives as ctrl+wheel; a plain two-finger scroll pans.
    if (e.ctrlKey) {
      this.zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.012));
    } else if (e.deltaMode === 0 && (Math.abs(e.deltaX) > 1 || (Math.abs(e.deltaY) < 60 && !Number.isInteger(e.deltaY)))) {
      this.x -= e.deltaX;
      this.y -= e.deltaY;
      this.apply();
    } else {
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      this.zoomAt(p.x, p.y, Math.exp(-delta * 0.0015));
    }
  }
}
