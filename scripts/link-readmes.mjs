// Points every mod README at its page on the docs site, as a pull request per repo.
//
//   node scripts/link-readmes.mjs            show what would change
//   node scripts/link-readmes.mjs --open     create the branches and pull requests
//
// A reader's journey starts on GitHub, Thunderstore or a search result - almost never on the docs homepage.
// Thirteen READMEs already link to their wiki, which is now a page of pointers; those links are rewritten
// rather than duplicated. The rest get one line under the support line.
//
// Nothing is committed to a default branch: mod repos take changes by pull request, because their release
// notes are generated from merged pull requests.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://docs.doodesch.de';
const BRANCH = 'docs/link-to-docs-site';
const OPEN = process.argv.includes('--open');

const gh = (args, input) => execFileSync('gh', args, {
  encoding: 'utf8', input, maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
});

const mods = JSON.parse(readFileSync(join(ROOT, 'src/generated/ingest.json'), 'utf8')).mods;

// A README often links a wiki that is not its own: the example repos link the mod they demonstrate, and
// WhatsDab links Sideload. Rewriting every wiki URL to the current mod's page would send those readers to
// the wrong mod entirely, so the target is resolved from the URL, not from whose README it sits in.
const slugByRepo = new Map(mods.map((m) => [m.repo.split('/')[1], m.slug]));

/** The docs link for this mod, and the line to insert when the README has nowhere to rewrite. */
function rewrite(readme, mod) {
  const page = `${SITE}/mods/${mod.slug}/`;
  const wiki = /https:\/\/github\.com\/DooDesch-Mods\/([^/)\s]+)\/wiki[^)\s]*/g;

  if (wiki.test(readme)) {
    // Labels that name the wiki stop being true the moment the target changes.
    return readme
      .replace(wiki, (whole, repo) => {
        const slug = slugByRepo.get(repo);
        if (!slug) return whole;                         // a repo the site does not document keeps its link
        // A link to a specific wiki page has a specific replacement; flattening it to the mod's front page
        // would answer a precise question with a general one.
        const page = whole.match(/\/wiki\/([^/)\s#]+)/)?.[1];
        if (!page || page === 'Home') return `${SITE}/mods/${slug}/`;
        if (page === 'API-Reference') return `${SITE}/mods/${slug}/api/`;
        return `${SITE}/mods/${slug}/guides/${page.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}/`;
      })
      .replace(/\[Wiki \/ docs\]/g, '[Documentation]')
      .replace(/\[Wiki\]/g, '[Documentation]')
      .replace(/ wiki page\]/g, ' documentation page]');
  }

  const line = `📖 **Documentation:** [${page.replace(/^https:\/\//, '')}](${page})`;
  const lines = readme.replace(/\r\n/g, '\n').split('\n');

  // Under the support line if there is one, otherwise under the title, so it lands above the fold either way.
  const support = lines.findIndex((l) => /^>\s*🛟/.test(l));
  const at = support !== -1 ? support + 1 : lines.findIndex((l) => /^#\s+/.test(l)) + 1;
  if (at <= 0) return `${line}\n\n${readme}`;

  lines.splice(at, 0, '', line);
  return lines.join('\n');
}

let changed = 0;
let opened = 0;

for (const mod of mods) {
  let readme;
  try {
    readme = gh(['api', `repos/${mod.repo}/contents/README.md`, '-H', 'Accept: application/vnd.github.raw']);
  } catch {
    console.log(`  ${mod.name.padEnd(20)} no README`);
    continue;
  }

  if (readme.includes('docs.doodesch.de')) {
    console.log(`  ${mod.name.padEnd(20)} already linked`);
    continue;
  }

  const updated = rewrite(readme, mod);
  if (updated === readme) {
    console.log(`  ${mod.name.padEnd(20)} nothing to change`);
    continue;
  }
  changed++;

  if (!OPEN) {
    const kind = readme.includes('/wiki') ? 'rewrites its wiki link' : 'adds a docs line';
    console.log(`  ${mod.name.padEnd(20)} ${kind}`);
    continue;
  }

  const head = JSON.parse(gh(['api', `repos/${mod.repo}/git/ref/heads/${mod.default_branch ?? 'main'}`]));
  try {
    gh(['api', `repos/${mod.repo}/git/refs`, '-f', `ref=refs/heads/${BRANCH}`, '-f', `sha=${head.object.sha}`]);
  } catch {
    // The branch already exists from a previous run; updating the file below moves it forward.
  }

  const current = JSON.parse(gh(['api', `repos/${mod.repo}/contents/README.md?ref=${BRANCH}`]));
  gh([
    'api', `repos/${mod.repo}/contents/README.md`, '-X', 'PUT',
    '-f', 'message=docs: link the README at docs.doodesch.de',
    '-f', `content=${Buffer.from(updated, 'utf8').toString('base64')}`,
    '-f', `sha=${current.sha}`,
    '-f', `branch=${BRANCH}`,
  ]);

  try {
    const pr = gh([
      'pr', 'create', '--repo', mod.repo, '--head', BRANCH, '--base', mod.default_branch ?? 'main',
      '--title', 'docs: link the README at docs.doodesch.de',
      '--body', [
        `The mod documentation now lives at ${SITE}/mods/${mod.slug}/ - overview, guides, changelog and,`,
        'where the mod has one, a generated API reference.',
        '',
        'The wiki pages were migrated there and the wiki now holds pointers, so a README that still sends',
        'readers to the wiki sends them one hop too far.',
      ].join('\n'),
    ]);
    opened++;
    console.log(`  ${mod.name.padEnd(20)} ${pr.trim().split('\n').pop()}`);
  } catch (err) {
    console.log(`  ${mod.name.padEnd(20)} PR not created: ${String(err.stderr ?? err.message).trim().split('\n')[0]}`);
  }
}

console.log(`\n${changed} README${changed === 1 ? '' : 's'} to change${OPEN ? `, ${opened} pull request(s) opened` : ' (dry run, pass --open)'}`);
