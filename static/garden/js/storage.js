// The only module that touches localStorage. Each gardener (Discord user or guest)
// gets their own key, so several people can share a browser without mixing gardens.

const PREFIX = "digital-garden:v1:";

let key = null;

export function configureStorage(ownerId) {
  key = ownerId ? PREFIX + ownerId : null;
}

/** @returns {import("./model.js").GardenItem[] | null} null on first visit */
export function loadGarden() {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

export function saveGarden(items) {
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), items }));
    return true;
  } catch {
    return false;
  }
}

export function loadPreference(name, fallback) {
  try {
    const value = localStorage.getItem(PREFIX + "pref:" + name);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function savePreference(name, value) {
  try {
    localStorage.setItem(PREFIX + "pref:" + name, JSON.stringify(value));
  } catch {
    /* preferences are a convenience only */
  }
}
