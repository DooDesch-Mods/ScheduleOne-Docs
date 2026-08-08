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
// Normalised to '' for a site at the domain root, or '/prefix' for one under a path.
const BASE = (process.env.DOCS_BASE ?? '/').replace(/\/+$/, '');

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
  // Code samples are not navigation. A rendered snippet containing `src="s1://avatar/..."` or a prose
  // mention of `<img src="...">` is text about a URL, not a link to one, and counting it would make this
  // check cry wolf on every documented example. Both the block and the inline form have to go.
  const html = readFileSync(file, 'utf8')
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<code[\s\S]*?<\/code>/g, ' ');
  const from = '/' + posix.relative(DIST.replace(/\\/g, '/'), file.replace(/\\/g, '/'));

  // `src` counts too: a README's raw <img> carries a repo-relative path, and checking only href let a
  // broken banner image ship while CI reported every link healthy.
  for (const m of html.matchAll(/\s(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
    const href = m[1];
    // Any scheme at all, not just the handful we happen to use: a mod's own `s1://` links are as external
    // to this site as `https://` is.
    if (/^([a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|#)/.test(href)) continue;

    const raw = href.split('#')[0].split('?')[0];
    if (!raw) continue;

    // A relative target resolves against the page's own directory, which is exactly how the broken image
    // got in. Resolve it the way a browser would instead of skipping it.
    const route = raw.startsWith('/')
      ? raw
      : posix.resolve(posix.dirname(from), raw);

    if (BASE && !route.startsWith(BASE + '/') && route !== BASE) continue;  // outside this site's base

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
