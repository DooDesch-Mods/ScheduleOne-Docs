// Packs the built docs into one file the MCP server can read on its own.
//
//   node scripts/bundle-corpus.mjs        writes dist/mcp-corpus.json
//
// Without this the MCP server needs a clone of this repo, an authenticated `gh`, the .NET SDK and a full
// ingest before it can answer anything - which is a lot to ask of someone who only wants their coding agent
// to stop inventing method signatures. The bundle ships with the site, so the server needs Node and nothing
// else.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'src/content/docs');
const API = join(ROOT, 'src/generated/api');
const OUT = join(ROOT, 'dist/mcp-corpus.json');
const SITE = (process.env.DOCS_SITE ?? 'https://docs.doodesch.de').replace(/\/$/, '');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

function slugFromRel(rel) {
  const s = rel.replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (s === 'index') return '';
  return s.endsWith('/index') ? s.slice(0, -'/index'.length) : s;
}

const pages = walk(DOCS).map((file) => {
  const { data, content } = matter(readFileSync(file, 'utf8'));
  const slug = slugFromRel(relative(DOCS, file).split(sep).join('/'));
  return {
    slug,
    title: data.title ?? slug ?? 'Home',
    description: data.description ?? '',
    order: data?.sidebar?.order ?? 100,
    markdown: content.trim(),
  };
});

const surfaces = {};
if (existsSync(API)) {
  for (const f of readdirSync(API).filter((f) => f.endsWith('.json'))) {
    surfaces[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(API, f), 'utf8'));
  }
}

const bundle = {
  version: 1,
  site: SITE,
  generatedAt: new Date().toISOString(),
  pages,
  surfaces,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(bundle), 'utf8');
console.log(`bundle-corpus: ${pages.length} pages, ${Object.keys(surfaces).length} API surfaces, ` +
  `${(statSync(OUT).size / 1024).toFixed(0)} KB`);

// A build that succeeds proves nothing about what is being served. This is the one file an outside check
// can read to tell whether the site is current: if its age passes a day, something upstream stopped.
const ingest = JSON.parse(readFileSync(join(ROOT, 'src/generated/ingest.json'), 'utf8'));
const health = {
  generatedAt: bundle.generatedAt,
  commit: process.env.GITHUB_SHA ?? null,
  pages: pages.length,
  mods: ingest.mods.length,
  apis: Object.keys(surfaces).length,
  // Named per mod, so a comparison can tell "one mod vanished" from "the count happens to match".
  versions: Object.fromEntries(ingest.mods.map((m) => [m.slug, m.released ? m.version : null])),
  apiMods: ingest.mods.filter((m) => m.coverage).map((m) => m.slug).sort(),
};
writeFileSync(join(ROOT, 'dist/health.json'), JSON.stringify(health, null, 2), 'utf8');
console.log(`bundle-corpus: health.json for ${health.mods} mods, ${health.apis} APIs`);
