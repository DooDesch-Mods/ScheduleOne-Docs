---
title: Use with an AI agent
description: Connect your coding agent to an MCP server that returns the real API of every DooDesch mod.
sidebar:
  order: 3
---

Connect the `doodesch-docs` MCP server to your agent. It then reads the real API instead of guessing method names.

**You need:** Node.js, and an agent that speaks MCP over stdio (Claude Code, Cursor, Codex and others).

## Steps

1. Get the server:

   ```bash
   git clone --depth 1 https://github.com/DooDesch-Mods/ScheduleOne-Docs.git
   npm ci --prefix ScheduleOne-Docs/mcp
   ```

2. Add it to your agent's MCP config:

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

The server downloads the docs from this site on first use and caches them for six hours.

## Check it works

Ask your agent: "Use get_api_surface for hotline." The answer lists the Hotline types with their signatures.

## Tools

| Tool | Use it for |
|---|---|
| `get_api_surface` | Every public type and member of one mod, with signatures and the version that added it. |
| `search_docs` | Search the docs, for one mod or one kind of page. |
| `get_page` | One page in full, as markdown. |
| `list_mods` | All mods, which ones have an API, and their type names. |
| `list_pages` | The page index. |

`get_api_surface` comes from the mod's source at its release tag. A member it does not list does not exist.

## Work offline

Download the bundle once and point the server at it:

```bash
curl -O https://docs.doodesch.de/mcp-corpus.json
DOCS_BUNDLE=./mcp-corpus.json node /path/to/ScheduleOne-Docs/mcp/index.mjs
```

When the site is not reachable, the server uses its cached copy.

## Without MCP

The site root has `llms.txt`, `llms-full.txt` and `llms-small.txt`. They hold the same text, without the structured API.
