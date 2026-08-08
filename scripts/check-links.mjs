// Verifies every internal link in the built site resolves to a page that exists.
//
//   node scripts/check-links.mjs
//
// This exists because the per-mod pages are assembled by rule, not by hand: guide links were rewritten from
// wiki page names, README links from repo-relative paths. A rule that is one character wrong produces a site
// that builds cleanly and 404s on click, which no build step would ever notice.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = process.env.DOCS_BASE ?? '/ScheduleOne-Docs';

if (!existsSync(DIST)) {
  console.error('check-links: no dist/, run the build first');
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

/** A route resolves if the build wrote a file for it, in either of Astro's two output shapes. */
function resolves(route) {
  const rel = route.replace(/^\//, '');
  return existsSync(join(DIST, rel))
    || existsSync(join(DIST, rel, 'index.html'))
    || existsSync(join(DIST, `${rel.replace(/\/$/, '')}.html`));
}

const files = walk(DIST);
const broken = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const from = '/' + posix.relative(DIST.replace(/\\/g, '/'), file.replace(/\\/g, '/'));

  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|\/\/|#|mailto:|data:|javascript:)/.test(href)) continue;

    const route = href.split('#')[0].split('?')[0];
    if (!route) continue;
    if (!route.startsWith('/')) continue;               // relative assets, resolved by the browser
    if (!route.startsWith(BASE + '/') && route !== BASE) continue;  // outside this site's base

    checked++;
    if (!resolves(route.slice(BASE.length))) broken.push({ from, href: route });
  }
}

const unique = [...new Map(broken.map((b) => [`${b.from} -> ${b.href}`, b])).values()];
console.log(`check-links: ${checked} internal links across ${files.length} pages`);

if (unique.length) {
  console.log(`\n${unique.length} broken:`);
  for (const b of unique.slice(0, 40)) console.log(`  ${b.href}\n      from ${b.from}`);
  if (unique.length > 40) console.log(`  ... and ${unique.length - 40} more`);
  process.exit(1);
}
console.log('check-links: every internal link resolves');
