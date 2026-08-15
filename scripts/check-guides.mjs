/**
 * Fails the build when a hand-written guide contradicts the code it describes.
 *
 * The overview, the changelog and the API reference regenerate from the mod repositories, so they cannot go
 * stale. The guides under content/guides/ are the deliberate exception - and the exception is where the rot
 * collected: at Sideload 1.31.0 the CSS guide still listed Grid, calc(), z-index and outline under "not
 * supported", still said "units are px and % only" fifteen units later, and still carried measured percentages
 * from an engine six releases back. Nothing said a word for nineteen releases.
 *
 * The lesson is the one this repository has already learnt twice - Workspace/tools/sideload-css-lint/lint.py is
 * retired for exactly this, and gen-globals.mjs carries "It drifted SILENTLY, which is the whole problem" in its
 * header. So this does NOT try to generate the guides. It only asks whether specific, checkable claims still
 * hold, because the expensive failure is not a guide that lacks a feature, it is a guide that DENIES one: an
 * author reads "not supported", writes around it, and never learns otherwise.
 *
 *     node scripts/check-guides.mjs            check
 *     node scripts/check-guides.mjs --offline  skip everything that needs the network
 *
 * Exit 0 clean, 2 drift, 1 the check itself could not run - which must not read as clean.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES = join(ROOT, 'content/guides');
const CACHE = join(ROOT, '.cache/check');
const OFFLINE = process.argv.includes('--offline');

const SIDELOAD = 'DooDesch-Mods/ScheduleOne-Sideload';
const WORKSPACE = 'DooDesch-Mods/ScheduleOne-Workspace';

const problems = [];
const notes = [];
const fail = (where, what) => problems.push({ where, what });

// ---------------------------------------------------------------------------------------------------------------

function gh(args, cacheKey) {
  const key = cacheKey && join(CACHE, cacheKey.replace(/[^\w.-]/g, '_'));
  if (key && existsSync(key)) return readFileSync(key, 'utf8');

  const out = execFileSync('gh', args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (key) { mkdirSync(dirname(key), { recursive: true }); writeFileSync(key, out, 'utf8'); }
  return out;
}

/** The tag the docs describe: the same ref the ingest reads, so the two cannot disagree about which version. */
function latestTag(repo) {
  return JSON.parse(gh(['api', `repos/${repo}/releases/latest`], `${repo}-latest`)).tag_name;
}

function source(repo, ref, path) {
  return gh(
    ['api', `repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`,
      '-H', 'Accept: application/vnd.github.raw'],
    `${repo}-${ref}-${path}`,
  );
}

/**
 * Line endings are normalised because the paragraph splits below are structural, not cosmetic. A Windows
 * checkout hands these files back as CRLF, `\n\n` then matches nothing, the whole section reads as one
 * paragraph - and the check quietly starts judging prose it was told to leave alone. It disagreed with the
 * Linux runner before this line existed, which is the worst way for a gate to be wrong.
 */
const guide = (rel) => readFileSync(join(GUIDES, rel), 'utf8').replace(/\r\n/g, '\n');

/**
 * Every `foo` in a stretch of markdown, which is how every list in these guides names a property.
 *
 * Fenced blocks come out FIRST. Without that the closing ``` pairs with the next lone backtick and one "inline
 * code span" swallows three paragraphs - which is not a theory, it is what this returned on the first run.
 */
