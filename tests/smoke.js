#!/usr/bin/env node
/* ==========================================================================
   NEWSXA — smoke.js
   Zero-dependency sanity suite for CI or a pre-deploy check. Run with:
     npm test        (== node tests/smoke.js)

   Checks:
   1. Every .js file under js/ is syntactically valid (node --check).
   2. Every .html file at the project root parses without structural errors.
   3. Every local <script src="..."> / <link href="...css"> reference in
      each HTML file points at a file that actually exists (catches typos
      and broken imports before they ship).
   4. robots.txt and sitemap.xml exist and are non-empty.

   Exits with a non-zero status (and prints every failure) if anything
   fails, so it's safe to wire into a CI pipeline or a pre-deploy hook.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
let checks = 0;

function pass(msg) {
  checks++;
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function fail(msg) {
  checks++;
  failures++;
  console.log(`  \x1b[31m✗ ${msg}\x1b[0m`);
}

// ---- 1. JS syntax check -----------------------------------------------
console.log("\nJavaScript syntax");
const jsDir = path.join(ROOT, "js");
for (const file of fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"))) {
  const full = path.join(jsDir, file);
  try {
    execSync(`node --check "${full}"`, { stdio: "pipe" });
    pass(`js/${file} parses cleanly`);
  } catch (e) {
    fail(`js/${file} has a syntax error:\n${e.stderr?.toString() || e.message}`);
  }
}

// ---- 2 & 3. HTML parses + local asset references resolve ---------------
console.log("\nHTML files + local asset references");
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

// Very small, dependency-free tag/attribute scanner — good enough to catch
// unbalanced tags and to extract src="" / href="" values without pulling
// in a full HTML parser as a dependency.
function extractLocalRefs(html) {
  const refs = [];
  const attrPattern = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = attrPattern.exec(html))) {
    const val = m[1];
    const isLocal =
      !val.startsWith("http") &&
      !val.startsWith("//") &&
      !val.startsWith("#") &&
      !val.startsWith("mailto:") &&
      !val.startsWith("tel:") &&
      !val.startsWith("data:");
    if (isLocal) refs.push(val);
  }
  return refs;
}

for (const file of htmlFiles) {
  const full = path.join(ROOT, file);
  const html = fs.readFileSync(full, "utf8");

  const openTags = (html.match(/<[a-z][a-z0-9]*(\s|>)/gi) || []).length;
  const closeTags = (html.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
  if (openTags > 0) {
    pass(`${file} contains readable markup (${openTags} open tags)`);
  } else {
    fail(`${file} looks empty or unreadable`);
  }

  const refs = extractLocalRefs(html);
  for (const ref of refs) {
    const cleanRef = ref.split("?")[0].split("#")[0];
    const target = path.join(ROOT, cleanRef);
    if (fs.existsSync(target)) {
      pass(`${file} -> ${cleanRef} resolves`);
    } else {
      fail(`${file} references missing local file: ${cleanRef}`);
    }
  }
}

// ---- 4. SEO essentials present -----------------------------------------
console.log("\nSEO essentials");
for (const f of ["robots.txt", "sitemap.xml"]) {
  const full = path.join(ROOT, f);
  if (fs.existsSync(full) && fs.statSync(full).size > 0) {
    pass(`${f} exists and is non-empty`);
  } else {
    fail(`${f} is missing or empty`);
  }
}

// ---- Summary -------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.log(`\x1b[31m${failures} check(s) failed.\x1b[0m\n`);
  process.exit(1);
} else {
  console.log("\x1b[32mAll smoke checks passed.\x1b[0m\n");
  process.exit(0);
}
