/* ==========================================================================
   NEWSXA — common.js
   Shared chrome behavior used by every page: header, theme, mobile nav,
   country selector, bookmarks, share, back-to-top, offline banner.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Theme (dark / light) --------------------------------- */
  const THEME_KEY = "newsxa_theme";
  function applyTheme(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    $$(".theme-toggle").forEach((btn) => {
      btn.setAttribute("aria-pressed", theme === "dark");
      btn.innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
    });
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(preferred);
  }
  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  const ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  };

  /* ---------- Header scroll shadow ----------------------------------- */
  function initHeaderScroll() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------------------------------------------- */
  function initMobileMenu() {
    const btn = $(".menu-btn");
    const menu = $(".mobile-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
      btn.innerHTML = open ? ICONS_MENU.close : ICONS_MENU.open;
    });
    $$(".mobile-menu a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        document.body.style.overflow = "";
        btn.innerHTML = ICONS_MENU.open;
      })
    );
  }
  const ICONS_MENU = {
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  };

  /* ---------- Country selector ------------------------------------------ */
  const COUNTRY_KEY = "newsxa_country";
  function initCountrySelect() {
    const selects = $$(".country-select");
    if (!selects.length || !window.NewsxaAPI) return;
    const saved = localStorage.getItem(COUNTRY_KEY) || "US";
    selects.forEach((sel) => {
      sel.innerHTML = NewsxaAPI.COUNTRIES.map(
        (c) => `<option value="${c.code}" ${c.code === saved ? "selected" : ""}>${c.code}</option>`
      ).join("");
      sel.addEventListener("change", () => {
        localStorage.setItem(COUNTRY_KEY, sel.value);
        document.dispatchEvent(new CustomEvent("newsxa:country-change", { detail: sel.value }));
      });
    });
  }
  function getCountry() {
    return localStorage.getItem(COUNTRY_KEY) || "US";
  }

  /* ---------- Bookmarks -------------------------------------------------- */
  const BOOKMARK_KEY = "newsxa_bookmarks";
  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function isBookmarked(id) {
    return getBookmarks().some((b) => b.id === id);
  }
  function toggleBookmark(article) {
    let list = getBookmarks();
    const exists = list.some((b) => b.id === article.id);
    if (exists) {
      list = list.filter((b) => b.id !== article.id);
    } else {
      list.unshift(article);
      list = list.slice(0, 100);
    }
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
    return !exists;
  }

  /* ---------- Share ------------------------------------------------------ */
  async function shareArticle(article) {
    const shareData = { title: article.title, text: article.title, url: article.link };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        /* user cancelled — fall through silently */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(article.link);
      toast("Link copied to clipboard");
    } catch (e) {
      toast("Couldn't copy link");
    }
  }

  function toast(msg) {
    let el = $(".newsxa-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "newsxa-toast offline-banner";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- Back to top ------------------------------------------------ */
  function initBackToTop() {
    const btn = $(".back-to-top");
    if (!btn) return;
    window.addEventListener(
      "scroll",
      () => btn.classList.toggle("show", window.scrollY > 700),
      { passive: true }
    );
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------- Offline detection ------------------------------------------ */
  function initOffline() {
    let banner = $(".offline-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "offline-banner";
      banner.innerHTML = "You're offline — showing the last saved headlines.";
      document.body.appendChild(banner);
    }
    function update() {
      banner.classList.toggle("show", !navigator.onLine);
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  /* ---------- Active nav link highlighting -------------------------------- */
  function initActiveNav() {
    const page = document.body.getAttribute("data-page") || "home";
    $$(`[data-nav]`).forEach((a) => {
      a.classList.toggle("active", a.getAttribute("data-nav") === page);
    });
  }

  /* ---------- Search (redirects to search results within category page) --- */
  function initSearch() {
    $$(".search-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
          window.location.href = `search.html?q=${encodeURIComponent(input.value.trim())}`;
        }
      });
    });
  }

  /* ---------- Button ripple effect ----------------------------------------- */
  function initRipple() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest(".ripple, .icon-btn, .view-all, .load-more-btn, .filter-chip, .card-bookmark, .share-btn, .retry-btn, .hero-read");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "ripple-effect";
      span.style.width = span.style.height = size + "px";
      span.style.left = e.clientX - rect.left - size / 2 + "px";
      span.style.top = e.clientY - rect.top - size / 2 + "px";
      el.appendChild(span);
      setTimeout(() => span.remove(), 620);
    });
  }

  /* ---------- Smooth page transitions -------------------------------------- */
  function initPageTransitions() {
    requestAnimationFrame(() => document.body.classList.add("page-enter"));
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      let url;
      try {
        url = new URL(href, location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== location.origin) return;
      e.preventDefault();
      document.body.classList.add("page-exit");
      setTimeout(() => { location.href = url.href; }, 220);
    });
  }

  /* ---------- Init --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initHeaderScroll();
    initMobileMenu();
    initCountrySelect();
    initBackToTop();
    initOffline();
    initActiveNav();
    initSearch();
    initRipple();
    initPageTransitions();
    $$(".theme-toggle").forEach((btn) => btn.addEventListener("click", toggleTheme));
  });

  window.Newsxa = {
    $, $$,
    getBookmarks, isBookmarked, toggleBookmark,
    shareArticle, toast,
    getCountry,
    timeAgo: (d) => (window.NewsxaAPI ? NewsxaAPI.timeAgo(d) : ""),
  };
})();
