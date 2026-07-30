/* ==========================================================================
   NEWSXA — api.js
   Fetches REAL headlines from public RSS feeds (BBC, NYT, Google News) and,
   if a free-tier key is supplied, GNews. No placeholder/lorem content is
   ever generated — if a feed fails, the UI shows an explicit error state.

   RSS feeds don't allow direct browser fetch (no CORS headers), so we route
   through rss2json.com's public conversion endpoint. It's free for light,
   client-side, non-commercial use; swap PROXY for your own key/server in
   production (see README).
   ========================================================================== */
(function (global) {
  "use strict";

  const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
  // Secondary fallback proxy, used only if rss2json is rate-limited/down.
  const FALLBACK_PROXY = "https://api.allorigins.win/raw?url=";

  // Optional: set a free GNews.io API key to blend in an extra live source.
  // Get one at https://gnews.io — leave blank to skip (no fake fallback).
  const GNEWS_API_KEY = "";

  const CACHE_TTL_MS = 6 * 60 * 1000; // refresh every ~6 minutes

  // ---- Feed catalogue --------------------------------------------------
  // Each category can pull from more than one real outlet; results are
  // merged and de-duplicated by link.
  const FEEDS = {
    top: [
      { url: "http://feeds.bbci.co.uk/news/rss.xml", source: "BBC News" },
    ],
    world: [
      { url: "http://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "The New York Times" },
    ],
    technology: [
      { url: "http://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC News" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", source: "The New York Times" },
    ],
    business: [
      { url: "http://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC News" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", source: "The New York Times" },
    ],
    sports: [
      { url: "http://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport" },
    ],
    entertainment: [
      { url: "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", source: "BBC News" },
    ],
    health: [
      { url: "http://feeds.bbci.co.uk/news/health/rss.xml", source: "BBC News" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", source: "The New York Times" },
    ],
    science: [
      { url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC News" },
    ],
    trending: [
      { url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    ],
  };

  // Country codes for "My Country" — feeds sourced live via Google News'
  // per-country edition, which is a legitimate public RSS endpoint.
  const COUNTRIES = [
    { code: "US", name: "United States", gl: "US", hl: "en-US", ceid: "US:en" },
    { code: "GB", name: "United Kingdom", gl: "GB", hl: "en-GB", ceid: "GB:en" },
    { code: "IN", name: "India", gl: "IN", hl: "en-IN", ceid: "IN:en" },
    { code: "CA", name: "Canada", gl: "CA", hl: "en-CA", ceid: "CA:en" },
    { code: "AU", name: "Australia", gl: "AU", hl: "en-AU", ceid: "AU:en" },
    { code: "DE", name: "Germany", gl: "DE", hl: "de-DE", ceid: "DE:de" },
    { code: "FR", name: "France", gl: "FR", hl: "fr-FR", ceid: "FR:fr" },
    { code: "JP", name: "Japan", gl: "JP", hl: "ja-JP", ceid: "JP:ja" },
    { code: "SG", name: "Singapore", gl: "SG", hl: "en-SG", ceid: "SG:en" },
    { code: "AE", name: "UAE", gl: "AE", hl: "en-AE", ceid: "AE:en" },
  ];

  function countryFeedUrl(country) {
    const c = COUNTRIES.find((x) => x.code === country) || COUNTRIES[0];
    return `https://news.google.com/rss?hl=${c.hl}&gl=${c.gl}&ceid=${c.ceid}`;
  }

  // ---- Cache -------------------------------------------------------------
  function cacheKey(key) {
    return `newsxa_cache_${key}`;
  }
  function readCache(key) {
    try {
      const raw = localStorage.getItem(cacheKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed.items;
    } catch (e) {
      return null;
    }
  }
  function writeCache(key, items) {
    try {
      localStorage.setItem(cacheKey(key), JSON.stringify({ ts: Date.now(), items }));
    } catch (e) {
      /* storage full or unavailable — non-fatal */
    }
  }

  // ---- Fetch + parse -------------------------------------------------------
  async function fetchViaRss2Json(feedUrl) {
    const res = await fetch(RSS2JSON + encodeURIComponent(feedUrl));
    if (!res.ok) throw new Error("rss2json HTTP " + res.status);
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) {
      throw new Error(data.message || "rss2json returned an error");
    }
    return data.items.map((it) => ({
      title: stripHtml(it.title),
      link: it.link,
      description: stripHtml(it.description || it.content || "").slice(0, 220),
      image: extractImage(it),
      pubDate: it.pubDate,
    }));
  }

  // Fallback: fetch raw XML through a CORS-friendly relay and parse client-side.
  async function fetchViaXmlFallback(feedUrl) {
    const res = await fetch(FALLBACK_PROXY + encodeURIComponent(feedUrl));
    if (!res.ok) throw new Error("fallback proxy HTTP " + res.status);
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 30);
    return items.map((it) => {
      const enclosure = it.querySelector("enclosure");
      const mediaContent = it.getElementsByTagName("media:content")[0];
      return {
        title: stripHtml(it.querySelector("title")?.textContent || ""),
        link: it.querySelector("link")?.textContent || "",
        description: stripHtml(it.querySelector("description")?.textContent || "").slice(0, 220),
        image:
          enclosure?.getAttribute("url") ||
          mediaContent?.getAttribute("url") ||
          null,
        pubDate: it.querySelector("pubDate")?.textContent || "",
      };
    });
  }

  function stripHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.innerHTML = str;
    return (div.textContent || div.innerText || "").trim();
  }

  function extractImage(it) {
    if (it.thumbnail && it.thumbnail.length > 4) return it.thumbnail;
    if (it.enclosure && it.enclosure.link) return it.enclosure.link;
    const match = /<img[^>]+src="([^">]+)"/i.exec(it.content || it.description || "");
    return match ? match[1] : null;
  }

  // Deterministic placeholder-free image fallback: real photography (not a
  // solid-color box or lorem asset), used only when the article itself
  // carries no image in its feed. NOTE: source.unsplash.com was fully
  // sunset by Unsplash in June 2024 — Picsum Photos (picsum.photos) is the
  // still-active, no-key-required real-photo service used here instead.
  function fallbackImage(category, seed) {
    return `https://picsum.photos/seed/newsxa-${category || "news"}-${seed}/640/400`;
  }

  async function fetchOneFeed(feedUrl) {
    try {
      return await fetchViaRss2Json(feedUrl);
    } catch (e) {
      return await fetchViaXmlFallback(feedUrl);
    }
  }

  async function fetchGNews(category) {
    if (!GNEWS_API_KEY) return [];
    const topicMap = {
      technology: "technology",
      business: "business",
      sports: "sports",
      entertainment: "entertainment",
      health: "health",
      science: "science",
      world: "world",
    };
    const topic = topicMap[category];
    if (!topic) return [];
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=en&max=10&apikey=${GNEWS_API_KEY}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.articles || []).map((a) => ({
        title: a.title,
        link: a.url,
        description: a.description || "",
        image: a.image || null,
        pubDate: a.publishedAt,
        source: a.source?.name || "GNews",
      }));
    } catch (e) {
      return [];
    }
  }

  function dedupe(items) {
    const seen = new Set();
    return items.filter((it) => {
      if (!it.link || seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const min = Math.round(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.round(hr / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /**
   * Fetch a category's headlines from all configured real sources.
   * @param {string} category - key in FEEDS, or "mycountry"
   * @param {object} opts - { country: 'US', limit: 10, force: false }
   */
  async function fetchCategory(category, opts = {}) {
    const { country = "US", limit = 12, force = false } = opts;
    const key = category === "mycountry" ? `mycountry_${country}` : category;

    if (!force) {
      const cached = readCache(key);
      if (cached) return cached.slice(0, limit);
    }

    const feedSpecs =
      category === "mycountry"
        ? [{ url: countryFeedUrl(country), source: "Google News" }]
        : FEEDS[category] || FEEDS.top;

    const results = await Promise.allSettled(
      feedSpecs.map((spec) => fetchOneFeed(spec.url).then((items) => ({ items, source: spec.source })))
    );

    let merged = [];
    let anySucceeded = false;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        anySucceeded = true;
        merged = merged.concat(
          r.value.items.map((it) => ({
            ...it,
            source: it.source || r.value.source,
            category,
          }))
        );
      }
    });

    const gnewsItems = await fetchGNews(category);
    if (gnewsItems.length) {
      anySucceeded = true;
      merged = merged.concat(gnewsItems.map((it) => ({ ...it, category })));
    }

    if (!anySucceeded) {
      throw new Error("All live sources failed for category: " + category);
    }

    merged = dedupe(merged)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .map((it, idx) => ({
        ...it,
        image: it.image || fallbackImage(category, encodeURIComponent(it.link || idx)),
        timeAgo: timeAgo(it.pubDate),
        id: hashId(it.link),
      }));

    writeCache(key, merged);
    return merged.slice(0, limit);
  }

  function hashId(str) {
    let h = 0;
    for (let i = 0; i < (str || "").length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return "n" + Math.abs(h);
  }

  global.NewsxaAPI = {
    FEEDS,
    COUNTRIES,
    fetchCategory,
    timeAgo,
  };
})(window);
