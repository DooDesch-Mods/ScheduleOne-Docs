# DooDesch Mod Docs

Documentation for the DooDesch Schedule I mods: what each mod does, how to install it, and the full API
reference for the ones other mods build on.

🛟 **Need help or found a bug?** Get support at [support.doodesch.de/docs](https://support.doodesch.de/docs).

**[Read the docs](https://docs.doodesch.de)**

## What is generated and what is written

The overview, the changelog and the API reference of every mod are generated. Nobody edits them here, and a
pull request that does will be overwritten by the next build.

| Page | Comes from |
|---|---|
| Overview | the mod repo's `README.md` at its latest release tag |
| Install box | the mod repo's `thunderstore/manifest.json` |
| API reference | the mod's own API source, parsed with Roslyn |
| Changelog | the mod repo's `CHANGELOG.md` |
| Guides | `content/guides/<mod>/` in this repo, written by hand |

Guides are the exception on purpose: a reference says what exists, a guide says how to use it, and only the
first of those can be derived from code.

## How a mod gets in

Give its GitHub repo the `game-schedule-i` topic. The next build finds it, reads it at its latest release tag
and writes its pages. There is no list of mods in this repository to update.

A mod gets an API reference section if it carries an API source file in one of the conventional places
(`<Mod>.Api/*.cs`, `Api/API.cs`, `API.cs`). Example repos are excluded by their `example` topic, because the
API copy they vendor belongs to the mod they demonstrate.

## Build it locally

```bash
npm install
npm run build      # ingest from GitHub, then build the site
npm run preview
```

`npm run ingest` alone refreshes the mod content; add `--fresh` to bypass the local cache, or
`--only=snitch,sideload` to work on one mod. The ingest needs the `gh` CLI authenticated and the .NET 8 SDK
for the reference generator.

## Analytics and page feedback

`PUBLIC_UMAMI_ID` decides both. Unset - a local build, a fork - no tracking tag is emitted and no feedback
control is rendered, rather than a control that swallows clicks.

`public/feedback.js` is standalone on purpose: no dependencies, no build step, no backend. Any doodesch.de
site that already loads the Umami tracker can use the same file:

```html
<script defer src="https://docs.doodesch.de/feedback.js"
        data-support="https://support.doodesch.de/docs"></script>
```

It appears when the reader reaches the end of the page, not on load - which is the moment the question is honest and the answer is worth having. A thumb sends `page-feedback {helpful, path}`; a thumbs-down then asks why and sends
`page-feedback-reason {reason, path}`. Both are low-cardinality and carry nothing personal.

**Free text deliberately does not go to Umami.** Analytics has no reply button, so a sentence there can be
read and never answered - and people type names, emails and save paths into a comment box, which would turn
a cookieless install into a store of personal data by accident. The control links to the support form
instead, with the page prefilled, where a person can answer and close it.

## Checks

```bash
node scripts/check-links.mjs    # every internal link resolves to a page that exists
npm run smoke --prefix mcp      # the MCP server's index, search and API surface
```

Both run in CI on every build.

## The MCP server

`mcp/` serves this corpus to coding agents, so an agent writing against a mod API reads the real surface
instead of guessing one. It runs locally over stdio and needs the site content ingested first.

```json
{
  "mcpServers": {
    "doodesch-docs": {
      "command": "node",
      "args": ["path/to/ScheduleOne-Docs/mcp/index.mjs"]
    }
  }
}
```

Tools: `get_api_surface`, `search_docs`, `get_page`, `list_mods`, `list_pages`.

## Layout

```
astro.config.mjs        site config; the mod tree comes from src/generated/sidebar.json
scripts/ingest.mjs      discovery, fetch, transform - writes src/content/docs/mods/
scripts/migrate-wiki.mjs one-way import of a GitHub wiki into content/guides/
scripts/check-links.mjs  link check over dist/
tools/apidoc/           Roslyn reference generator, C# source in, markdown + api.json out
content/guides/         hand-written guides, per mod
mcp/                    MCP server over the built corpus
```

## Licence

MIT. The mod content it ingests stays under each mod's own licence.
