import { WORLD } from "./model.js";

const MARGIN_X = 140;
const MARGIN_NEAR = 150;
const MARGIN_FAR = 140;

/** Distance with depth squashed, so plants are not placed right behind each other. */
function spacing(a, b) {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * 1.6;
  return Math.hypot(dx, dy);
}

function sample(rect) {
  return {
    x: rect.x0 + Math.random() * (rect.x1 - rect.x0),
    y: rect.y0 + Math.random() * (rect.y1 - rect.y0),
  };
}

function clampRect(rect) {
  return {
    x0: Math.max(MARGIN_X, rect.x0),
    x1: Math.min(WORLD.width - MARGIN_X, rect.x1),
    y0: Math.max(MARGIN_FAR, rect.y0),
    y1: Math.min(WORLD.depth - MARGIN_NEAR, rect.y1),
  };
}

/**
 * Pick a free spot, preferring the part of the garden currently on screen
 * so the planting animation is visible.
 */
export function findFreePosition(items, visibleRect) {
  const whole = clampRect({ x0: 0, x1: WORLD.width, y0: 0, y1: WORLD.depth });
  const view = visibleRect ? clampRect(visibleRect) : null;
  const areas = view && view.x1 - view.x0 > 160 && view.y1 - view.y0 > 120 ? [view, whole] : [whole];

  const others = items.map((item) => item.position);
  let best = null;
  let bestScore = -Infinity;

  for (const area of areas) {
    for (let i = 0; i < 60; i++) {
      const candidate = sample(area);
      const nearest = others.reduce((min, p) => Math.min(min, spacing(candidate, p)), Infinity);
      if (nearest > bestScore) {
        bestScore = nearest;
        best = candidate;
      }
    }
    if (bestScore > 170) break;
  }

  return { x: Math.round(best.x), y: Math.round(best.y) };
}
