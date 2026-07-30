/* ==========================================================================
   NEWSXA — category.js
   Drives /category.html?cat=<key> — one reusable template for every nav
   page (World, Technology, Business, Sports, Entertainment, Health,
   Science, Trending, My Country, and Top Headlines via "top").
   ========================================================================== */
(function () {
  "use strict";

  const LABELS = {
    top: { title: "Top Headlines", eyebrow: "Curated · Updated live", sub: "The stories leading the news cycle right now, pulled live from multiple newsrooms." },
    mycountry: { title: "My Country", eyebrow: "Local edition", sub: "Headlines from your selected country's Google News edition." },
    world: { title: "World", eyebrow: "Global", sub: "International news and global affairs as they happen." },
    technology: { title: "Technology", eyebrow: "Innovation", sub: "Product launches, research, and the companies shaping tech." },
    business: { title: "Business", eyebrow: "Markets", sub: "Markets, companies, and the economy." },
    sports: { title: "Sports", eyebrow: "Play by play", sub: "Scores, transfers, and storylines from around the world of sport." },
    entertainment: { title: "Entertainment", eyebrow: "Culture", sub: "Film, music, television and celebrity news." },
    health: { title: "Health", eyebrow: "Wellbeing", sub: "Medicine, public health, and wellness coverage." },
    science: { title: "Science", eyebrow: "Discovery", sub: "Research, space, climate and the natural world." },
    trending: { title: "Trending", eyebrow: "Right now", sub: "What's being read and shared across the web right now." },
  };

  const params = new URLSearchParams(location.search);
  const cat = LABELS[params.get("cat")] ? params.get("cat") : "top";
  const meta = LABELS[cat];

  document.body.setAttribute("data-page", cat);
  document.title = `${meta.title} — Newsxa`;
  const setMeta = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };
  setMeta("pageDesc", "content", `Live ${meta.title} headlines on Newsxa — ${meta.sub}`);
  setMeta("canonicalLink", "href", `https://www.newsxa.com/category.html?cat=${cat}`);
  setMeta("ogTitle", "content", `${meta.title} — Newsxa`);
  setMeta("ogDesc", "content", meta.sub);
  document.getElementById("pageEyebrow").textContent = meta.eyebrow;
  document.getElementById("pageHeading").textContent = meta.title;
  document.getElementById("pageSub").textContent = meta.sub;

  // Filter chips let you hop between categories without opening the menu.
  const filterRow = document.getElementById("filterRow");
  filterRow.innerHTML = Object.keys(LABELS)
    .map((key) => `<button class="filter-chip ${key === cat ? "active" : ""}" data-cat="${key}">${LABELS[key].title}</button>`)
    .join("");
  filterRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    location.href = `category.html?cat=${chip.dataset.cat}`;
  });

  // ---- Paginated live loading -------------------------------------------
  const grid = document.getElementById("catGrid");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const PAGE_SIZE = 8;
  const articleIndex = new Map();
  let allItems = [];
  let shown = 0;
  let loading = false;

  function renderPage() {
    const next = allItems.slice(shown, shown + PAGE_SIZE);
    next.forEach((a) => articleIndex.set(a.id, a));
    grid.insertAdjacentHTML(
      "beforeend",
      next.map((a, i) => NewsxaCards.cardHTML(a, cat === "trending" ? { rank: shown + i + 1 } : {})).join("")
    );
    shown += next.length;
    loadMoreBtn.style.display = shown >= allItems.length ? "none" : "inline-flex";
  }

  async function loadCategory({ force = false } = {}) {
    loading = true;
    grid.innerHTML = NewsxaCards.skeletonGrid(8);
    loadMoreBtn.disabled = true;
    try {
      allItems = await NewsxaAPI.fetchCategory(cat, { limit: 40, country: Newsxa.getCountry(), force });
      shown = 0;
      grid.innerHTML = "";
      if (!allItems.length) {
        grid.appendChild(NewsxaCards.emptyState("No live headlines for this section right now — try again shortly."));
      } else {
        renderPage();
      }
    } catch (e) {
      grid.innerHTML = "";
      grid.appendChild(NewsxaCards.errorState(e.message, () => loadCategory({ force: true })));
      loadMoreBtn.style.display = "none";
    } finally {
      loading = false;
      loadMoreBtn.disabled = false;
    }
  }

  loadMoreBtn.addEventListener("click", () => {
    loadMoreBtn.innerHTML = 'Loading… <svg class="spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
    setTimeout(() => {
      renderPage();
      loadMoreBtn.innerHTML = "Load more headlines";
    }, 300);
  });

  // Infinite scroll: auto-trigger load-more near the bottom of the page.
  window.addEventListener(
    "scroll",
    () => {
      if (loading || loadMoreBtn.style.display === "none") return;
      if (window.innerHeight + window.scrollY > document.body.offsetHeight - 500) {
        if (shown < allItems.length) renderPage();
      }
    },
    { passive: true }
  );

  NewsxaCards.bindCardActions(grid, (id) => articleIndex.get(id));

  document.addEventListener("DOMContentLoaded", () => {
    loadCategory();
    setInterval(() => loadCategory({ force: true }), 6 * 60 * 1000);
    document.addEventListener("newsxa:country-change", () => {
      if (cat === "mycountry") loadCategory({ force: true });
    });
  });
})();
