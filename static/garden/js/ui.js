import { TYPES, STATUSES, escapeHtml } from "./model.js";

const tooltip = document.getElementById("tooltip");
let toastTimer = null;

export function showTooltip(item, rect, status = item.status) {
  tooltip.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${TYPES[item.type].label} · ${STATUSES[status].label}</span>`;
  tooltip.hidden = false;
  const box = tooltip.getBoundingClientRect();
  const x = Math.min(window.innerWidth - box.width / 2 - 8, Math.max(box.width / 2 + 8, rect.left + rect.width / 2));
  const y = Math.max(box.height + 12, rect.top - 6);
  tooltip.style.transform = `translate(${x - box.width / 2}px, ${y - box.height}px)`;
  requestAnimationFrame(() => tooltip.classList.add("is-visible"));
}

export function hideTooltip() {
  tooltip.classList.remove("is-visible");
  tooltip.hidden = true;
}

export function toast(message, action) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.getElementById("app").append(el);
  }
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      action.run();
      el.classList.remove("is-visible");
    });
    el.append(btn);
  }
  el.classList.remove("is-visible");
  void el.offsetWidth;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), action ? 6000 : 3200);
}

export function icon(name) {
  const paths = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>',
    trash: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/>',
    vine: '<path d="M4 20c4-1 5-5 8-8s6-3 8-8"/><path d="M9 14c-2 0-3-1-3-3 2 0 3 1 3 3zM15 9c0-2 1-3 3-3 0 2-1 3-3 3z"/>',
    leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

const STATUS_ICONS = {
  seed: '<ellipse cx="12" cy="15" rx="4" ry="3"/><path d="M12 12c0-3 1-5 3-6"/>',
  growing: '<path d="M12 20v-9"/><path d="M12 14c-4 0-6-2-6-6 4 0 6 2 6 6zM12 11c0-4 2-6 6-6 0 4-2 6-6 6z"/>',
  bloomed: '<path d="M12 21v-6"/><circle cx="12" cy="9" r="2"/><path d="M12 7c0-3 3-4 3-1s-3 3-3 1zM12 7c0-3-3-4-3-1s3 3 3 1zM14 9c3 0 4 3 1 3s-3-3-1-3zM10 9c-3 0-4 3-1 3s3-3 1-3z"/>',
  dormant: '<path d="M12 21V9"/><path d="M12 13c-3 0-5 1-6 4M12 10c3 0 4 2 5 5"/><path d="M17 15l1 3M6 17l-1 2"/>',
};

export function statusIcon(status) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${STATUS_ICONS[status]}</svg>`;
}
