/**
 * @typedef {"thought" | "idea" | "project" | "goal"} ItemType
 * @typedef {"seed" | "growing" | "bloomed" | "dormant"} ItemStatus
 *
 * @typedef {Object} GardenItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {ItemType} type
 * @property {ItemStatus} status
 * @property {string[]} tags
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {{x: number, y: number}} position   x: 0..WORLD.width, y: depth 0 (far) .. WORLD.depth (near)
 * @property {string[]} connections
 * @property {{status: ItemStatus, at: string}[]} [history]  status changes, used by the timeline
 */

export const WORLD = { width: 2000, depth: 1000 };

export const TYPES = {
  thought: { label: "Thought", plant: "Wildflower", hint: "A passing spark" },
  idea: { label: "Idea", plant: "Glowcap", hint: "Something worth exploring" },
  project: { label: "Project", plant: "Tree", hint: "Something you are building" },
  goal: { label: "Goal", plant: "Tall bloom", hint: "Something you are reaching for" },
};

export const STATUSES = {
  seed: { label: "Seed", growth: 0.12, verb: "Planted" },
  growing: { label: "Growing", growth: 0.58, verb: "Growing" },
  bloomed: { label: "Bloomed", growth: 1, verb: "In bloom" },
  dormant: { label: "Dormant", growth: 0.4, verb: "Resting" },
};

export const TYPE_KEYS = /** @type {ItemType[]} */ (Object.keys(TYPES));
export const STATUS_KEYS = /** @type {ItemStatus[]} */ (Object.keys(STATUSES));

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Deterministic 0..1 random generator seeded by a string. */
export function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The status an item had at a given moment (null when it did not exist yet). */
export function statusAt(item, date) {
  if (!date) return item.status;
  const t = date.getTime();
  if (new Date(item.createdAt).getTime() > t) return null;
  const history = item.history && item.history.length ? item.history : null;
  if (!history) return item.status;
  let status = history[0].status;
  for (const entry of history) {
    if (new Date(entry.at).getTime() <= t) status = entry.status;
    else break;
  }
  return status;
}

/** Perspective scale: plants further back (small y) are drawn smaller. */
export function depthScale(y) {
  return 0.95 + 0.8 * (y / WORLD.depth);
}

/** Ground depth is foreshortened on screen, which leaves room for the sky. */
export const DEPTH_SQUASH = 0.58;

/** Garden position → SVG world coordinates. */
export function project(p) {
  return { x: p.x, y: p.y * DEPTH_SQUASH };
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 45) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 400) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeTag(tag) {
  return tag.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLowerCase().slice(0, 24);
}
