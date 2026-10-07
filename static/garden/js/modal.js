import { TYPES, TYPE_KEYS, escapeHtml, normalizeTag } from "./model.js";
import { plantPreviewSVG } from "./plants.js";
import { icon } from "./ui.js";

const root = document.getElementById("modal-root");
let onCloseCb = null;
let lastFocus = null;
let listeners = null;

export function isModalOpen() {
  return !root.hidden;
}

export function closeModal() {
  if (root.hidden) return;
  listeners?.abort();
  listeners = null;
  root.classList.remove("is-open");
  setTimeout(() => {
    root.hidden = true;
    root.innerHTML = "";
  }, 320);
  onCloseCb?.();
  onCloseCb = null;
  lastFocus?.focus?.();
}

function suggestions(items, chosen) {
  const counts = new Map();
  for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([tag]) => !chosen.includes(tag))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);
}

/**
 * Create or edit form. `item` is null for a new seed.
 * onSubmit receives { title, description, type, tags }.
 */
export function openItemModal({ item = null, items, onSubmit, onClose }) {
  lastFocus = document.activeElement;
  onCloseCb = onClose;
  const editing = !!item;
  let type = item?.type ?? "idea";
  let tags = item ? item.tags.slice() : [];

  root.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" novalidate>
      <button class="icon-btn modal-close" type="button" data-close title="Close">${icon("close")}</button>
      <h2 id="modal-title">${editing ? "Tend this plant" : "What do you want to plant?"}</h2>
      <label class="field">
        <span class="sr-only">Title</span>
        <input name="title" maxlength="80" autocomplete="off" placeholder="${editing ? "Title" : "A thought, an idea, a dream…"}" value="${escapeHtml(item?.title ?? "")}">
      </label>
      <label class="field">
        <span class="sr-only">Description</span>
        <textarea name="description" rows="3" maxlength="600" placeholder="Why does it matter? (optional)">${escapeHtml(item?.description ?? "")}</textarea>
      </label>
      <fieldset class="type-picker">
        <legend>Type</legend>
        ${TYPE_KEYS.map((t) => `
          <label class="type-opt${t === type ? " is-active" : ""}">
            <input type="radio" name="type" value="${t}"${t === type ? " checked" : ""}>
            <span class="type-art">${plantPreviewSVG({ id: "preview-" + t, type: t, status: "bloomed" })}</span>
            <span class="type-name">${TYPES[t].label}</span>
            <span class="type-hint">${TYPES[t].hint}</span>
          </label>`).join("")}
      </fieldset>
      <div class="tag-field">
        <div class="tag-input">
          <span class="tag-chips"></span>
          <input name="tag" autocomplete="off" placeholder="+ Add tag" maxlength="24">
        </div>
        <div class="tag-suggest"></div>
      </div>
      <button class="btn btn-primary btn-plant" type="submit">
        ${editing ? icon("leaf") + "<span>Save changes</span>" : `<span class="seed-ico" aria-hidden="true"></span><span>Plant it</span>`}
      </button>
    </form>
  `;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("is-open"));

  const form = root.querySelector("form");
  const title = form.elements.title;
  const tagInput = form.elements.tag;
  const chips = form.querySelector(".tag-chips");
  const suggest = form.querySelector(".tag-suggest");

  function renderTags() {
    chips.innerHTML = tags.map((t, i) => `<button type="button" class="tag tag-chip" data-remove="${i}" title="Remove">#${escapeHtml(t)}<span aria-hidden="true">×</span></button>`).join("");
    const s = suggestions(items, tags);
    suggest.innerHTML = s.length ? s.map((t) => `<button type="button" class="tag tag-suggestion" data-add="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join("") : "";
  }

  function addTag(raw) {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag) && tags.length < 8) tags.push(tag);
    tagInput.value = "";
    renderTags();
  }

  renderTags();
  setTimeout(() => title.focus(), 60);

  listeners?.abort();
  listeners = new AbortController();
  root.addEventListener("click", onRootClick, { signal: listeners.signal });
  function onRootClick(e) {
    if (e.target.closest("[data-close]")) closeModal();
    const remove = e.target.closest("[data-remove]");
    if (remove) {
      tags.splice(Number(remove.dataset.remove), 1);
      renderTags();
      tagInput.focus();
    }
    const add = e.target.closest("[data-add]");
    if (add) addTag(add.dataset.add);
  }

  form.addEventListener("change", (e) => {
    if (e.target.name !== "type") return;
    type = e.target.value;
    form.querySelectorAll(".type-opt").forEach((el) => el.classList.toggle("is-active", el.querySelector("input").value === type));
  });

  tagInput.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === "," || (e.key === "Tab" && tagInput.value.trim())) && !e.isComposing) {
      if (tagInput.value.trim()) {
        e.preventDefault();
        addTag(tagInput.value);
      } else if (e.key === ",") {
        e.preventDefault();
      }
    } else if (e.key === "Backspace" && !tagInput.value && tags.length) {
      tags.pop();
      renderTags();
    }
  });
  tagInput.addEventListener("blur", () => tagInput.value.trim() && addTag(tagInput.value));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (tagInput.value.trim()) addTag(tagInput.value);
    const value = title.value.trim();
    if (!value) {
      title.classList.remove("shake");
      void title.offsetWidth;
      title.classList.add("shake");
      title.focus();
      return;
    }
    const fields = { title: value, description: form.elements.description.value.trim(), type, tags };
    onCloseCb = null;
    closeModal();
    onSubmit(fields);
  });
}
