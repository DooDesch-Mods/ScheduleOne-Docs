// Refuses to publish a build that quietly documents less than the one before it.
//
//   node scripts/check-shrinkage.mjs            compares dist/health.json against the live site
//   ALLOW_SHRINK=1 node scripts/check-shrinkage.mjs   accept the loss on purpose
//
// Discovery by topic is what makes this site automatic, and it is also how the site could silently empty
// itself: a repo that loses the topic, is archived, is renamed, or whose API file moves simply stops being
// documented. Nothing errors, the build is green, and the mod is gone. Additions stay automatic; losses
// have to be acknowledged.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRESH = join(ROOT, 'dist/health.json');
const LIVE = (process.env.DOCS_SITE ?? 'https://docs.doodesch.de').replace(/\/$/, '') + '/health.json';

if (!existsSync(FRESH)) {
  console.error('check-shrinkage: no dist/health.json, run the build first');
  process.exit(2);
}
const fresh = JSON.parse(readFileSync(FRESH, 'utf8'));

let live;
try {
  const response = await fetch(LIVE);
  if (!response.ok) throw new Error(`answered ${response.status}`);
  live = await response.json();
} catch (err) {
  // The first build has nothing to compare against, and a site that is down is not evidence of shrinkage.
  console.log(`check-shrinkage: no published baseline (${err.message}), nothing to compare`);
  process.exit(0);
}

const problems = [];

const goneMods = Object.keys(live.versions ?? {}).filter((slug) => !(slug in (fresh.versions ?? {})));
if (goneMods.length) problems.push(`mods no longer documented: ${goneMods.join(', ')}`);

const goneApis = (live.apiMods ?? []).filter((slug) => !(fresh.apiMods ?? []).includes(slug));
if (goneApis.length) problems.push(`API references no longer generated: ${goneApis.join(', ')}`);

// A version going backwards means the release the site reads is older than the one it read yesterday -
// a deleted release, a moved tag, or a rate limit answered as "no release yet".
const rank = (v) => String(v ?? '').split('.').map((n) => Number.parseInt(n, 10) || 0);
for (const [slug, before] of Object.entries(live.versions ?? {})) {
  const now = fresh.versions?.[slug];
  if (!before || now === undefined) continue;
  if (now === null) { problems.push(`${slug}: was ${before}, now reads as unreleased`); continue; }
  const [a, b] = [rank(now), rank(before)];
  const older = a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  if (older) problems.push(`${slug}: version went backwards, ${before} -> ${now}`);
}

console.log(`check-shrinkage: live ${live.mods} mods / ${live.apis} APIs, fresh ${fresh.mods} / ${fresh.apis}`);

if (!problems.length) {
  console.log('check-shrinkage: nothing lost');
  process.exit(0);
}

console.error('\ncheck-shrinkage: this build documents less than the published one:\n');
for (const p of problems) console.error(`  ${p}`);
console.error('\nIf that is intended - a mod was retired, a repo renamed - re-run with ALLOW_SHRINK=1.');
process.exit(process.env.ALLOW_SHRINK === '1' ? 0 : 1);
