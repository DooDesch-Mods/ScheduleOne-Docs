// Indexing and query logic for the DooDesch mod docs MCP.
//
// The corpus is one JSON bundle that ships with the site. That is deliberate: reading the repository
// directly would mean a clone, an authenticated `gh`, the .NET SDK and a full ingest before the server can
// answer anything - a lot to ask of someone who only wants their coding agent to stop inventing signatures.

import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import MiniSearch from 'minisearch';

const DEFAULT_BUNDLE_URL = 'https://docs.doodesch.de/mcp-corpus.json';
const LOCAL_BUNDLE = fileURLToPath(new URL('../dist/mcp-corpus.json', import.meta.url));
const CACHE_FILE = join(tmpdir(), 'doodesch-docs-corpus.json');
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * What a page is, which is the facet an agent actually filters on: it wants the reference for a signature
 * and the guide for how to call it, and mixing the two is what makes an answer wrong.
 */
function classify(slug) {
  const parts = slug.split('/');
  if (parts[0] !== 'mods') return { mod: null, kind: 'site' };
  const mod = parts[1] ?? null;
  if (parts.length === 2) return { mod, kind: 'overview' };
  if (parts[2] === 'api') return { mod, kind: 'reference' };
  if (parts[2] === 'guides') return { mod, kind: 'guide' };
  if (parts[2] === 'changelog') return { mod, kind: 'changelog' };
  return { mod, kind: 'other' };
}

function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, (m) => ' ' + m.replace(/```/g, ' ') + ' ')
    .replace(/^import\s.+$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = /^#{1,4}\s+(.+?)\s*$/.exec(line);
    if (m) out.push(m[1].replace(/[`*]/g, ''));
  }
  return out;
}

/**
 * The corpus, in order of preference: an explicit path, the copy this repo just built, then the published
 * one. The published bundle is cached on disk so an agent that restarts twice in an hour does not refetch
 * it, and a stale cache is still served when the network is down - out-of-date docs beat no docs.
 */
async function readBundle(options) {
  const explicit = options.bundle ?? process.env.DOCS_BUNDLE;
  if (explicit) return JSON.parse(readFileSync(explicit, 'utf8'));
  if (existsSync(LOCAL_BUNDLE)) return JSON.parse(readFileSync(LOCAL_BUNDLE, 'utf8'));

  const url = options.bundleUrl ?? process.env.DOCS_BUNDLE_URL ?? DEFAULT_BUNDLE_URL;
  const fresh = existsSync(CACHE_FILE) && Date.now() - statSync(CACHE_FILE).mtimeMs < CACHE_MAX_AGE_MS;
  if (fresh) return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    const text = await response.text();
    const parsed = JSON.parse(text);
    writeFileSync(CACHE_FILE, text, 'utf8');
    return parsed;
  } catch (err) {
    if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    throw new Error(`could not read the docs corpus from ${url}: ${err.message}`);
  }
}

export async function loadCorpus(options = {}) {
  const bundle = await readBundle(options);
  const siteUrl = (options.siteUrl ?? bundle.site ?? 'https://docs.doodesch.de').replace(/\/$/, '');

  const pages = bundle.pages.map((p) => {
    const { mod, kind } = classify(p.slug);
    return {
      id: p.slug || 'index',
      slug: p.slug,
      mod,
      kind,
      title: p.title,
      description: p.description ?? '',
      order: p.order ?? 100,
      url: p.slug === '' ? `${siteUrl}/` : `${siteUrl}/${p.slug}/`,
      headings: extractHeadings(p.markdown),
      markdown: p.markdown,
      body: toPlainText(p.markdown),
    };
  });

  const surfaces = new Map(Object.entries(bundle.surfaces ?? {}));

  const mini = new MiniSearch({
    fields: ['title', 'description', 'headings', 'body'],
    storeFields: ['title', 'description', 'mod', 'kind', 'slug', 'url'],
    searchOptions: {
      boost: { title: 5, headings: 3, description: 3, body: 1 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  });
  mini.addAll(pages.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    headings: p.headings.join(' \n '),
    body: p.body,
    mod: p.mod,
    kind: p.kind,
    slug: p.slug,
    url: p.url,
  })));

  const byId = new Map(pages.map((p) => [p.id, p]));
  return { pages, mini, byId, surfaces, siteUrl, generatedAt: bundle.generatedAt };
}

