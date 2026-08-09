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
const GUIDE_EDIT_BASE = 'https://github.com/DooDesch-Mods/ScheduleOne-Docs/edit/main/content/guides';
const DISCORD = 'https://discord.gg/aN3u7BTa3h';

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
  // Only a tag is safe to keep. A mod with no release yet is read from a branch, and caching that would
  // freeze its docs at whatever the branch said the first time anyone built the site.
  if (isTag(ref) && !FRESH && existsSync(key)) return readFileSync(key, 'utf8');

  const value = execFileSync(
    'gh',
    ['api', `repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`,
      '-H', 'Accept: application/vnd.github.raw'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (isTag(ref)) {
    mkdirSync(dirname(key), { recursive: true });
    writeFileSync(key, value, 'utf8');
  }
  return value;
}

/** A release tag is immutable and worth caching; a branch name is not. */
const isTag = (ref) => /^v?\d+\.\d+/.test(ref);

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
  } catch (err) {
    // "This mod has no release" is a 404 and a legitimate answer. Anything else - a rate limit, a network
    // failure - would otherwise be answered by quietly documenting unreleased code and labelling a shipped
    // mod as unreleased.
    const message = String(err.stderr ?? err.message ?? '');
    if (!/Not Found|HTTP 404/.test(message)) {
      throw new Error(`${repo.full_name}: could not resolve the latest release - ${message.trim()}`);
    }
    return { ref: repo.default_branch, version: null, released: false };
  }
}

function tree(repo, ref, cacheable = false) {
  const key = join(CACHE, 'trees', repo.replace('/', '_'), `${ref.replace(/[^\w.-]/g, '_')}.json`);
  // A tag's tree is immutable, so it is worth keeping; a branch's is not.
  if (cacheable && !FRESH && existsSync(key)) return JSON.parse(readFileSync(key, 'utf8'));

  const data = JSON.parse(gh(`repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`));
  if (data.truncated) throw new Error(`${repo}@${ref}: git tree came back truncated, the API detection would be a guess`);
  const paths = data.tree.filter((n) => n.type === 'blob').map((n) => n.path);

  if (cacheable) {
    mkdirSync(dirname(key), { recursive: true });
    writeFileSync(key, JSON.stringify(paths), 'utf8');
  }
  return paths;
}

/**
 * 1.10.0 comes after 1.9.0, which a string sort gets wrong. A component that is missing or not a number
 * counts as 0 rather than NaN: NaN makes every comparison false, which silently degrades the whole sort to
 * input order and would reverse a version history without saying so.
 */
const rank = (v) => {
  const parts = String(v).replace(/^v/i, '').split('-')[0].split('.');
  return [0, 1, 2].map((i) => {
    const n = Number.parseInt(parts[i] ?? '', 10);
    return Number.isFinite(n) ? n : 0;
  });
};
const bySemver = (a, b) => {
  const [x, y] = [rank(a), rank(b)];
  return (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]) || a.localeCompare(b);
};

/**
 * Walks every published release of a mod and diffs its API surface between them, which answers the one
 * question a reference page otherwise leaves open: can I call this if I require version X?
 *
 * Drafts and prereleases are left out - "Added in 2.0.0-beta3" names a version nobody can install. A tag
 * whose API file cannot be read is skipped rather than fatal: an old release predating the API is normal.
 */
