import { loadGarden, saveGarden } from "./storage.js";
import { createDemoGarden } from "./demo-data.js";
import { uid } from "./model.js";

/**
 * Tiny observable store. `items` is the persisted garden; everything else is view state.
 * Listeners receive (state, change) where change = { type, id? }.
 */
export function createStore({ persist }) {
  const stored = persist ? loadGarden() : null;
  const state = {
    items: stored ?? createDemoGarden(),
    selectedId: null,
    viewDate: null, // null = today
    connectFrom: null,
    time: "day",
    underground: false,
  };
  if (persist && !stored) saveGarden(state.items);

  const listeners = new Set();

  function emit(change) {
    for (const fn of listeners) fn(state, change);
  }

  function commit(change) {
    if (persist) saveGarden(state.items);
    emit(change);
  }

  function now() {
    return new Date().toISOString();
  }

  const get = (id) => state.items.find((item) => item.id === id);

  return {
    state,
    get,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    addItem(fields) {
      const at = now();
      const item = {
        id: uid(),
        title: fields.title,
        description: fields.description ?? "",
        type: fields.type,
        status: "seed",
        tags: fields.tags ?? [],
        createdAt: at,
        updatedAt: at,
        position: fields.position,
        connections: [],
        history: [{ status: "seed", at }],
      };
      state.items.push(item);
      commit({ type: "add", id: item.id });
      return item;
    },

    updateItem(id, fields) {
      const item = get(id);
      if (!item) return;
      Object.assign(item, fields, { updatedAt: now() });
      commit({ type: "update", id });
    },

    setStatus(id, status) {
      const item = get(id);
      if (!item || item.status === status) return;
      const at = now();
      const previous = item.status;
      item.status = status;
      item.updatedAt = at;
      item.history = [...(item.history ?? [{ status: previous, at: item.createdAt }]), { status, at }];
      commit({ type: "status", id, previous });
    },

    deleteItem(id) {
      const item = get(id);
      if (!item) return null;
      const neighbours = item.connections.slice();
      state.items = state.items.filter((other) => other.id !== id);
      for (const other of state.items) other.connections = other.connections.filter((c) => c !== id);
      if (state.selectedId === id) state.selectedId = null;
      commit({ type: "delete", id });
      return { item, neighbours };
    },

    restoreItem({ item, neighbours }) {
      state.items.push(item);
      for (const nid of neighbours) {
        const other = get(nid);
        if (other && !other.connections.includes(item.id)) other.connections.push(item.id);
      }
      item.connections = neighbours.filter((nid) => get(nid));
      commit({ type: "add", id: item.id, restored: true });
    },

    connect(a, b) {
      const first = get(a);
      const second = get(b);
      if (!first || !second || a === b || first.connections.includes(b)) return false;
      first.connections.push(b);
      second.connections.push(a);
      first.updatedAt = second.updatedAt = now();
      commit({ type: "connect", id: a, other: b });
      return true;
    },

    disconnect(a, b) {
      const first = get(a);
      const second = get(b);
      if (first) first.connections = first.connections.filter((c) => c !== b);
      if (second) second.connections = second.connections.filter((c) => c !== a);
      commit({ type: "disconnect", id: a, other: b });
    },

    resetDemo() {
      state.items = createDemoGarden();
      state.selectedId = null;
      commit({ type: "reset" });
    },

    select(id) {
      if (state.selectedId === id) return;
      state.selectedId = id;
      emit({ type: "select", id });
    },

    setViewDate(date) {
      state.viewDate = date;
      emit({ type: "time-travel" });
    },

    startConnect(id) {
      state.connectFrom = id;
      emit({ type: "mode" });
    },

    cancelConnect() {
      if (!state.connectFrom) return;
      state.connectFrom = null;
      emit({ type: "mode" });
    },

    setTime(time) {
      state.time = time;
      emit({ type: "daynight" });
    },

    setUnderground(on) {
      state.underground = on;
      emit({ type: "underground" });
    },
  };
}