function snippetFor(page, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = page.body.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return (page.description || page.body).slice(0, 220);
  const start = Math.max(0, idx - 90);
  const end = Math.min(page.body.length, idx + 130);
  return (start > 0 ? '...' : '') + page.body.slice(start, end).trim() + (end < page.body.length ? '...' : '');
}

export function search(corpus, query, { limit = 8, mod, kind } = {}) {
  let results = corpus.mini.search(query);
  if (mod) results = results.filter((r) => r.mod === mod);
  if (kind) results = results.filter((r) => r.kind === kind);
  return results.slice(0, limit).map((r) => {
    const page = corpus.byId.get(r.id);
    return {
      title: r.title,
      mod: r.mod ?? undefined,
      kind: r.kind,
      slug: r.slug,
      url: r.url,
      score: Math.round(r.score * 100) / 100,
      description: r.description || undefined,
      snippet: page ? snippetFor(page, query) : undefined,
    };
  });
}

export function normalizePathInput(corpus, input) {
  let s = String(input || '').trim();
  s = s.replace(corpus.siteUrl, '');
  s = s.replace(/^https?:\/\/[^/]+/, '');
  s = s.replace(/[?#].*$/, '');
  s = s.replace(/\.mdx?$/, '');
  s = s.replace(/^\/+|\/+$/g, '');
  s = s.replace(/^ScheduleOne-Docs\/?/i, '');
  return s;
}

export function getPage(corpus, input) {
  const slug = normalizePathInput(corpus, input);
  const page = corpus.byId.get(slug || 'index');
  if (!page) return null;
  return {
    title: page.title,
    mod: page.mod ?? undefined,
    kind: page.kind,
    slug: page.slug,
    url: page.url,
    description: page.description || undefined,
    markdown: page.markdown,
  };
}

export function listMods(corpus) {
  const map = new Map();
  for (const p of corpus.pages) {
    if (!p.mod) continue;
    if (!map.has(p.mod)) map.set(p.mod, { mod: p.mod, description: '', pages: 0, guides: 0, hasApi: false });
    const m = map.get(p.mod);
    m.pages += 1;
    if (p.kind === 'guide') m.guides += 1;
    if (p.kind === 'reference') m.hasApi = true;
    if (p.kind === 'overview') m.description = p.description;
  }
  for (const m of map.values()) {
    const surface = corpus.surfaces.get(m.mod);
    if (surface) m.apiTypes = surface.map((t) => t.Name);
  }
  return [...map.values()].sort((a, b) => Number(b.hasApi) - Number(a.hasApi) || a.mod.localeCompare(b.mod));
}

export function listPages(corpus, { mod, kind } = {}) {
  return corpus.pages
    .filter((p) => (mod ? p.mod === mod : true))
    .filter((p) => (kind ? p.kind === kind : true))
    .sort((a, b) => (a.mod ?? '').localeCompare(b.mod ?? '') || a.order - b.order || a.title.localeCompare(b.title))
    .map((p) => ({
      title: p.title,
      mod: p.mod ?? undefined,
      kind: p.kind,
      slug: p.slug,
      url: p.url,
      description: p.description || undefined,
    }));
}

/** Every public member of one mod's API, signature first. The answer to "what can I actually call". */
export function getApiSurface(corpus, mod) {
  const surface = corpus.surfaces.get(mod);
  if (!surface) return null;
  return surface.map((t) => ({
    kind: t.Kind,
    name: t.Name,
    namespace: t.Namespace,
    signature: t.Signature,
    summary: t.Summary ?? undefined,
    addedIn: t.AddedIn ?? undefined,
    members: t.Members.map((m) => ({
      kind: m.Kind,
      name: m.Name,
      signature: m.Signature,
      summary: m.Summary ?? undefined,
      // Present only where the mod has enough releases to diff. Absent means "since the first release
      // that had an API", not "unknown whether it exists".
      addedIn: m.AddedIn ?? undefined,
    })),
  }));
}
