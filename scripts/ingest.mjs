// Builds the per-mod pages from the mod repositories themselves. Run before `astro build`.
//
// The mod list is NOT kept here. It comes from the GitHub org: every public, non-archived repo carrying the
// `game-schedule-i` topic is a candidate, and a repo that exposes an API source file gets a reference section.
// A new mod appears in the docs by being tagged on GitHub, not by anyone editing this file.
//
// Nothing is fetched from a working copy: the source of truth is each repo at its latest release tag, which is
// the version a reader actually has installed. A repo with no release yet is read from its default branch and
// says so on the page, because "documented but undownloadable" is a different claim than "this is what shipped".
//
//   node scripts/ingest.mjs             incremental, uses .cache
//   node scripts/ingest.mjs --fresh     ignore the cache
//   node scripts/ingest.mjs --only snitch,sideload

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, cpSync, renameSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORG = 'DooDesch-Mods';
const TOPIC = 'game-schedule-i';
const OUT = join(ROOT, 'src/content/docs/mods');
const GENERATED = join(ROOT, 'src/generated');
const CACHE = join(ROOT, '.cache');
const GUIDES = join(ROOT, 'content/guides');
const APIDOC = join(ROOT, 'tools/apidoc');

const args = process.argv.slice(2);
const FRESH = args.includes('--fresh');
const ONLY = (args.find((a) => a.startsWith('--only='))?.split('=')[1] ?? '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Repos that carry the topic but are not mods a reader installs.
const SKIP = new Set(['ScheduleOne-Docs']);

// An example repo vendors a copy of the API it demonstrates. Generating a reference from that copy would
// publish the same types twice, under the wrong mod, at whatever version the example was last updated to.
const EXAMPLE_TOPIC = 'example';

// An API surface is found by convention. The map is only for repos that do not follow one.
const API_OVERRIDES = {};

// Where the reference lives inside a repo. Checked in order; the first pattern that matches wins.
const API_PATTERNS = [
  /^[^/]+\.Api\/[^/]+\.cs$/,   // Snitch.Api/Snitch.cs
  /^Api\/API\.cs$/,            // SideHustle
  /^API\.cs$/,                 // Personnel, Inkorporated
];

// ---------------------------------------------------------------------------------------------------------------

function gh(path, jq) {
  const argv = ['api', path];
  if (jq) argv.push('--paginate', '--jq', jq);
  // stderr is captured rather than inherited: a repo with no release answers 404, and that is an expected
  // answer here, not something a reader of the build log should have to triage.
  return execFileSync('gh', argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Reads a file that the repo's tree says exists. Absence is decided from the tree listing rather than from a
 * failed request, so a real transport error can still be told apart from a mod that simply has no CHANGELOG.
 */
function readFile(repo, ref, path, paths) {
  if (paths && !paths.includes(path)) return null;

  const key = join(CACHE, repo.replace('/', '_'), ref.replace(/[^\w.-]/g, '_'), path.replace(/[\\/]/g, '_'));
  if (!FRESH && existsSync(key)) return readFileSync(key, 'utf8');

  const value = execFileSync(
    'gh',
    ['api', `repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`,
      '-H', 'Accept: application/vnd.github.raw'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  mkdirSync(dirname(key), { recursive: true });
  writeFileSync(key, value, 'utf8');
  return value;
}

const slugify = (s) => s.replace(/^ScheduleOne-/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const yaml = (s) => JSON.stringify(String(s ?? '').replace(/\s+/g, ' ').trim());

// ---------------------------------------------------------------------------------------------------------------

function discover() {
  const jq = '.[] | {name, full_name, description, topics, private, archived, fork, default_branch, html_url}';
  const repos = gh(`orgs/${ORG}/repos?per_page=100`, jq)
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => !r.private && !r.archived && !r.fork)
    .filter((r) => (r.topics ?? []).includes(TOPIC))
    .filter((r) => !SKIP.has(r.name));
  // Whether a repo is an example decides whether its vendored API copy gets published as a second, wrong
  // reference. That must not hinge on someone remembering to tag it, so a mismatch stops the build.
  const untagged = repos.filter((r) => /Example$/.test(r.name) && !(r.topics ?? []).includes(EXAMPLE_TOPIC));
  if (untagged.length) {
    throw new Error(
      `these repos look like examples but do not carry the "${EXAMPLE_TOPIC}" topic:\n` +
      untagged.map((r) => `  gh repo edit ${r.full_name} --add-topic ${EXAMPLE_TOPIC}`).join('\n'));
  }

  repos.sort((a, b) => a.name.localeCompare(b.name));
  return ONLY.length ? repos.filter((r) => ONLY.includes(slugify(r.name))) : repos;
}

function latestRef(repo) {
  try {
    const tag = JSON.parse(gh(`repos/${repo.full_name}/releases/latest`)).tag_name;
    return { ref: tag, version: tag.replace(/^v/, ''), released: true };
  } catch {
    return { ref: repo.default_branch, version: null, released: false };
  }
}

function tree(repo, ref) {
  const data = JSON.parse(gh(`repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`));
  if (data.truncated) throw new Error(`${repo}@${ref}: git tree came back truncated, the API detection would be a guess`);
  return data.tree.filter((n) => n.type === 'blob').map((n) => n.path);
}

function findApiSources(repoName, paths) {
  if (API_OVERRIDES[repoName]) return API_OVERRIDES[repoName];
  const usable = paths.filter((p) => !/(^|\/)(obj|bin)\//.test(p));
  for (const pattern of API_PATTERNS) {
    const hit = usable.filter((p) => pattern.test(p));
    if (hit.length) return hit;
  }
  return [];
}

// ---------------------------------------------------------------------------------------------------------------

/** Turns a repo README into a docs page: no duplicate title, no build badges, no repo-relative links. */
function transformReadme(md, repo, ref) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let droppedTitle = false;

  for (const line of lines) {
    if (!droppedTitle && /^#\s+/.test(line)) { droppedTitle = true; continue; }
    if (/^\s*(!\[[^\]]*\]\(https:\/\/img\.shields\.io[^)]*\)\s*)+$/.test(line)) continue;  // badge row
    if (/^\*\*\[.+\]\(.+\).*·/.test(line)) continue;                                       // link row
    out.push(line);
  }

  return absolutize(out.join('\n').replace(/^\n+/, ''), repo, ref);
}

/** Links written for the repo view point at files, not at pages of this site. */
function absolutize(md, repo, ref) {
  const blob = `https://github.com/${repo}/blob/${ref}/`;
  const raw = `https://raw.githubusercontent.com/${repo}/${ref}/`;
  const local = (t) => !/^(https?:|\/\/|#|mailto:|data:)/.test(t);

  return md
    .replace(/!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (m, alt, target, rest) =>
      local(target) ? `![${alt}](${raw}${target.replace(/^\.\//, '')}${rest})` : m)
    .replace(/(?<!!)\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (m, text, target, rest) =>
      local(target) ? `[${text}](${blob}${target.replace(/^\.\//, '')}${rest})` : m);
}

function infoBlock(mod) {
  const rows = [];
  rows.push(mod.released
    ? `| Latest release | \`${mod.version}\` |`
    : `| Version | No release yet, documented from \`${mod.ref}\` |`);
  const links = [`[GitHub](${mod.html_url})`];
  if (mod.thunderstore) links.push(`[Thunderstore](${mod.thunderstore})`);
  rows.push(`| Download | ${links.join(' · ')} |`);
  if (mod.dependencies?.length) rows.push(`| Requires | ${mod.dependencies.join(', ')} |`);
  if (mod.api.length) rows.push(`| API | [Reference](/mods/${mod.slug}/api/) |`);
  return `| | |\n|---|---|\n${rows.join('\n')}\n`;
}

/** `LavaGang-MelonLoader-0.7.3` is a Thunderstore id, not something a reader should have to decode. */
function readableDependency(id) {
  const parts = id.split('-');
  if (parts.length < 3) return id;
  return `${parts.slice(1, -1).join('-').replace(/_/g, ' ')} ${parts.at(-1)}`;
}

// ---------------------------------------------------------------------------------------------------------------

function runApiDoc(sourceDir, outDir) {
  const stdout = execFileSync(
    'dotnet',
    ['run', '-c', 'Release', '--no-build', '--project', APIDOC, '--', sourceDir, outDir],
    { encoding: 'utf8' },
  );
  const m = stdout.match(/(\d+) types, (\d+) members, (\d+)\/(\d+) documented/);
  if (!m) throw new Error(`apidoc produced no summary for ${sourceDir}:\n${stdout}`);
  return { types: +m[1], members: +m[2], documented: +m[3], total: +m[4] };
}

function buildMod(repo) {
  const slug = slugify(repo.name);
  const { ref, version, released } = latestRef(repo);
  const paths = tree(repo.full_name, ref);
  const apiSources = findApiSources(repo.name, paths);

  const mod = {
    slug,
    name: repo.name.replace(/^ScheduleOne-/, ''),
    repo: repo.full_name,
    html_url: repo.html_url,
    description: repo.description ?? '',
    ref, version, released,
    isExample: (repo.topics ?? []).includes(EXAMPLE_TOPIC),
    api: apiSources,
    coverage: null,
    pages: [],
  };
  if (mod.isExample) mod.api = [];

  const manifestRaw = readFile(repo.full_name, ref, 'thunderstore/manifest.json', paths);
  if (manifestRaw) {
    const manifest = JSON.parse(manifestRaw);
    mod.dependencies = (manifest.dependencies ?? []).map(readableDependency);
    mod.thunderstore = `https://thunderstore.io/c/schedule-i/p/DooDesch/${manifest.name}/`;
    if (!mod.description) mod.description = manifest.description ?? '';
  }

  const dir = join(OUT, slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // Overview
  const readme = readFile(repo.full_name, ref, 'README.md', paths);
  if (!readme) throw new Error(`${repo.full_name} has no README.md, so there is nothing to show as an overview`);
  const front = [
    '---',
    `title: ${yaml(mod.name)}`,
    `description: ${yaml(mod.description)}`,
    'sidebar:',
    '  order: 0',
    '---',
    '',
  ].join('\n');
  writeFileSync(join(dir, 'index.md'), front + infoBlock(mod) + '\n' + transformReadme(readme, repo.full_name, ref) + '\n');
  mod.pages.push(`/mods/${slug}/`);

  // Guides, hand written and committed to this repo
  const guideDir = join(GUIDES, slug);
  const guides = existsSync(guideDir) ? readdirSync(guideDir).filter((f) => f.endsWith('.md')).sort() : [];
  if (guides.length) {
    mkdirSync(join(dir, 'guides'), { recursive: true });
    for (const g of guides) cpSync(join(guideDir, g), join(dir, 'guides', g));
  }
  mod.guides = guides.map((g) => basename(g, '.md'));

  // API reference
  if (mod.api.length) {
    const srcDir = join(CACHE, 'api', slug);
    rmSync(srcDir, { recursive: true, force: true });
    mkdirSync(srcDir, { recursive: true });
    for (const p of mod.api) {
      const text = readFile(repo.full_name, ref, p, paths);
      if (!text) throw new Error(`${repo.full_name}@${ref}: ${p} is in the tree but could not be read`);
      writeFileSync(join(srcDir, basename(p)), text);
    }
    mod.coverage = runApiDoc(srcDir, join(dir, 'api'));

    // The machine-readable surface is data, not a page. It lives outside the content collection so the site
    // build never has to decide what to do with it, and so the MCP server can read every mod from one place.
    mkdirSync(join(GENERATED, 'api'), { recursive: true });
    renameSync(join(dir, 'api', 'api.json'), join(GENERATED, 'api', `${slug}.json`));

    writeFileSync(join(dir, 'api', 'index.md'), [
      '---',
      `title: ${yaml(mod.name + ' API')}`,
      `description: ${yaml(`The public API ${mod.name} exposes to other mods, generated from its source at ${ref}.`)}`,
      'sidebar:',
      '  order: 0',
      '---',
      '',
      `Generated from [\`${mod.api.join('`, `')}\`](${mod.html_url}/blob/${ref}/${mod.api[0]}) at \`${ref}\`.`,
      '',
      `${mod.coverage.types} public types, ${mod.coverage.members} members, ` +
      `${Math.round((100 * mod.coverage.documented) / mod.coverage.total)}% carry a documentation comment.`,
      '',
    ].join('\n'));
  }

  // Changelog
  const changelog = readFile(repo.full_name, ref, 'CHANGELOG.md', paths);
  if (changelog) {
    const body = changelog.replace(/\r\n/g, '\n').replace(/^#\s+Changelog\s*\n/, '');
    writeFileSync(join(dir, 'changelog.md'), [
      '---',
      `title: ${yaml(mod.name + ' changelog')}`,
      `description: ${yaml(`Every released version of ${mod.name} and what changed in it.`)}`,
      'sidebar:',
      '  label: Changelog',
      '  order: 99',
      '---',
      '',
      absolutize(body, repo.full_name, ref),
      '',
    ].join('\n'));
    mod.changelog = true;
  }

  return mod;
}

function sidebarFor(mod) {
  const items = [{ label: 'Overview', link: `/mods/${mod.slug}/` }];
  if (mod.guides.length) {
    items.push({ label: 'Guides', items: [{ autogenerate: { directory: `mods/${mod.slug}/guides` } }] });
  }
  if (mod.coverage) {
    items.push({ label: 'API reference', items: [{ autogenerate: { directory: `mods/${mod.slug}/api` } }] });
  }
  if (mod.changelog) items.push({ label: 'Changelog', link: `/mods/${mod.slug}/changelog/` });
  return { label: mod.name, collapsed: true, items };
}

// ---------------------------------------------------------------------------------------------------------------

const started = Date.now();
mkdirSync(OUT, { recursive: true });
mkdirSync(GENERATED, { recursive: true });

// One build up front so every per-mod run is a plain invocation instead of a rebuild.
execFileSync('dotnet', ['build', '-c', 'Release', '--nologo', '-v', 'q', APIDOC], { stdio: 'inherit' });

const repos = discover();
if (!repos.length) throw new Error(`no public repo in ${ORG} carries the ${TOPIC} topic`);
console.log(`ingest: ${repos.length} repos with topic ${TOPIC}`);

const mods = [];
for (const repo of repos) {
  const mod = buildMod(repo);
  mods.push(mod);
  const api = mod.coverage
    ? `api ${mod.coverage.types}t/${mod.coverage.members}m ${Math.round((100 * mod.coverage.documented) / mod.coverage.total)}%`
    : 'no api';
  console.log(`  ${mod.name.padEnd(16)} ${String(mod.ref).padEnd(10)} ${api}`);
}

// Mods that expose an API come first: this site exists for them.
const withApi = mods.filter((m) => m.coverage);
const withoutApi = mods.filter((m) => !m.coverage);
writeFileSync(join(GENERATED, 'sidebar.json'),
  JSON.stringify([...withApi, ...withoutApi].map(sidebarFor), null, 2));
writeFileSync(join(GENERATED, 'ingest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), org: ORG, topic: TOPIC, mods }, null, 2));

console.log(`ingest: ${mods.length} mods, ${withApi.length} with an API reference, ${((Date.now() - started) / 1000).toFixed(1)}s`);
