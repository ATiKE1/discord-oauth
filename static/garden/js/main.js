import { configureStorage, loadPreference, savePreference } from "./storage.js";
import { createStore } from "./store.js";
import { GardenView } from "./garden.js";
import { RootsView } from "./roots.js";
import { Timeline } from "./timeline.js";
import { DetailPanel } from "./panel.js";
import { openItemModal, isModalOpen, closeModal } from "./modal.js";
import { findFreePosition } from "./layout.js";
import { buildStars } from "./scene.js";
import { toast, hideTooltip } from "./ui.js";

const gardener = window.GARDENER;
configureStorage(gardener?.id ?? null);

const app = document.getElementById("app");
const store = createStore({ persist: !!gardener });
const { state } = store;

buildStars(document.getElementById("stars"));

const garden = new GardenView(store, {
  onPlantTap: (id) => onPlantTap(id),
  onBackgroundTap: () => {
    if (state.connectFrom) return store.cancelConnect();
    store.select(null);
  },
});

const roots = new RootsView(store, { onNodeTap: (id) => store.select(id) });

const timeline = new Timeline(document.getElementById("timeline"), store);

const panel = new DetailPanel(document.getElementById("panel"), store, {
  close: () => store.select(null),
  setStatus: (id, status) => store.setStatus(id, status),
  edit: (id) => openEditor(store.get(id)),
  connect: (id) => store.startConnect(id),
  goto: (id) => {
    store.select(id);
    if (!state.underground) garden.focusItem(id, { force: true });
  },
  disconnect: (a, b) => store.disconnect(a, b),
  remove: (id) => {
    const title = store.get(id)?.title;
    const snapshot = store.deleteItem(id);
    if (snapshot) toast(`“${title}” was uprooted`, { label: "Undo", run: () => store.restoreItem(snapshot) });
  },
});

function onPlantTap(id) {
  if (state.connectFrom) {
    const from = state.connectFrom;
    if (id === from) return;
    const source = store.get(from);
    if (source.connections.includes(id)) {
      toast("These two are already entwined");
      return;
    }
    store.cancelConnect();
    store.connect(from, id);
    toast(`A vine now links “${source.title}” and “${store.get(id).title}”`);
    return;
  }
  store.select(id);
  garden.focusItem(id);
}

function openCreator() {
  if (!gardener) return;
  store.cancelConnect();
  openItemModal({
    items: state.items,
    onSubmit: (fields) => {
      if (state.viewDate) {
        store.setViewDate(null);
        timeline.range.value = "1000";
        timeline.updateBubble();
      }
      if (state.underground) setUnderground(false);
      store.select(null);
      const position = findFreePosition(state.items, garden.plantableRect());
      const item = store.addItem({ ...fields, position });
      garden.playPlanting(item.id);
      // A lone first seed is tiny in an empty meadow: glide in to watch it sprout.
      garden.focusItem(item.id, state.items.length === 1 ? { force: true, zoom: 1.15 } : {});
      toast(`“${item.title}” is in the ground`);
    },
  });
}

function openEditor(item) {
  if (!item) return;
  openItemModal({
    item,
    items: state.items,
    onSubmit: (fields) => store.updateItem(item.id, fields),
  });
}

/* ---------- day / night ---------- */

function autoTime() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? "day" : "night";
}

const today = new Date().toDateString();
const override = loadPreference("time", null);
store.setTime(override && override.day === today ? override.value : autoTime());

document.getElementById("btn-time").addEventListener("click", () => {
  const next = state.time === "day" ? "night" : "day";
  store.setTime(next);
  savePreference("time", { value: next, day: today });
});

/* ---------- underground ---------- */

const rootsBtn = document.getElementById("btn-roots");

function setUnderground(on) {
  store.select(null);
  store.cancelConnect();
  store.setUnderground(on);
}

rootsBtn.addEventListener("click", () => setUnderground(!state.underground));

/* ---------- chrome ---------- */

