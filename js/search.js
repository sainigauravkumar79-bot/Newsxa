/* ==========================================================================
   NEWSXA — search.js
   Client-side search across the same live categories used elsewhere.
   No separate search API is required: we pull each category's cached/live
   feed and filter by title + description match.
   ========================================================================== */
(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim();
  document.getElementById("qText").textContent = q;
  document.getElementById("mainSearch").value = q;

  const grid = document.getElementById("searchGrid");
  const countEl = document.getElementById("resultCount");
  const articleIndex = new Map();

  const CATEGORIES = ["top", "world", "technology", "business", "sports", "entertainment", "health", "science", "trending"];

  async function runSearch() {
    if (!q) {
      countEl.textContent = "Type something in the search bar to get started.";
      return;
    }
    grid.innerHTML = NewsxaCards.skeletonGrid(8);
    try {
      const results = await Promise.allSettled(CATEGORIES.map((c) => NewsxaAPI.fetchCategory(c, { limit: 20 })));
      const all = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
      const needle = q.toLowerCase();
      const matches = all.filter(
        (a) => a.title.toLowerCase().includes(needle) || (a.description || "").toLowerCase().includes(needle)
      );
      const deduped = Array.from(new Map(matches.map((a) => [a.id, a])).values());
      countEl.textContent = deduped.length
        ? `${deduped.length} live result${deduped.length === 1 ? "" : "s"} found`
        : "No live headlines currently match that search.";
      grid.innerHTML = "";
      if (!deduped.length) {
        grid.appendChild(NewsxaCards.emptyState("Try a different keyword, or browse a category from the menu."));
        return;
      }
      deduped.forEach((a) => articleIndex.set(a.id, a));
      grid.innerHTML = deduped.map(NewsxaCards.cardHTML).join("");
      NewsxaCards.bindCardActions(grid, (id) => articleIndex.get(id));
    } catch (e) {
      grid.innerHTML = "";
      grid.appendChild(NewsxaCards.errorState("Search is temporarily unavailable.", runSearch));
    }
  }

  document.addEventListener("DOMContentLoaded", runSearch);
})();
