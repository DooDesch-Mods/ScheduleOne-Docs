// Checks the MCP's query layer against the real corpus. Runs without starting a server.
//
//   node mcp/smoke.mjs
//
// Every assertion here is something an agent would get wrong if it broke: an empty index, a search that
// returns nothing for an obvious term, a mod whose API surface is missing, a page that cannot be read back.

import { loadCorpus, search, getPage, listMods, listPages, getApiSurface } from './lib.mjs';

let failures = 0;
const check = (name, condition, detail = '') => {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
};

const corpus = loadCorpus();
console.log(`corpus: ${corpus.pages.length} pages, ${corpus.surfaces.size} API surfaces\n`);

check('corpus has pages', corpus.pages.length > 20, `got ${corpus.pages.length}`);
check('corpus has API surfaces', corpus.surfaces.size >= 5, `got ${corpus.surfaces.size}`);

const mods = listMods(corpus);
check('list_mods returns mods', mods.length >= 10, `got ${mods.length}`);
check('list_mods marks API mods', mods.filter((m) => m.hasApi).length >= 5,
  `got ${mods.filter((m) => m.hasApi).length}`);
check('list_mods carries type names', (mods.find((m) => m.mod === 'snitch')?.apiTypes ?? []).includes('Profiler'));

const hits = search(corpus, 'profiler counter');
check('search finds something for "profiler counter"', hits.length > 0);
check('search results carry a kind', hits.every((h) => typeof h.kind === 'string'));

const refOnly = search(corpus, 'register', { kind: 'reference' });
check('search filters to reference pages', refOnly.length > 0 && refOnly.every((h) => h.kind === 'reference'));

const guideOnly = search(corpus, 'install', { kind: 'guide' });
check('search filters to guides', guideOnly.every((h) => h.kind === 'guide'));

const page = getPage(corpus, 'mods/snitch/api/profiler');
check('get_page reads a reference page', !!page && page.markdown.includes('Sample'));
check('get_page accepts a full URL', !!getPage(corpus, `${corpus.siteUrl}/mods/snitch/api/profiler/`));
check('get_page rejects an unknown slug', getPage(corpus, 'mods/nope/api') === null);

const surface = getApiSurface(corpus, 'snitch');
check('get_api_surface returns types', Array.isArray(surface) && surface.length > 0);
check('get_api_surface has signatures', surface?.every((t) => typeof t.signature === 'string'));
check('get_api_surface has members with signatures',
  surface?.find((t) => t.name === 'Profiler')?.members.some((m) => m.signature.includes('Sample')));
check('get_api_surface is null for a mod without one', getApiSurface(corpus, 'yoink') === null);

const guides = listPages(corpus, { kind: 'guide' });
check('guides were ingested', guides.length >= 30, `got ${guides.length}`);
check('every page has a title', corpus.pages.every((p) => p.title && p.title.length > 0));
check('every page has a URL under the site', corpus.pages.every((p) => p.url.startsWith(corpus.siteUrl)));

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
