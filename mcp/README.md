# doodesch-docs-mcp

An MCP server for the [DooDesch Schedule I mod docs](https://docs.doodesch.de). It answers with the real
public API surface of each mod - generated from that mod's own source at its release tag - so a coding agent
writes against what exists instead of what it expects.

🛟 **Need help or found a bug?** Get support at [support.doodesch.de/docs](https://support.doodesch.de/docs).

## Use it

```json
{
  "mcpServers": {
    "doodesch-docs": {
      "command": "npx",
      "args": ["-y", "doodesch-docs-mcp"]
    }
  }
}
```

Node 20 or newer, nothing else. The corpus is downloaded from the docs site on first use and cached for six
hours; if the site is unreachable and a cached copy exists, the cache is served rather than failing.

## Tools

| Tool | Answers |
|---|---|
| `get_api_surface` | every public type and member of one mod, with signatures and the release each was added in |
| `search_docs` | keyword search, filterable by mod and by kind of page |
| `get_page` | one page in full, as markdown |
| `list_mods` | which mods exist, which expose an API, and the type names in it |
| `list_pages` | the page index, filterable |

`get_api_surface` is the one worth reaching for first. Members carry `addedIn` wherever the mod has enough
releases to tell, which answers "may I call this while supporting an older host" without reading prose.

## Offline

```bash
curl -O https://docs.doodesch.de/mcp-corpus.json
DOCS_BUNDLE=./mcp-corpus.json npx -y doodesch-docs-mcp
```

`DOCS_BUNDLE_URL` overrides where the corpus is fetched from.

## What it is not

It does not run the game, build a mod, or read your project. It is a read-only view of published
documentation.

## Licence

MIT. The documentation it serves stays under each mod's own licence.