document.getElementById("btn-reset").addEventListener("click", () => {
  if (state.underground) roots.fit(true);
  else garden.resetView();
});

app.addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "new") openCreator();
  if (action === "demo") {
    store.resetDemo();
    garden.resetView();
  }
  if (action === "cancel-connect") store.cancelConnect();
});

const banner = document.getElementById("mode-banner");
const emptyState = document.getElementById("empty-state");
const countLabel = document.getElementById("garden-count");

function renderChrome() {
  const items = state.items;
  const bloomed = items.filter((i) => i.status === "bloomed").length;
  countLabel.textContent = items.length
    ? `${items.length} ${items.length === 1 ? "plant" : "plants"}${bloomed ? ` · ${bloomed} in bloom` : ""}`
    : "Waiting for a seed";

  emptyState.hidden = items.length > 0 || state.underground;

  if (state.connectFrom) {
    const source = store.get(state.connectFrom);
    banner.innerHTML = `<span>Choose a plant to entwine with <strong></strong></span><button type="button" class="btn-link" data-action="cancel-connect">Cancel</button>`;
    banner.querySelector("strong").textContent = `“${source?.title ?? ""}”`;
    banner.hidden = false;
  } else if (state.viewDate && !state.items.some((i) => new Date(i.createdAt) <= state.viewDate)) {
    banner.innerHTML = `<span>Nothing had been planted yet.</span>`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
  app.classList.toggle("is-connecting", !!state.connectFrom);
}

/* ---------- reacting to changes ---------- */

store.subscribe((s, change) => {
  switch (change.type) {
    case "daynight":
      app.dataset.time = s.time;
      return;
    case "underground":
      app.classList.toggle("is-underground", s.underground);
      rootsBtn.classList.toggle("is-active", s.underground);
      rootsBtn.querySelector(".btn-label").textContent = s.underground ? "Back to surface" : "Explore roots";
      rootsBtn.title = s.underground ? "Back to the surface" : "Explore roots";
      hideTooltip();
      if (s.underground) {
        roots.render();
        roots.fit(false);
      }
      renderChrome();
      return;
  }

  garden.render(change);
  if (s.underground) roots.render();
  if (["add", "delete", "reset"].includes(change.type)) timeline.render();
  if (change.type === "time-travel") timeline.updateBubble();

  if (change.type === "status") garden.playStatusChange(change.id, s.items.find((i) => i.id === change.id)?.status);
  if (change.type === "add" && change.restored) garden.playPlanting(change.id);

  if (s.selectedId) panel.open(s.selectedId);
  else panel.close();
  app.classList.toggle("has-panel", !!s.selectedId);
  renderChrome();
});

/* ---------- keyboard ---------- */

window.addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select, [contenteditable]")) {
    if (e.key === "Escape") closeModal();
    return;
  }
  if (e.key === "Escape") {
    if (isModalOpen()) closeModal();
    else if (state.connectFrom) store.cancelConnect();
    else if (state.selectedId) store.select(null);
    else if (state.underground) setUnderground(false);
  } else if (isModalOpen() || e.metaKey || e.ctrlKey || e.altKey) {
    return;
  } else if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    openCreator();
  } else if (e.key === "0") {
    garden.resetView();
  } else if (e.key === "+" || e.key === "=") {
    const cam = state.underground ? roots.camera : garden.camera;
    cam.zoomAt(cam.width / 2, cam.height / 2, 1.25);
  } else if (e.key === "-") {
    const cam = state.underground ? roots.camera : garden.camera;
    cam.zoomAt(cam.width / 2, cam.height / 2, 0.8);
  }
});

/* ---------- first paint ---------- */

app.dataset.time = state.time;
garden.render({ type: "init" });
timeline.render();
renderChrome();
garden.camera.set(garden.fitTarget());

if (!gardener) {
  app.classList.add("is-gated");
  garden.camera.enabled = false;
}

requestAnimationFrame(() => app.classList.add("is-ready"));
