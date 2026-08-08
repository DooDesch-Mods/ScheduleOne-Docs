// Indexing and query logic for the DooDesch mod docs MCP.
// Pure functions over the built markdown corpus - no network, no API cost.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';

const DEFAULT_DOCS_DIR = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
const DEFAULT_API_DIR = fileURLToPath(new URL('../src/generated/api/', import.meta.url));
const DEFAULT_SITE_URL = 'https://doodesch-mods.github.io/ScheduleOne-Docs';

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
  let s = rel.replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (s === 'index') return '';
  if (s.endsWith('/index')) return s.slice(0, -'/index'.length);
  return s;
}

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

export function loadCorpus(options = {}) {
  const docsDir = options.docsDir || process.env.DOCS_DIR || DEFAULT_DOCS_DIR;
  const apiDir = options.apiDir || process.env.DOCS_API_DIR || DEFAULT_API_DIR;
  const siteUrl = (options.siteUrl || process.env.DOCS_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

  const pages = [];
  for (const file of walk(docsDir)) {
    const raw = readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const rel = relative(docsDir, file).split(sep).join('/');
    const slug = slugFromRel(rel);
    const { mod, kind } = classify(slug);
    const headings = extractHeadings(content);
    pages.push({
      id: slug || 'index',
      slug,
      file,
      mod,
      kind,
      title: data.title || headings[0] || slug || 'Home',
      description: data.description || '',
      order: data?.sidebar?.order ?? 100,
      url: slug === '' ? `${siteUrl}/` : `${siteUrl}/${slug}/`,
      headings,
      markdown: content.trim(),
      body: toPlainText(content),
    });
  }

  // The generated API surface, keyed by mod. This is what answers "does this method exist" without the
  // agent having to read a page and believe its prose.
  const surfaces = new Map();
  if (existsSync(apiDir)) {
    for (const f of readdirSync(apiDir).filter((f) => f.endsWith('.json'))) {
      surfaces.set(f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(apiDir, f), 'utf8')));
    }
  }

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
  return { pages, mini, byId, surfaces, docsDir, apiDir, siteUrl };
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
    members: t.Members.map((m) => ({
      kind: m.Kind,
      name: m.Name,
      signature: m.Signature,
      summary: m.Summary ?? undefined,
    })),
  }));
}
