/* ==========================================================================
   NEWSXA — carousel.js
   Turns any ".carousel" wrapper (containing a ".carousel-viewport" of cards
   and optional .carousel-arrow.prev/.next buttons) into an arrow-driven,
   snap-scrolling slider. Call NewsxaCarousel.init(rootEl) after injecting
   cards so the arrow disabled-state reflects the real scroll extent.
   ========================================================================== */
(function (global) {
  "use strict";

  function init(root) {
    const viewport = root.querySelector(".carousel-viewport");
    const prev = root.querySelector(".carousel-arrow.prev");
    const next = root.querySelector(".carousel-arrow.next");
    if (!viewport) return;

    function step() {
      const card = viewport.querySelector(".card");
      const gap = 20;
      return card ? card.getBoundingClientRect().width + gap : viewport.clientWidth * 0.8;
    }

    function updateArrows() {
      if (!prev || !next) return;
      const max = viewport.scrollWidth - viewport.clientWidth - 4;
      prev.toggleAttribute("disabled", viewport.scrollLeft <= 4);
      next.toggleAttribute("disabled", viewport.scrollLeft >= max || max <= 0);
    }

    prev && prev.addEventListener("click", () => viewport.scrollBy({ left: -step(), behavior: "smooth" }));
    next && next.addEventListener("click", () => viewport.scrollBy({ left: step(), behavior: "smooth" }));
    viewport.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    // Cards load asynchronously — re-check shortly after render.
    setTimeout(updateArrows, 300);
    updateArrows();
  }

  global.NewsxaCarousel = { init };
})(window);
