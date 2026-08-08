// One-way import of the hand written GitHub-wiki pages into this repo's guides tier.
//
// Guides are the one part of this site nobody generates: they say how to use a mod, while the reference says
// what exists. This script only moves them in and fixes what wiki markup assumes - it does not rewrite prose.
//
//   node scripts/migrate-wiki.mjs <path to Workspace/docs>
//
// Run once per mod. After that the pages live here and are edited here.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error('usage: node scripts/migrate-wiki.mjs <path to Workspace/docs>');
  process.exit(2);
}

// A wiki whose whole job was to list the API surface is replaced by the generated reference, not moved next
// to it. Two references that drift apart are worse than one.
const SUPERSEDED = new Set(['API-Reference.md']);

const kebab = (name) => name.replace(/\.md$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const yaml = (s) => JSON.stringify(String(s ?? '').replace(/\s+/g, ' ').trim());

/**
 * Home.md links the pages in the order they are meant to be read; nothing else in a wiki records that. The
 * heading above that list is not consistent across these wikis, so every internal link in the file counts,
 * in document order. External links are not page names and drop out on their own.
 */
function readingOrder(homeText) {
  if (!homeText) return [];
  const text = homeText.replace(/\r\n/g, '\n');
  const names = [...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1] ?? m[2])
    .filter((t) => !/^(https?:|\/\/|#|mailto:)/.test(t))
    .map(kebab);
  return [...new Set(names)];
}

function convert(text, slug, known, where) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let title = null;
  const body = [];

  for (const line of lines) {
    if (title === null && /^#\s+/.test(line)) { title = line.replace(/^#\s+/, '').trim(); continue; }
    if (/^>\s*🛟/.test(line)) continue;            // support line, already on the mod's overview page
    body.push(line);
  }

  // A wiki link is a bare page name, in either of the two spellings these wikis use. On this site the same
  // page is a route under the mod. Left alone, `[[Pack Format]]` ships to readers as those literal brackets.
  //
  // A page whose whole job was the API surface is not migrated, so links to it point at the generated
  // reference instead of at a page that no longer exists.
  const route = (name) => {
    const page = kebab(name);
    // A wiki link to a page that was never written 404s on GitHub too. Carrying it over silently would
    // turn one broken link into a broken link with a nicer URL.
    if (!known.has(page)) {
      throw new Error(`${where}: link to "${name}", which is not a page in this wiki. ` +
        `Existing pages: ${[...known].sort().join(', ')}`);
    }
    return SUPERSEDED.has(`${name.replace(/\.md$/, '')}.md`) || page === 'api-reference'
      ? `/mods/${slug}/api/`
      : `/mods/${slug}/guides/${page}/`;
  };

  const linked = body.join('\n')
    // Rewrite the bare-name form first, and skip anything that already looks like a path or a file: after
    // the `[[...]]` pass the document contains absolute routes, and a second pass would mangle them.
    .replace(/\]\(([^):\s#]+)\)/g, (m, target) =>
      (target.startsWith('/') || target.startsWith('.') || /\.[a-z0-9]{2,4}$/i.test(target)
        ? m
        : `](${route(target)})`))
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (m, page, label) => `[${(label ?? page).trim()}](${route(page)})`);

  const lead = linked.split('\n')
    .find((l) => l.trim() && !l.startsWith('>') && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('```'));

  // A description that stops at "It lives under:" promises a list the search result will not show.
  const sentence = (lead ?? '').trim().match(/^.*?[.!?](?=\s|$)/)?.[0] ?? (lead ?? '').trim().replace(/[:,]$/, '');

  return { title, description: sentence, body: linked.replace(/^\n+/, '') };
}

let mods = 0;
let pages = 0;

for (const modDir of readdirSync(SOURCE, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const wiki = join(SOURCE, modDir.name, 'wiki');
  if (!existsSync(wiki)) continue;

  const slug = modDir.name.toLowerCase();
  const files = readdirSync(wiki).filter((f) => f.endsWith('.md'));
  const home = files.includes('Home.md') ? readFileSync(join(wiki, 'Home.md'), 'utf8') : null;
  const order = readingOrder(home);

  const outDir = join(ROOT, 'content/guides', slug);
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const file of files) {
    if (file === 'Home.md') continue;             // the mod's README already is its front page here
    if (SUPERSEDED.has(file)) { console.log(`  skip ${slug}/${file} (generated reference covers it)`); continue; }

    const slugName = kebab(file);
    const known = new Set(files.map(kebab));
    const { title, description, body } =
      convert(readFileSync(join(wiki, file), 'utf8'), slug, known, join(wiki, file));
    if (!title) throw new Error(`${join(wiki, file)}: no H1, so the page has no title to carry over`);

    const rank = order.indexOf(slugName);
    const front = [
      '---',
      `title: ${yaml(title)}`,
      `description: ${yaml(description)}`,
      'sidebar:',
      `  order: ${rank === -1 ? 50 + written : rank + 1}`,
      '---',
      '',
    ].join('\n');

    writeFileSync(join(outDir, `${slugName}.md`), front + body + '\n');
    written++;
  }

  mods++;
  pages += written;
  console.log(`${slug.padEnd(14)} ${String(written).padStart(2)} pages${order.length ? '' : '  (no reading order found, alphabetical)'}`);
}

console.log(`\nmigrated ${pages} pages across ${mods} mods into content/guides/`);
