# Newsxa

**Latest News. Faster. Smarter.**

A real-time news aggregator — premium, colorful, 3D card-based UI with dark mode, live RSS/API data, and zero fake or placeholder content anywhere in the codebase. Pure HTML/CSS/vanilla JS: no build step, no framework, no bundler required.

## Getting started

### Prerequisites
- Node.js 18+ (only for the local dev server / test runner — the shipped site itself loads zero JS dependencies)

### Install & run

\`\`\`bash
npm install
npm run dev
\`\`\`

Opens at `http://localhost:5173`. Or use any static server (`python3 -m http.server 8080`), or just open `index.html` directly.

### Test

\`\`\`bash
npm test
\`\`\`

Runs `tests/smoke.js` — checks every JS file's syntax and every HTML file's local `src`/`href` references resolve, plus that `robots.txt`/`sitemap.xml` exist.

## How live data works

`js/api.js` routes RSS feeds through rss2json.com (with an allorigins.win XML fallback) since browsers can't fetch raw RSS cross-origin. Connected sources: BBC News, The New York Times, Google News (top stories + per-country editions). Optional GNews.io key slot in `js/api.js` (blank by default — no-op until you add one).

Every section: skeleton loading → real cards (image, headline, source, time, category badge, bookmark, share, Read More) → explicit error state with Retry if all sources fail. 6-minute cache + auto-refresh.

## Deployment

- **Vercel**: `npx vercel` (uses `vercel.json` — security headers + clean URLs, no build step)
- **Netlify**: `npx netlify deploy --prod` (uses `netlify.toml`)
- **Any static host**: upload as-is, keep `css/` and `js/` paths relative to root

## Production notes

- rss2json's public tier is fine for demos; for real traffic run your own proxy or get a paid key.
- Missing article images fall back to Picsum Photos (real photography, no key needed) — never a placeholder box. (Unsplash Source, `source.unsplash.com`, was sunset in June 2024 — don't use it.)
- Client-side rendering means crawlers that don't run JS see the shell, not individual headlines — add SSR/prerendering if headline-level SEO matters.

## License

MIT (code) — see `LICENSE`. Aggregated headlines/images remain property of their original publishers — see `disclaimer.html`.
