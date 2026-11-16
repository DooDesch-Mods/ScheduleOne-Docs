// Full-page screenshots of the Based base pages: every page in desktop and mobile width, light and dark.
//
// Serve the built site first (for example `python -m http.server 4343 --directory dist`). Playwright is not a
// dependency of this site; point --playwright at any node_modules/playwright folder. Every image is loaded and
// decoded before the shot, because lazy images below the fold otherwise come out empty. Prints PASS/FAIL per shot.
//
// Check the result with tools/based/check-shots.py.
//
// usage: node tools/based/page-shots.mjs --base http://127.0.0.1:4343 --out <folder> --playwright <path> [--only sweatshop]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ALL_PAGES = ['sweatshop', 'storage-unit'];
const DEVICES = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const SCHEMES = ['dark', 'light'];

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, i, all) => (i % 2 ? pairs : [...pairs, [all[i].replace(/^--/, ''), all[i + 1]]]), []),
);
for (const key of ['base', 'out', 'playwright']) {
  if (!args[key]) {
    console.log(`FAIL missing --${key}`);
    process.exit(1);
  }
}

const PAGES = args.only ? args.only.split(',') : ALL_PAGES;
const { chromium } = createRequire(import.meta.url)(resolve(args.playwright));
mkdirSync(args.out, { recursive: true });
const browser = await chromium.launch();
let failed = 0;
try {
  for (const page of PAGES) {
    const url = `${args.base.replace(/\/$/, '')}/mods/based/guides/${page}/`;
    for (const [device, viewport] of Object.entries(DEVICES)) {
      for (const colorScheme of SCHEMES) {
        const name = `${page}-${device}-${colorScheme}`;
        const context = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1 });
        try {
          const tab = await context.newPage();
          const response = await tab.goto(url, { waitUntil: 'networkidle' });
          if (!response || !response.ok()) throw new Error(`HTTP ${response ? response.status() : 'no response'}`);
          const broken = await tab.evaluate(async () => {
            const images = [...document.querySelectorAll('main img')];
            images.forEach((img) => { img.loading = 'eager'; });
            const failed = [];
            await Promise.all(images.map((img) => img.decode().catch((e) => failed.push(`${img.getAttribute('src')} (${e.message})`))));
            await document.fonts.ready;
            return failed.concat(images.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')));
          });
          if (broken.length) throw new Error(`images not loaded: ${broken.join(', ')}`);
          // A fullPage shot of a long page stitches tiles the compositor may not have painted yet, which leaves blank
          // bands. A viewport as tall as the page is painted as one screen instead.
          const height = await tab.evaluate(() => document.documentElement.scrollHeight);
          await tab.setViewportSize({ width: viewport.width, height });
          await tab.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
          const path = resolve(join(args.out, `${name}.png`));
          await tab.screenshot({ path });
          console.log(`PASS ${name} -> ${path}`);
        } catch (error) {
          failed += 1;
          console.log(`FAIL ${name}: ${error.message}`);
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
