/* ==========================================================================
   NEWSXA — app.js (Home page)
   Loads the hero + every homepage section from live feeds via NewsxaAPI,
   with skeleton loading and per-section error handling.
   ========================================================================== */
(function () {
  "use strict";

  const REFRESH_MS = 6 * 60 * 1000;
  const articleIndex = new Map(); // id -> article, for bookmark/share lookups

  function registerArticles(list) {
    list.forEach((a) => articleIndex.set(a.id, a));
  }

  function heroTemplate(article) {
    return `
    <div class="hero-card fade-up cat-${article.category || "top"}">
      <img src="${article.image}" alt="${NewsxaCards.escapeHtml(article.title)}" onload="this.classList.add('loaded')">
      <div class="hero-scrim"></div>
      <div class="hero-content">
        <div class="hero-badges">
          <span class="badge badge-live"><span class="live-dot" style="background:#fff"></span> Breaking</span>
          <span class="badge badge-cat">${NewsxaCards.CATEGORY_LABELS[article.category] || "Top Headlines"}</span>
        </div>
        <h1 class="hero-headline">${NewsxaCards.escapeHtml(article.title)}</h1>
        <div class="hero-meta font-mono">
          <span>${NewsxaCards.escapeHtml(article.source || "")}</span>
          <span class="dot"></span>
          <span>${article.timeAgo || ""}</span>
        </div>
        <a class="hero-read ripple" href="${article.link}" target="_blank" rel="noopener noreferrer">Read full story →</a>
      </div>
    </div>`;
  }

  // Finds the nearest .carousel ancestor of an element and (re)initializes
  // its arrow controls — safe no-op if the element isn't inside a carousel.
  function wireCarousel(el) {
    const root = el.closest(".carousel");
    if (root && window.NewsxaCarousel) NewsxaCarousel.init(root);
  }

  // Large full-width breaking-news banner. Real headline density comes from
  // the Top Headlines section right below it, not from cramming extra items
  // into the hero itself.
  async function loadHero() {
    const slot = document.getElementById("heroSlot");
    try {
      const items = await NewsxaAPI.fetchCategory("top", { limit: 1 });
      if (!items.length) throw new Error("No live headlines available right now.");
      registerArticles(items);
      slot.innerHTML = heroTemplate(items[0]);
    } catch (e) {
      slot.innerHTML = "";
      slot.appendChild(NewsxaCards.errorState(e.message, loadHero));
    }
  }

  async function loadTopHeadlinesList() {
    const wrap = document.getElementById("list-top");
    wrap.innerHTML = Array.from({ length: 8 })
      .map(() => `<div class="card skel-card skel" style="flex:0 0 300px"></div>`)
      .join("");
    try {
      const items = await NewsxaAPI.fetchCategory("top", { limit: 8 });
      if (!items.length) throw new Error("No headlines returned from live sources.");
      registerArticles(items);
      wrap.innerHTML = items.map((a) => NewsxaCards.cardHTML(a)).join("");
      NewsxaCards.bindCardActions(wrap, (id) => articleIndex.get(id));
      wireCarousel(wrap);
    } catch (e) {
      wrap.innerHTML = "";
      wrap.appendChild(NewsxaCards.errorState(e.message, loadTopHeadlinesList));
    }
  }

  async function loadGrid(category, gridId, opts = {}) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = NewsxaCards.skeletonGrid(8);
    try {
      const items = await NewsxaAPI.fetchCategory(category, { limit: 8, ...opts });
      if (!items.length) {
        grid.innerHTML = "";
        grid.appendChild(NewsxaCards.emptyState("This section has no live headlines right now."));
        return;
      }
      registerArticles(items);
      // Trending shows a rank number instead of repeating the "Trending" badge
      // on every card — the section heading already says what it is.
      grid.innerHTML = items
        .map((a, i) => NewsxaCards.cardHTML(a, category === "trending" ? { rank: i + 1 } : {}))
        .join("");
      NewsxaCards.bindCardActions(grid, (id) => articleIndex.get(id));
      wireCarousel(grid);
    } catch (e) {
      grid.innerHTML = "";
      grid.appendChild(NewsxaCards.errorState(e.message, () => loadGrid(category, gridId, opts)));
    }
  }

  async function loadTicker() {
    const track = document.getElementById("tickerTrack");
    try {
      const items = await NewsxaAPI.fetchCategory("trending", { limit: 10 });
      if (!items.length) return;
      const spans = items.map((a) => `<span>${NewsxaCards.escapeHtml(a.title)} — <em style="opacity:.6;font-style:normal">${NewsxaCards.escapeHtml(a.source || "")}</em></span>`);
      // duplicate for seamless marquee loop
      track.innerHTML = spans.concat(spans).join("");
    } catch (e) {
      track.innerHTML = "<span>Live ticker temporarily unavailable.</span>";
    }
  }

  function loadAllSections() {
    loadHero();
    loadTicker();
    loadTopHeadlinesList();
    loadGrid("mycountry", "grid-mycountry", { country: Newsxa.getCountry() });
    loadGrid("world", "grid-world");
    loadGrid("technology", "grid-technology");
    loadGrid("business", "grid-business");
    loadGrid("sports", "grid-sports");
    loadGrid("entertainment", "grid-entertainment");
    loadGrid("health", "grid-health");
    loadGrid("science", "grid-science");
    loadGrid("trending", "grid-trending");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadAllSections();
    setInterval(loadAllSections, REFRESH_MS);
    document.addEventListener("newsxa:country-change", (e) => {
      loadGrid("mycountry", "grid-mycountry", { country: e.detail, force: true });
    });
  });
})();
