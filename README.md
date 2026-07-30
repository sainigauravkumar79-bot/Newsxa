# Newsxa

**Latest News. Faster. Smarter.**

A real-time news aggregator — premium, colorful, 3D card-based UI with dark mode, live RSS/API data, and zero fake or placeholder content anywhere in the codebase. Pure HTML/CSS/vanilla JS: no build step, no framework, no bundler required.

---

## Project structure

```
newsxa/
├── index.html              Home — hero + 10 category sections
├── category.html           Reusable template for every nav page (?cat=world, ?cat=technology, ...)
├── search.html              Live client-side search across all connected sources
├── bookmarks.html           Locally saved articles (localStorage, per-device)
├── about.html
├── contact.html
├── privacy.html
├── terms.html
├── disclaimer.html
├── sources.html             Full transparency list of every RSS/API feed in use
├── 404.html                 Custom not-found page
├── robots.txt
├── sitemap.xml
├── package.json             npm scripts (dev server, tests) — zero runtime dependencies
├── netlify.toml              Deployment config + security headers (Netlify)
├── _headers                   Deployment config + security headers (Cloudflare Pages)
├── _redirects                 404 fallback routing (Cloudflare Pages)
├── LICENSE                   MIT (code) — see note on aggregated content ownership
├── .gitignore
├── tests/
│   └── smoke.js              Zero-dependency CI check: JS syntax, HTML validity, broken links, SEO files
├── css/
│   └── style.css             All design tokens, layout, components, dark theme, animations
└── js/
    ├── api.js                 Live RSS fetching, caching, normalization — NO fake data, ever
    ├── common.js               Header, theme toggle, mobile menu, bookmarks, share, back-to-top, offline banner, ripple, page transitions
    ├── cards.js                 Card / skeleton / empty / error state markup (shared by every page)
    ├── carousel.js               Horizontal slider controller (arrow buttons, snap-scroll)
    ├── app.js                    Home page orchestration (hero + all 10 sections)
    ├── category.js               Category page: pagination, infinite scroll, filter chips
    └── search.js                 Cross-source search page
```

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org) 18+ (only needed for the local dev server and test runner — the site itself ships zero JS dependencies to the browser)

### Install

```bash
git clone <your-repo-url> newsxa
cd newsxa
npm install
```

`npm install` only pulls in `serve`, a tiny static file server used for local development. The production site itself loads no npm packages in the browser — everything shipped to users is plain HTML/CSS/JS plus Google Fonts.

### Run locally

```bash
npm run dev
```

Opens the site at `http://localhost:5173`. Alternatively, any static server works:

```bash
python3 -m http.server 8080
# or simply open index.html directly in a browser — RSS fetches work fine from file:// in most browsers,
# though a local server is recommended for consistent relative-path behavior
```

### Run tests

```bash
npm test
```

Runs `tests/smoke.js` — a dependency-free suite that checks every JS file is syntactically valid, every HTML file's local `src`/`href` references resolve to a real file, and `robots.txt` / `sitemap.xml` are present. Wire this into CI (`npm test` as a pre-deploy or pre-merge check) to catch broken imports before they ship.

---

## How live data works

Browsers can't fetch raw RSS XML cross-origin, so `js/api.js` routes each feed through **rss2json.com**'s free public conversion endpoint, with a raw-XML fallback via **allorigins.win** if that's rate-limited or down. Sources currently connected:

| Section | Source(s) | Feed type |
|---|---|---|
| Top Headlines | BBC News | Public RSS |
| World | BBC News, The New York Times | Public RSS |
| Technology | BBC News, The New York Times | Public RSS |
| Business | BBC News, The New York Times | Public RSS |
| Sports | BBC Sport | Public RSS |
| Entertainment | BBC News | Public RSS |
| Health | BBC News, The New York Times | Public RSS |
| Science | BBC News | Public RSS |
| Trending | Google News (top stories) | Public RSS |
| My Country | Google News (per-country edition) | Public RSS |

