---
title: Use these docs with an agent
description: An MCP server that answers with the real API surface of every DooDesch Schedule I mod, so a coding agent stops inventing method signatures.
sidebar:
  order: 3
---

Coding agents invent methods. They produce a signature that looks exactly like one this API would have, and
it compiles in their head and nowhere else. The fix is to hand them the real surface at the moment they ask.

## Add the server

```bash
git clone --depth 1 https://github.com/DooDesch-Mods/ScheduleOne-Docs.git
npm ci --prefix ScheduleOne-Docs/mcp
```

Then point your agent at it:

```json
{
  "mcpServers": {
    "doodesch-docs": {
      "command": "node",
      "args": ["/path/to/ScheduleOne-Docs/mcp/index.mjs"]
    }
  }
}
```

Claude Code, Cursor, Codex and anything else speaking MCP over stdio take this shape. It needs Node and
three small packages - no game SDK, no .NET, no build step. The corpus is downloaded from this site on first
use and cached for six hours.

## What it answers

| Tool | Use it for |
|---|---|
| `get_api_surface` | every public type and member of one mod, with signatures and the release each was added in |
| `search_docs` | keyword search, filterable to one mod or to one kind of page |
| `get_page` | one page in full, as markdown |
| `list_mods` | which mods exist, which expose an API, and the type names in it |
| `list_pages` | the page index, filterable |

`get_api_surface` is the one that matters. It is generated from the mod's own source at its release tag, so
it cannot describe a method the mod does not have.

## Ask it the version question

Every member carries `addedIn` where the mod has enough releases to tell. If you support Hotline 1.2.0 and
the surface says a member arrived in `1.3.0`, that is your answer without reading a page.

## Working offline

The bundle behind all of it is a single file:

```bash
curl -O https://docs.doodesch.de/mcp-corpus.json
DOCS_BUNDLE=./mcp-corpus.json node /path/to/ScheduleOne-Docs/mcp/index.mjs
```

If the site is unreachable and a cached copy exists, the server serves the cache rather than failing. Out of
date beats absent.

## Without MCP

`llms.txt`, `llms-full.txt` and `llms-small.txt` are published at the site root for tools that read those.
They carry the same prose but not the structured API surface.