function apiHistory(repo, slug) {
  const tags = gh(`repos/${repo.full_name}/releases?per_page=100`,
    '.[] | select(.draft == false and .prerelease == false) | .tag_name')
    .split('\n').filter(Boolean).sort(bySemver);
  if (tags.length < 2) return null;   // one release is not a history

  const manifest = [];
  for (const tag of tags) {
    let paths;
    try {
      paths = tree(repo.full_name, tag, true);
    } catch (err) {
      // A tag that cannot be read is not the same as a tag with no API. Bridging over it silently would
      // date a member to the next readable release, which is the one claim this page must not get wrong.
      const message = String(err.stderr ?? err.message ?? '');
      if (!/Not Found|HTTP 404/.test(message)) {
        throw new Error(`${repo.full_name}@${tag}: could not read the tree for the API history - ${message.trim()}`);
      }
      continue;
    }
    const sources = findApiSources(repo.name, paths);
    if (!sources.length) continue;

    const dir = join(CACHE, 'history', slug, tag.replace(/[^\w.-]/g, '_'));
    mkdirSync(dir, { recursive: true });
    const files = [];
    for (const p of sources) {
      const target = join(dir, basename(p));
      if (FRESH || !existsSync(target)) writeFileSync(target, readFile(repo.full_name, tag, p, paths));
      files.push(target);
    }
    manifest.push({ version: tag.replace(/^v/, ''), files });
  }
  if (manifest.length < 2) return null;

  const manifestPath = join(CACHE, 'history', slug, 'manifest.json');
  const scanPath = join(CACHE, 'history', slug, 'scan.json');
  writeFileSync(manifestPath, JSON.stringify(manifest));
  execFileSync('dotnet', ['run', '-c', 'Release', '--no-build', '--project', APIDOC, '--',
    'scan', manifestPath, scanPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  const scan = JSON.parse(readFileSync(scanPath, 'utf8'));
  const versions = Object.keys(scan).sort(bySemver);

  const firstSeen = {};
  const changes = [];
  let previous = null;
  for (const version of versions) {
    const current = new Set(scan[version]);
    for (const key of current) if (!(key in firstSeen)) firstSeen[key] = version;

    if (previous === null) {
      changes.push({ version, initial: current.size });
    } else {
      const added = [...current].filter((k) => !previous.has(k));
      const removed = [...previous].filter((k) => !current.has(k));

      // A member that gained or lost a parameter is one removal plus one addition. Reported that way it
      // reads as "gone", when what actually happened is that its signature moved - which still recompiles
      // for a caller that rebuilds and still breaks one that does not.
      const nameOf = (k) => k.split('(')[0];
      const changed = [];
      for (const gone of [...removed]) {
        const replacement = added.find((a) => nameOf(a) === nameOf(gone));
        if (!replacement) continue;
        changed.push({ from: gone, to: replacement });
        added.splice(added.indexOf(replacement), 1);
        removed.splice(removed.indexOf(gone), 1);
      }

      if (added.length || removed.length || changed.length) {
        changes.push({ version, added, removed, changed });
      }
    }
    previous = current;
  }

  return { firstSeen, changes, versions };
}

/**
 * The first thing a developer needs and the one thing a signature cannot tell them: which artifact to take,
 * what to put in the csproj, and what happens when the host mod is not installed. Written per API because
 * the answer differs - three of the nine have no separate assembly at all.
 */
function consumeBlock(mod, ref) {
  const file = mod.api[0];
  const link = `${mod.html_url}/blob/${ref}/${file}`;
  const name = basename(file);
  const lines = ['## Consume this API', ''];

  if (mod.consumption === 'host-dll') {
    lines.push(
      `${mod.name} exposes its API from its own assembly - there is no separate API package and nothing to`,
      `copy. Reference \`${mod.name}.dll\` from your installed copy of the mod and mark it optional, or your`,
      'mod will fail to load for anyone who does not have it.',
      '',
      '```xml',
      `<Reference Include="${mod.name}">`,
      `  <HintPath>$(ModsDirectory)\\${mod.name}.dll</HintPath>`,
      '  <Private>false</Private>',
      '</Reference>',
      '```',
      '',
      '```csharp',
      `[assembly: MelonOptionalDependencies("${mod.name}")]`,
      '```',
      '',
      `Because you are calling the mod directly, guard your calls: when ${mod.name} is absent the type is not`,
      'there either. Keep the calls behind a check that runs only once you know it loaded.',
      '',
    );
  } else {
    lines.push(
      `The whole API is one file. Copy [\`${name}\`](${link}) into your project - that is the supported way,`,
      'and it means there is no extra assembly to ship and no version to keep in step.',
      '',
      '```xml',
      `<Compile Include="path\\to\\${name}" />`,
      '```',
      '',
      '```csharp',
      `[assembly: MelonOptionalDependencies("${mod.name}")]`,
      '```',
      '',
      `Every call is a no-op that returns a default when ${mod.name} is not installed, and binds by itself when`,
      'it is, so you can ship this unconditionally. Registrations made before the host loads are replayed once',
      'it does.',
      '',
    );
    if (mod.consumption === 'standalone-source') {
      lines.push(
        `There is also a \`${mod.name}.Api\` project in the repository if you would rather reference an assembly`,
        'than compile the file. No release publishes that DLL, so you would be building it yourself.',
        '',
      );
    }
  }

  if (mod.example) {
    lines.push(`A worked example lives in [${basename(mod.example)}](${mod.example}).`, '');
  }
  return lines.join('\n');
}

function changesPage(mod, history) {
  const lines = [
    '---',
    `title: ${yaml(mod.name + ' API changes')}`,
    'editUrl: false',
    `description: ${yaml(`What ${mod.name} added to and removed from its public API in each release.`)}`,
    'sidebar:',
    '  label: Changes by version',
    '  order: 90',
    '---',
    '',
    `Derived by comparing the public API surface across all ${history.versions.length} releases that carry ` +
    'one. A member listed under a version is callable from that version on.',
    '',
    'A signature change still compiles for a caller that rebuilds against the new version, and still breaks ' +
    'one that ships against the old one.',
    '',
  ];

  for (const entry of [...history.changes].reverse()) {
    lines.push(`## ${entry.version}`, '');
    if (entry.initial !== undefined) {
      lines.push(`First release covered here. ${entry.initial} public types and members.`, '');
      continue;
    }
    if (entry.added?.length) {
      lines.push('### Added', '');
      for (const k of entry.added) lines.push(`- \`${k}\``);
      lines.push('');
    }
    if (entry.changed?.length) {
      lines.push('### Signature changed', '');
      for (const c of entry.changed) lines.push(`- \`${c.from}\` is now \`${c.to}\``);
      lines.push('');
    }
    if (entry.removed?.length) {
      lines.push('### Removed', '');
      for (const k of entry.removed) lines.push(`- \`${k}\``);
      lines.push('');
    }
  }
  return lines.join('\n');
}

/**
 * How another mod actually gets at this API. The three shapes are told apart by where the API source sits
 * and whether it has a project of its own - which matters, because they are not interchangeable and the
 * generic advice ("reference the DLL or drop in the file") is only true for one of them.
 *
 * No release publishes an `.Api.dll`, so "reference the API DLL" is never a download; it is something the
 * consumer builds from the tiny project themselves, and most of them just copy the file instead.
 */
function consumption(mod, paths) {
  const inOwnProject = /\.Api\//.test(mod.api[0] ?? '');
  const hasProject = paths.some((p) => /\.Api\/[^/]+\.csproj$/.test(p));

  if (inOwnProject && hasProject) return 'standalone-source';
  if (inOwnProject) return 'linked-source';
  return 'host-dll';
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
      local(target) ? `[${text}](${blob}${target.replace(/^\.\//, '')}${rest})` : m)
    // READMEs mix raw HTML in with the markdown - an <img> banner, an <a> around it. Those carry
    // repo-relative paths too, and left alone they resolve against this site, where they do not exist.
    .replace(/(<[a-zA-Z][^>]*?\s)(src|href)(\s*=\s*)(["'])([^"']+)\4/gi, (m, head, attr, eq, quote, target) =>
      local(target)
        ? head + attr + eq + quote +
          (attr.toLowerCase() === 'src' ? raw : blob) + target.replace(/^\.\//, '') + quote
        : m);
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
  // The box is where a reader looks for somewhere to go. A header icon is easy to miss when you are
  // already stuck on this page.
  rows.push(`| Help | [Discord](${DISCORD}) · [Report a bug](https://support.doodesch.de/${mod.slug}) |`);
  return `| | |\n|---|---|\n${rows.join('\n')}\n`;
}

/** `LavaGang-MelonLoader-0.7.3` is a Thunderstore id, not something a reader should have to decode. */
function readableDependency(id) {
  const parts = id.split('-');
  if (parts.length < 3) return id;
  return `${parts.slice(1, -1).join('-').replace(/_/g, ' ')} ${parts.at(-1)}`;
}

// ---------------------------------------------------------------------------------------------------------------

function runApiDoc(sourceDir, outDir, historyPath) {
  const stdout = execFileSync(
    'dotnet',
    ['run', '-c', 'Release', '--no-build', '--project', APIDOC, '--', sourceDir, outDir,
      ...(historyPath ? ['--history', historyPath] : [])],
    { encoding: 'utf8' },
  );
  const m = stdout.match(/(\d+) types, (\d+) members, (\d+)\/(\d+) documented/);
  if (!m) throw new Error(`apidoc produced no summary for ${sourceDir}:\n${stdout}`);
  return { types: +m[1], members: +m[2], documented: +m[3], total: +m[4] };
}

function buildMod(repo, examples) {
  const slug = slugify(repo.name);
  const { ref, version, released } = latestRef(repo);
  const paths = tree(repo.full_name, ref);
  const apiSources = findApiSources(repo.name, paths);

  const mod = {
    slug,
    // The example repo that demonstrates this API, when the org has one. Derived, not listed.
    example: examples.get(repo.name) ?? null,
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
  if (mod.api.length) mod.consumption = consumption(mod, paths);

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
    // Nothing on this page exists in this repository - "Edit page" would open GitHub's create-a-file
    // screen for a path that is rewritten on every build.
    'editUrl: false',
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
    for (const g of guides) {
      // The copy under src/ is generated. A contributor clicking "Edit page" has to land on the real file
      // in content/guides, or their change is overwritten by the next build.
      const text = readFileSync(join(guideDir, g), 'utf8')
        .replace(/^---\r?\n/, `---\neditUrl: ${JSON.stringify(`${GUIDE_EDIT_BASE}/${slug}/${g}`)}\n`);
      writeFileSync(join(dir, 'guides', g), text);
    }
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
    // Every release of this mod, diffed, so each member can say which version it arrived in.
    const history = apiHistory(repo, slug);
    let historyPath = null;
    if (history) {
      historyPath = join(CACHE, 'history', slug, 'first-seen.json');
      writeFileSync(historyPath, JSON.stringify(history.firstSeen));
      mod.versions = history.versions.length;
    }

    mod.coverage = runApiDoc(srcDir, join(dir, 'api'), historyPath);

    // A page whose only entry is "this is where we started" costs a sidebar slot and answers nothing.
    if (history?.changes.some((c) => c.initial === undefined)) {
      writeFileSync(join(dir, 'api', 'changes.md'), changesPage(mod, history));
      mod.apiChanges = history.changes.length - 1;
    }

    // The machine-readable surface is data, not a page. It lives outside the content collection so the site
    // build never has to decide what to do with it, and so the MCP server can read every mod from one place.
    mkdirSync(join(GENERATED, 'api'), { recursive: true });
    renameSync(join(dir, 'api', 'api.json'), join(GENERATED, 'api', `${slug}.json`));

    writeFileSync(join(dir, 'api', 'index.md'), [
      '---',
      `title: ${yaml(mod.name + ' API')}`,
      'editUrl: false',
      `description: ${yaml(`The public API ${mod.name} exposes to other mods, generated from its source at ${ref}.`)}`,
      'sidebar:',
      '  order: 0',
      '---',
      '',
      consumeBlock(mod, ref),
      '## About this reference',
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
      'editUrl: false',
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

// `ScheduleOne-SnitchExample` demonstrates `ScheduleOne-Snitch`. The link between them is the name, and
// deriving it here means an example repo appears on its API page by existing, not by being listed.
const examples = new Map(
  repos.filter((r) => r.isExample ?? (r.topics ?? []).includes(EXAMPLE_TOPIC))
    .map((r) => [r.name.replace(/Example$/, ''), r.html_url]));

const mods = [];
for (const repo of repos) {
  const mod = buildMod(repo, examples);
  mods.push(mod);
  const api = mod.coverage
    ? `api ${mod.coverage.types}t/${mod.coverage.members}m ${Math.round((100 * mod.coverage.documented) / mod.coverage.total)}%`
    : 'no api';
  console.log(`  ${mod.name.padEnd(16)} ${String(mod.ref).padEnd(10)} ${api}`);
}

// One page listing everything, generated. The landing page used to carry a hand-kept card grid, which is
// the one thing this site promises not to have: a list of mods somebody has to remember to update.
const catalogue = (list, empty) => (list.length
  ? ['| Mod | What it does | Version |', '|---|---|---|',
    ...list.map((m) => `| [${m.name}](/mods/${m.slug}/) | ${(m.description || '').replace(/\|/g, '\\|')} | ` +
      `${m.released ? `\`${m.version}\`` : 'unreleased'} |`), ''].join('\n')
  : `${empty}\n`);

const players = mods.filter((m) => !m.isExample && !m.coverage);
const apis = mods.filter((m) => m.coverage);
const samples = mods.filter((m) => m.isExample);

writeFileSync(join(OUT, '..', 'mods.md'), [
  '---',
  'title: All mods',
  'description: Every DooDesch Schedule I mod, what it does and which version is current, generated from the mod repositories themselves.',
  'editUrl: false',
  'sidebar:',
  '  order: 2',
  '---',
  '',
  `${mods.length} mods, read from the GitHub org at their latest release. Nothing on this page is typed by hand.`,
  '',
  '## Mods you install to play',
  '',
  catalogue(players, 'None.'),
  '## Mods other mods build on',
  '',
  'These expose an API. Their reference is generated from their own source.',
  '',
  catalogue(apis, 'None.'),
  '## Worked examples',
  '',
  'Source to read rather than mods to install.',
  '',
  catalogue(samples, 'None.'),
].join('\n'));

// Mods that expose an API come first: this site exists for them.
const withApi = mods.filter((m) => m.coverage);
const withoutApi = mods.filter((m) => !m.coverage);
writeFileSync(join(GENERATED, 'sidebar.json'),
  JSON.stringify([...withApi, ...withoutApi].map(sidebarFor), null, 2));
writeFileSync(join(GENERATED, 'ingest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), org: ORG, topic: TOPIC, mods }, null, 2));

console.log(`ingest: ${mods.length} mods, ${withApi.length} with an API reference, ${((Date.now() - started) / 1000).toFixed(1)}s`);