**Optional:** add a free [GNews.io](https://gnews.io) API key to `GNEWS_API_KEY` in `js/api.js` to blend in an additional live source. It's a complete no-op until a key is supplied — never a fake fallback.

Every section on every page follows the same lifecycle:
1. **Skeleton loading** — animated shimmer placeholders while the fetch is in flight.
2. **Real cards on success** — real image, real headline, real source, real "time ago", category badge, bookmark, share, and Read More, all linking to the original publisher.
3. **Explicit error state with a Retry button** if every configured source for that section fails. It never silently falls back to placeholder or fabricated content.
4. **6-minute cache + auto-refresh** — results are cached in `localStorage` and re-fetched automatically every 6 minutes (inside the 5–10 minute polling window recommended for RSS etiquette).

---

## Feature checklist

- [x] Real RSS/API sources connected (BBC News, The New York Times, Google News; optional GNews.io)
- [x] Live news loads client-side with skeleton → content → error lifecycle
- [x] Real images per article, with a real-photo (Picsum Photos) fallback — never a solid-color placeholder box
- [x] No fake/dummy/lorem content anywhere in the codebase
- [x] All 10 category pages work off one shared template (`category.html?cat=`)
- [x] Cross-source search (`search.html`)
- [x] Country selector (auto-reloads "My Country" on change, persisted in localStorage)
- [x] Bookmark system (localStorage, dedicated `/bookmarks.html`)
- [x] Share (native `navigator.share` where available, clipboard fallback elsewhere)
- [x] Pagination + infinite scroll + Load More on category pages
- [x] Dark mode (persisted, respects OS preference on first visit)
- [x] Responsive: mobile-first, tested down to small phones and up through desktop
- [x] Animations: fade/slide-up, card lift, button ripple, page-fade transitions, shimmer skeletons
- [x] SEO: canonical URLs, Open Graph + Twitter cards, `NewsMediaOrganization` JSON-LD, `robots.txt`, `sitemap.xml`
- [x] Glassmorphism sticky header, category color-coding, horizontal carousels with hover-reveal arrows

---

## Production notes

- **CORS proxy**: rss2json's public endpoint is fine for demos and light traffic. For real production load, run your own lightweight RSS→JSON proxy on your domain (or get a paid rss2json API key) so you're not sharing the public rate limit with every other user of the free tier.
- **Images**: articles without an image in their feed fall back to a real photo via **Picsum Photos** (picsum.photos, seeded per article), not a broken-image icon or a colored box. (Historical note: Unsplash Source — `source.unsplash.com` — was fully sunset by Unsplash in June 2024; don't use it in new code.)
- **SEO / crawlability**: content is fetched client-side, so a search engine crawler that doesn't execute JavaScript will see the page shell but not individual headlines. If ranking on headline content specifically matters, add server-side rendering or a prerendering step (e.g., a small Node/Edge function that fetches and injects the first section's HTML before serving).
- **Security headers**: `_headers` (Cloudflare Pages) and `netlify.toml` (Netlify) both set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`. No `Content-Security-Policy` is set by default because the app currently relies on a few inline event handlers (`onload`/`onerror` on images, small inline `<script>` blocks for the footer year and demo toggles) — tightening this to a strict CSP is a good follow-up if you refactor those to external listeners.
- **Fonts**: Fraunces (display/serif), Inter (UI), JetBrains Mono (eyebrows/timestamps/ticker) — loaded from Google Fonts.

---

## Deployment

**Cloudflare Pages is the primary target for this project** (Vercel has been dropped — no `vercel.json` in this repo).

### Cloudflare Pages
1. Push the repo to GitHub/GitLab and connect it in the Cloudflare dashboard (**Workers & Pages → Create → Pages → Connect to Git**), or deploy directly from the CLI:
   ```bash
   npx wrangler pages deploy .
   ```
2. Build settings: **no build command**, output directory `/` (project root) — it's a static site.

`_headers` and `_redirects` are already included and use Cloudflare Pages' native format: security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) plus asset caching for `_headers`, and a 404 fallback to `404.html` for `_redirects`.

### Netlify (secondary option)
Connect the repo in the Netlify dashboard, or:
```bash
npx netlify deploy --prod
```
`netlify.toml` sets the publish directory (`.`), matching security headers, and a catch-all redirect to `404.html`.

### Any static host (GitHub Pages, S3, etc.)
Upload the repository contents as-is — there is no build step. Just make sure the host serves `index.html` at the root and preserves relative paths for `css/` and `js/`.

---

## Before you ship

Run the full check:
```bash
npm test
```

Then manually verify in a real browser (the smoke test checks file wiring, not live network behavior, since RSS fetches require real internet access that CI sandboxes may not have):
- Homepage loads live headlines in all 10 sections within a few seconds
- Country selector reloads "My Country" on change
- Search returns live, deduplicated results across sources
- Dark mode toggle persists across a reload
- A category page's "Load more" / infinite scroll pulls additional live headlines
- Bookmarking a card and revisiting `/bookmarks.html` shows it

---

## License

Code is MIT-licensed (see `LICENSE`). Aggregated headlines, images, and excerpts displayed by the site remain the property of their original publishers (BBC News, The New York Times, Google News, and others) — see `disclaimer.html`.
