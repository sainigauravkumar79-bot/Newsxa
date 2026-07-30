/* ==========================================================================
   NEWSXA — cards.js
   Renders article cards, loading skeletons, and empty/error states.
   Pure DOM string builders — no framework dependency, kept dependency-free
   so this file can be reused from any page.
   ========================================================================== */
(function (global) {
  "use strict";

  const CATEGORY_LABELS = {
    top: "Top Headlines",
    world: "World",
    technology: "Technology",
    business: "Business",
    sports: "Sports",
    entertainment: "Entertainment",
    health: "Health",
    science: "Science",
    trending: "Trending",
    mycountry: "My Country",
  };

  // Category-matched icon set (premium, minimal line icons). Each key mirrors
  // CATEGORY_LABELS and the .cat-<key> CSS color system in style.css.
  const CATEGORY_ICONS = {
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-14h-7z"/></svg>',
    mycountry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    world: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></svg>',
    technology: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    sports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2.3 4.5 6 4a5.4 5.4 0 0 1 6 3 5.4 5.4 0 0 1 6-3c3.7.5 5.5 4 4 7.7-2.5 4.7-10 9.3-10 9.3Z"/></svg>',
    science: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6L4 17a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-8V3M9 3h6M8 14h8"/></svg>',
    trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 9 11l4 4 8-8M17 6h4v4"/></svg>',
  };

  function escapeHtml(str = "") {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHTML(article, opts = {}) {
    const bookmarked = window.Newsxa && Newsxa.isBookmarked(article.id);
    const catLabel = opts.rank ? `#${opts.rank}` : (CATEGORY_LABELS[article.category] || "News");
    return `
    <article class="card cat-${article.category || "top"}" data-id="${article.id}">
      <div class="card-media">
        <span class="card-cat">${escapeHtml(catLabel)}</span>
        <button class="card-bookmark ripple ${bookmarked ? "active" : ""}" aria-label="Bookmark article" data-action="bookmark">
          ${ICON_BOOKMARK}
        </button>
        <a href="${article.link}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(article.title)}">
          <img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='${placeholderFor(article.category)}'">
        </a>
      </div>
      <div class="card-body">
        <div class="card-source-row">
          <span class="card-source">${escapeHtml(article.source || "Unknown source")}</span>
          <span>&middot;</span>
          <span>${article.timeAgo || ""}</span>
        </div>
        <h3 class="card-title"><a href="${article.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
        ${article.description ? `<p class="card-desc">${escapeHtml(article.description)}</p>` : ""}
        <div class="card-footer">
          <a class="read-more" href="${article.link}" target="_blank" rel="noopener noreferrer">
            Read more →
          </a>
          <button class="share-btn ripple" aria-label="Share article" data-action="share">${ICON_SHARE}</button>
        </div>
      </div>
    </article>`;
  }

  function headlineRowHTML(article, index) {
    return `
    <div class="headline-row cat-${article.category || "top"}" data-id="${article.id}">
      <span class="headline-num font-display">${String(index + 1).padStart(2, "0")}</span>
      <img class="headline-thumb" src="${article.image}" alt="" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='${placeholderFor(article.category)}'">
      <div class="headline-text">
        <h4><a href="${article.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h4>
        <div class="headline-meta">${escapeHtml(article.source || "")} &middot; ${article.timeAgo || ""}</div>
      </div>
      <button class="share-btn ripple" aria-label="Share article" data-action="share">${ICON_SHARE}</button>
    </div>`;
  }

  function placeholderFor(category) {
    return `https://picsum.photos/seed/newsxa-${category || "world"}/640/400`;
  }

  const ICON_BOOKMARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/></svg>';

  function skeletonGrid(count = 8) {
    return Array.from({ length: count })
      .map(() => `<div class="card skel-card skel" style="animation:none"></div>`)
      .join("");
  }

  function errorState(message, retryFn) {
    const box = document.createElement("div");
    box.className = "state-box";
    box.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
      <h4>Couldn't load live headlines</h4>
      <p>${escapeHtml(message)}</p>
      <button class="retry-btn ripple" type="button">Try again</button>
    `;
    box.querySelector(".retry-btn").addEventListener("click", retryFn);
    return box;
  }

  function emptyState(message) {
    const box = document.createElement("div");
    box.className = "state-box";
    box.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 10h8M8 14h5"/></svg>
      <h4>Nothing here yet</h4>
      <p>${escapeHtml(message)}</p>
    `;
    return box;
  }

  // Delegate bookmark/share clicks for any container rendered with cardHTML.
  function bindCardActions(container, getArticleById) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const cardEl = btn.closest("[data-id]");
      const article = getArticleById(cardEl.getAttribute("data-id"));
      if (!article) return;
      if (btn.dataset.action === "bookmark") {
        const nowActive = Newsxa.toggleBookmark(article);
        btn.classList.toggle("active", nowActive);
        Newsxa.toast(nowActive ? "Saved to bookmarks" : "Removed from bookmarks");
      } else if (btn.dataset.action === "share") {
        Newsxa.shareArticle(article);
      }
    });
  }

  global.NewsxaCards = {
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    cardHTML,
    headlineRowHTML,
    skeletonGrid,
    errorState,
    emptyState,
    bindCardActions,
    escapeHtml,
  };
})(window);
