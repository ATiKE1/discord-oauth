import { TYPES, STATUSES, STATUS_KEYS, relativeTime, escapeHtml, statusAt } from "./model.js";
import { plantPreviewSVG } from "./plants.js";
import { icon, statusIcon } from "./ui.js";

const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });

export class DetailPanel {
  constructor(el, store, actions) {
    this.el = el;
    this.store = store;
    this.actions = actions;
    this.itemId = null;
    this.armedDelete = null;

    el.innerHTML = `
      <div class="panel-handle" aria-hidden="true"></div>
      <button class="panel-close icon-btn" type="button" title="Close">${icon("close")}</button>
      <div class="panel-hero"></div>
      <div class="panel-body"></div>
    `;
    this.hero = el.querySelector(".panel-hero");
    this.body = el.querySelector(".panel-body");
    el.querySelector(".panel-close").addEventListener("click", () => actions.close());
    el.addEventListener("click", (e) => this.onClick(e));
    this.enableSheetDrag();
  }

  onClick(e) {
    const btn = e.target.closest("[data-do]");
    if (!btn) return;
    const id = this.itemId;
    const what = btn.dataset.do;
    if (what === "status") this.actions.setStatus(id, btn.dataset.status);
    if (what === "edit") this.actions.edit(id);
    if (what === "connect") this.actions.connect(id);
    if (what === "goto") this.actions.goto(btn.dataset.target);
    if (what === "unlink") {
      e.stopPropagation();
      this.actions.disconnect(id, btn.dataset.target);
    }
    if (what === "delete") {
      if (this.armedDelete) {
        clearTimeout(this.armedDelete);
        this.armedDelete = null;
        this.actions.remove(id);
      } else {
        btn.classList.add("is-armed");
        btn.lastElementChild.textContent = "Tap again to uproot";
        this.armedDelete = setTimeout(() => {
          this.armedDelete = null;
          btn.classList.remove("is-armed");
          btn.lastElementChild.textContent = "Uproot";
        }, 3000);
      }
    }
  }

  /** Swipe the bottom sheet down to close it (mobile). */
  enableSheetDrag() {
    const handle = this.el.querySelector(".panel-handle");
    let startY = null;
    handle.addEventListener("pointerdown", (e) => {
      startY = e.clientY;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (startY === null) return;
      const dy = Math.max(0, e.clientY - startY);
      this.el.style.transform = `translateY(${dy}px)`;
    });
    const end = (e) => {
      if (startY === null) return;
      const dy = e.clientY - startY;
      startY = null;
      this.el.style.transform = "";
      if (dy > 90) this.actions.close();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  open(id) {
    const item = this.store.get(id);
    if (!item) return this.close();
    const changed = id !== this.itemId;
    this.itemId = id;
    if (changed && this.armedDelete) {
      clearTimeout(this.armedDelete);
      this.armedDelete = null;
    }
    if (this.el.hidden) {
      this.el.hidden = false;
      requestAnimationFrame(() => this.el.classList.add("is-open"));
    }
    if (changed) this.el.querySelector(".panel-body").scrollTop = 0;
    this.render();
  }

  close() {
    this.itemId = null;
    this.el.classList.remove("is-open");
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (!this.itemId) this.el.hidden = true;
    }, 450);
  }

  render() {
    const item = this.store.get(this.itemId);
    if (!item) return this.close();
    const { viewDate } = this.store.state;
    const statusThen = statusAt(item, viewDate);
    const shownStatus = statusThen ?? item.status;

    // Keep the preview element alive so a status change animates in place.
    const heroKey = `${item.id}:${item.type}`;
    if (this.hero.dataset.key !== heroKey) {
      this.hero.dataset.key = heroKey;
      this.hero.innerHTML = plantPreviewSVG(item, { status: shownStatus });
    } else {
      this.hero.querySelector(".plant").dataset.status = shownStatus;
    }
    this.el.dataset.type = item.type;
    this.el.dataset.status = shownStatus;

    const status = STATUSES[item.status];
    const connections = item.connections.map((cid) => this.store.get(cid)).filter(Boolean);
    const tags = item.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
    const past = !viewDate
      ? ""
      : statusThen
        ? `<p class="panel-past">On ${dateFmt.format(viewDate)} this was ${STATUSES[statusThen].label.toLowerCase()}.</p>`
        : `<p class="panel-past">On ${dateFmt.format(viewDate)} this hadn’t been planted yet.</p>`;

    this.body.innerHTML = `
      <div class="panel-kicker"><span class="type-dot type-${item.type}"></span>${TYPES[item.type].label}<span class="sep">·</span>${TYPES[item.type].plant}</div>
      <h2 class="panel-title">${escapeHtml(item.title)}</h2>
      <div class="growth status-${item.status}">
        <div class="growth-bar"><span style="width:${Math.round(status.growth * 100)}%"></span></div>
        <span class="growth-label">${status.label}</span>
      </div>
      ${past}
      ${tags ? `<div class="tags">${tags}</div>` : ""}
      ${item.description ? `<blockquote class="panel-desc">${escapeHtml(item.description)}</blockquote>` : `<p class="panel-empty-desc">No notes yet. <button type="button" class="btn-link" data-do="edit">Add some</button></p>`}
      <p class="panel-meta" title="${dateFmt.format(new Date(item.createdAt))}">Planted ${relativeTime(item.createdAt)}${item.updatedAt !== item.createdAt ? ` · tended ${relativeTime(item.updatedAt)}` : ""}</p>

      <section class="panel-section">
        <h3>Stage</h3>
        <div class="status-picker" role="radiogroup" aria-label="Stage">
          ${STATUS_KEYS.map((s) => `
            <button type="button" role="radio" aria-checked="${s === item.status}" class="status-opt status-${s}${s === item.status ? " is-active" : ""}" data-do="status" data-status="${s}">
              ${statusIcon(s)}<span>${STATUSES[s].label}</span>
            </button>`).join("")}
        </div>
      </section>

      <section class="panel-section">
        <h3>Entwined with</h3>
        ${connections.length ? `<ul class="links">${connections.map((c) => `
          <li><button type="button" class="link-item" data-do="goto" data-target="${c.id}">
            <span class="type-dot type-${c.type}"></span><span class="link-title">${escapeHtml(c.title)}</span>
            <span class="link-x" data-do="unlink" data-target="${c.id}" role="button" tabindex="0" title="Untangle">${icon("close")}</span>
          </button></li>`).join("")}</ul>` : `<p class="panel-hint">Nothing yet. Vines grow between related ideas.</p>`}
        <button type="button" class="btn btn-ghost btn-vine" data-do="connect">${icon("vine")}<span>Entwine with…</span></button>
      </section>

      <div class="panel-actions">
        <button type="button" class="btn btn-ghost" data-do="edit">${icon("edit")}<span>Edit</span></button>
        <button type="button" class="btn btn-ghost btn-danger" data-do="delete">${icon("trash")}<span>Uproot</span></button>
      </div>
    `;
  }
}
