// Scrub back in time: plants planted after the chosen date disappear, and the
// rest show the stage they were in at that moment (from item.history).

const DAY = 86400000;
const monthYear = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
const dayMonth = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

export class Timeline {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    root.innerHTML = `
      <span class="tl-edge tl-start"></span>
      <div class="tl-track">
        <div class="tl-line"></div>
        <div class="tl-ticks"></div>
        <input class="tl-range" type="range" min="0" max="1000" step="1" value="1000" aria-label="Travel through your garden's history">
        <div class="tl-bubble"></div>
      </div>
      <span class="tl-edge tl-end">Now</span>
      <button class="tl-today" type="button" hidden>Back to today</button>
    `;
    this.range = root.querySelector(".tl-range");
    this.bubble = root.querySelector(".tl-bubble");
    this.ticks = root.querySelector(".tl-ticks");
    this.todayBtn = root.querySelector(".tl-today");

    this.range.addEventListener("input", () => this.onInput());
    this.range.addEventListener("pointerdown", () => root.classList.add("is-scrubbing"));
    window.addEventListener("pointerup", () => root.classList.remove("is-scrubbing"));
    this.todayBtn.addEventListener("click", () => {
      this.range.value = "1000";
      this.onInput();
    });
  }

  span() {
    const now = Date.now();
    const first = this.store.state.items.reduce((min, item) => Math.min(min, new Date(item.createdAt).getTime()), now);
    const start = Math.min(first - 7 * DAY, now - 30 * DAY);
    return { start, end: now };
  }

  onInput() {
    const v = Number(this.range.value);
    const { start, end } = this.span();
    const date = v >= 995 ? null : new Date(start + (v / 1000) * (end - start));
    this.store.setViewDate(date);
    this.updateBubble();
  }

  updateBubble() {
    const v = Number(this.range.value);
    const date = this.store.state.viewDate;
    this.bubble.textContent = date ? dayMonth.format(date) : "Today";
    this.bubble.style.left = `calc(${v / 10}% + ${(0.5 - v / 1000) * 18}px)`;
    this.root.classList.toggle("is-past", !!date);
    this.todayBtn.hidden = !date;
  }

  render() {
    const { start, end } = this.span();
    this.root.querySelector(".tl-start").textContent = monthYear.format(new Date(start));
    this.ticks.innerHTML = this.store.state.items
      .map((item) => {
        const t = (new Date(item.createdAt).getTime() - start) / (end - start);
        return `<span class="tl-tick type-${item.type}" style="left:${(Math.min(1, Math.max(0, t)) * 100).toFixed(2)}%"></span>`;
      })
      .join("");
    this.updateBubble();
  }
}
