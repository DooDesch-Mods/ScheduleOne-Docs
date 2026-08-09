// @ts-check
import { readFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import { rehypeBaseLinks } from './plugins/rehype-base-links.mjs';

// The published site. CI sets both explicitly; the defaults here are what a local build serves.
const SITE = process.env.DOCS_SITE ?? 'https://docs.doodesch.de';
const BASE = process.env.DOCS_BASE ?? '/';

// The per-mod tree is written by scripts/ingest.mjs before the build. An empty file is a real state
// (nothing ingested yet), a missing one means the build ran without the ingest step.
const SIDEBAR = './src/generated/sidebar.json';
const mods = existsSync(SIDEBAR) ? JSON.parse(readFileSync(SIDEBAR, 'utf8')) : [];

export default defineConfig({
  site: SITE,
  base: BASE,
  markdown: {
    rehypePlugins: [[rehypeBaseLinks, { base: BASE }]],
  },
  integrations: [
    starlight({
      title: 'DooDesch Mod Docs',
      description:
        'Documentation for the DooDesch Schedule I mods: what each mod does, how to install it, and the full API reference for the ones other mods build on.',
      tagline: 'Every DooDesch Schedule I mod, and every API they expose.',
      plugins: [starlightLlmsTxt({ projectName: 'DooDesch Schedule I Mod Docs' })],
      social: [
        {
          icon: 'discord',
          label: 'Discord',
          href: 'https://discord.gg/aN3u7BTa3h',
        },
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/DooDesch-Mods',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/DooDesch-Mods/ScheduleOne-Docs/edit/main/',
      },
      lastUpdated: true,
      customCss: ['./src/styles/docs.css'],
      sidebar: [
        { label: 'Start here', link: '/' },
        { label: 'Install and troubleshoot', link: '/install/' },
        { label: 'All mods', link: '/mods/' },
        { label: 'Using a mod API', link: '/using-a-mod-api/' },
        { label: 'Use with an agent', link: '/agents/' },
        { label: 'Mods', items: mods },
      ],
    }),
  ],
});