const ticked = (text) => [...text.replace(/```[\s\S]*?```/g, '').matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------------------------------------------

/**
 * The one that matters: a property the guide calls unsupported, which the engine implements.
 *
 * "Has a case" is NOT the test. A dozen properties are accepted and deliberately do nothing - `cursor`,
 * `resize`, `box-sizing` - and their case bodies only report a diagnostic. The test is whether the body
 * ASSIGNS to the computed style, because that is what having an effect looks like here.
 */
function checkUnsupportedList(applier) {
  const bodies = new Map();
  const re = /case\s+"([a-z-]+)"\s*:/g;
  const starts = [...applier.matchAll(re)];

  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index + starts[i][0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : applier.length;
    const body = applier.slice(from, to);
    // Fallthrough labels share the next body; keep the longest one seen for a name.
    const prev = bodies.get(starts[i][1]);
    if (!prev || body.length > prev.length) bodies.set(starts[i][1], body);
  }

  // Touching the computed style at all is the test, not assigning to it: half the switch delegates
  // (`case "transform": ApplyTransform(s, value);`) and an assignment-only rule reads those as unimplemented.
  // The accepted-and-no-effect cases mention neither - their bodies only report - so they stay unflagged.
  const implemented = (name) => {
    const body = bodies.get(name);
    return body != null && (/\bs\.\w/.test(body) || /\(\s*s\s*,/.test(body));
  };

  const css = guide('sideload/css-and-layout.md');
  const section = css.split('## Not supported')[1]?.split('\n## ')[0];
  if (!section) return fail('css-and-layout.md', 'the "Not supported" section is gone - this check is blind');

  // Only the enumeration itself - the first paragraph under the heading. The prose below it discusses
  // properties that ARE implemented (`inset` box-shadow layers, the accepted-and-no-effect set), and reading
  // those as denials is how a checker starts crying wolf.
  const list = section.replace(/^[^\n]*\n\n/, '').split('\n\n')[0];

  for (const entry of ticked(list)) {
    // `align-content: stretch` and `background-image: url()` name a value, not a property. The property is
    // implemented in both cases and only that value is not, so a name-level check cannot judge them.
    if (entry.includes(':') || entry.includes('(') || /\s/.test(entry)) continue;
    if (implemented(entry)) {
      fail('css-and-layout.md', `lists \`${entry}\` as not supported, but StyleApplier.cs implements it`);
    }
  }

  notes.push(`css: ${bodies.size} properties in the engine switch, "Not supported" list checked against it`);
}

/** Console commands are dev tooling, so an undocumented one is a tool nobody can find. */
function checkConsoleCommands(devtools) {
  const real = new Set();
  for (const file of Object.values(devtools))
    for (const m of file.matchAll(/"(sideload[a-z]+)"/g)) real.add(m[1]);

  const documented = new Set(
    ticked(guide('sideload/dev-loop-and-testing.md'))
      .map((t) => t.match(/^(sideload[a-z]+)\b/)?.[1])
      .filter(Boolean),
  );

  for (const cmd of real) if (!documented.has(cmd)) fail('dev-loop-and-testing.md', `\`${cmd}\` exists and is undocumented`);
  for (const cmd of documented) if (!real.has(cmd)) fail('dev-loop-and-testing.md', `documents \`${cmd}\`, which no longer exists`);

  notes.push(`console: ${real.size} commands in the engine, ${documented.size} documented`);
}

/** The globals list drifted once already, in the preview shell, and cost a React page its first render. */
function checkGlobals(scriptHost) {
  const real = new Set([...scriptHost.matchAll(/Engine\.SetValue\("(\w+)"/g)].map((m) => m[1]));
  real.delete('sourceURL');

  const js = guide('sideload/javascript-dom-and-events.md');
  const section = js.split('## Globals')[1]?.split('\n## ')[0];
  if (!section) return fail('javascript-dom-and-events.md', 'the "Globals" section is gone - this check is blind');
  const documented = new Set(ticked(section));

  for (const name of real)
    if (!documented.has(name)) fail('javascript-dom-and-events.md', `the engine installs \`${name}\` and the guide does not list it`);

  // The other direction needs care: the guide legitimately names things bound elsewhere (Promise is Jint's own,
  // the DOM constructors come from DomTypes), so only a name that looks like a binding is worth reporting.
  notes.push(`globals: ${real.size} installed by ScriptHost, ${documented.size} named in the guide`);
}

/** Percentages the guide quotes, against the reports the corpus runner writes. */
function checkMeasured(reports) {
  const css = guide('sideload/css-and-layout.md');

  const quoted = [...css.matchAll(/^\|\s*(?!Stylesheet)([^|]+?)\s*\|\s*([\d.]+)\s*percent\s*\|/gm)]
    .map((m) => ({ label: m[1], value: Number(m[2]) }));

  if (!quoted.length) return fail('css-and-layout.md', 'the measured table is gone or no longer says "percent"');

  const measured = Object.entries(reports).map(([name, text]) => {
    const m = text.match(/\*\*\d+ declarations never take effect\*\*\s*-\s*([\d,]+)\s*%/);
    return { name, value: m ? Number(m[1].replace(',', '.')) : null };
  });

  for (const { name, value } of measured) {
    if (value == null) { fail('gaps/measured', `${name} has no percentage line - the report format changed`); continue; }
    if (!quoted.some((q) => Math.abs(q.value - value) < 0.05)) {
      fail('css-and-layout.md',
        `${name} measures ${value} percent and no row in the table says so (table has ${quoted.map((q) => q.value).join(', ')})`);
    }
  }

  notes.push(`measured: ${measured.length} reports, ${quoted.length} rows in the guide`);
}

/**
 * A member the guides name as MISSING, which the wrapper has.
 *
 * This is the check written from being caught by it. Both guides used `el.closest('.card')` as the example of
 * something a browser has and this engine does not - for long enough that the preview tool's own header comment
 * still says it too. `closest` has since been implemented, so the one sentence teaching authors what the fence
 * is for was itself the stale claim.
 *
 * The exact member COUNT is deliberately not checked. It moves with every helper added, it tells a reader
 * almost nothing, and a number under a gate is a gate that fails for no reader benefit - so the guides say
 * "under seventy" and this checks the part an author acts on.
 */
function checkMissingMembers(domApi) {
  const js = guide('sideload/javascript-dom-and-events.md');
  const claimed = js.match(/are among the ones missing/)
    ? ticked(js.split('under seventy members')[1]?.split('are among the ones missing')[0] ?? '')
    : [];

  if (!claimed.length) return fail('javascript-dom-and-events.md', 'the missing-member list is gone - this check is blind');

  for (const name of claimed) {
    // A member of the wrapper appears as a binding in DomApi.cs under its own name.
    if (new RegExp(`"${name}"`).test(domApi)) {
      fail('javascript-dom-and-events.md', `names \`${name}\` as missing, but DomApi.cs binds it`);
    }
  }

  notes.push(`dom: ${claimed.length} members named as missing, checked against DomApi.cs`);
}

/** Every guide that offers support must offer the product's own queue, not the front door. */
function checkSupportLinks(files) {
  for (const rel of files) {
    const slug = rel.split('/')[0];
    for (const m of guide(rel).matchAll(/https:\/\/support\.doodesch\.de(\/[a-z0-9-]*)?/g)) {
      if (m[1] !== `/${slug}`) {
        fail(rel, `support link is "${m[0]}", expected "https://support.doodesch.de/${slug}"`);
      }
    }
  }
  notes.push(`support: ${files.length} guides scanned for the per-product quicklink`);
}

// ---------------------------------------------------------------------------------------------------------------

import { readdirSync } from 'node:fs';

const everyGuide = readdirSync(GUIDES)
  .flatMap((mod) => readdirSync(join(GUIDES, mod)).filter((f) => f.endsWith('.md')).map((f) => `${mod}/${f}`));

checkSupportLinks(everyGuide);

if (OFFLINE) {
  notes.push('offline: the source-backed checks were skipped');
} else {
  try {
    const tag = latestTag(SIDELOAD);
    notes.push(`sideload: reading ${tag}`);

    checkUnsupportedList(source(SIDELOAD, tag, 'Css/StyleApplier.cs'));
    checkGlobals(source(SIDELOAD, tag, 'Script/ScriptHost.cs'));
    checkMissingMembers(source(SIDELOAD, tag, 'Script/DomApi.cs'));

    const devtoolsPaths = JSON.parse(gh(['api', `repos/${SIDELOAD}/contents/Devtools?ref=${tag}`], `${SIDELOAD}-${tag}-devtools`))
      .filter((e) => e.name.endsWith('.cs')).map((e) => e.path);
    const devtools = Object.fromEntries(devtoolsPaths.map((p) => [p, source(SIDELOAD, tag, p)]));
    checkConsoleCommands(devtools);

    /*
      The measured reports live in a PRIVATE working repository, so this half runs for whoever changes the
      numbers and not on the public runner, whose token is scoped to this repo and gets a 404.

      Skipped rather than failed, and said out loud rather than swallowed: a check nobody can satisfy gets
      deleted, and a check that goes quiet gets believed. The four checks above read the public Sideload source
      and keep gating everywhere.
    */
    const names = ['SHIPPED-APPS', 'SHOWCASE', 'TAILWIND-V3', 'TAILWIND-V4'];
    const local = join(ROOT, '..', 'Workspace/docs/Sideload/gaps/measured');

    try {
      // A checkout beside this one wins over the pushed copy. Whoever re-measures has the new numbers on disk
      // and the old ones on main, and reading main would hand them a green check against the very figures they
      // just replaced - the check would only start working after the push that made it too late to be useful.
      const reports = existsSync(join(local, 'SHOWCASE.md'))
        ? (notes.push('measured: read from the checkout next door'),
           Object.fromEntries(names.map((n) => [n, readFileSync(join(local, `${n}.md`), 'utf8')])))
        : Object.fromEntries(names.map((n) => [n, source(WORKSPACE, 'main', `docs/Sideload/gaps/measured/${n}.md`)]));

      checkMeasured(reports);
    } catch {
      notes.push('measured: SKIPPED - no access to the gap register, so the percentages went unchecked');
    }
  } catch (err) {
    console.error('check-guides: could not read the sources it checks against.');
    console.error(String(err.stderr ?? err.message ?? err).trim());
    process.exit(1);
  }
}

for (const n of notes) console.log(`  ${n}`);

if (!problems.length) {
  console.log('\ncheck-guides: the guides agree with the code.');
  process.exit(0);
}

console.error(`\ncheck-guides: ${problems.length} claim(s) the code contradicts.\n`);
for (const p of problems) console.error(`  ${p.where}: ${p.what}`);
console.error('\nFix the guide, or the code moved and the guide is now the older truth.');
process.exit(2);
