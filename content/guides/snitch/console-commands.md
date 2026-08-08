---
title: "Console Commands"
description: "All commands are namespaced `snitch`."
sidebar:
  order: 2
---
All commands are namespaced `snitch`. Open the in-game developer console and type them. Everything is idle
until `snitch start`.

| Command | What it does |
|---|---|
| `snitch start` | Arm sampling and start streaming live data. |
| `snitch stop` | Disarm sampling (the game keeps running). |
| `snitch status` | One-line summary: active, fps, section/state/counter counts. |
| `snitch frame` | Log the full frame-time distribution (mean/median/p95/p99/min/max, fps, GC). |
| `snitch top [n]` | Log the top N sections by ms/frame (default 8). |
| `snitch sections` | Log all sections. |
| `snitch states [id]` | Log the entity-state distributions (optionally filtered). |
| `snitch counters` | Log the registered numeric counters. |
| `snitch panels` | List the registered per-mod panels and how many controls each holds. |
| `snitch act <actionId>` | Run a panel action by id (e.g. `Siesta:force-cosmetic`). |
| `snitch toggle <toggleId> [on\|off]` | Flip a panel toggle (omit to toggle). |
| `snitch slider <sliderId> [value]` | Write a panel slider, or omit the value to read it back with its range and step. See [Sliders](/mods/snitch/guides/sliders/). |
| `snitch dashboard` | Open the [Web Dashboard](/mods/snitch/guides/web-dashboard/) in your browser. |
| `snitch log [<channel>\|all] [n]` | Print the last N log lines of a mod channel, or the combined timeline. |
| `snitch vanilla on\|off` | Attribute CPU cost to vanilla hot paths (e.g. `NPCMovement.Update/FixedUpdate`). |
| `snitch ablate <lever>` | Measure a subsystem's causal frame cost via an A/B toggle (built-in `npc`). |
| `snitch levers` | List the available ablation levers. |
| `snitch report [md\|csv\|all]` | Export a report to `Mods/Snitch/runs/`. |

## Notes

- `snitch slider` writes the same value a drag does, and the host clamps and snaps it the same way. It exists
  because a mouse control cannot be driven by a script, so this is how a tuning session stays reproducible.
- `snitch dashboard` opens the bundled dashboard on the local port when one is installed beside the DLL, and
  the hosted site otherwise. With the local data server switched off it opens nothing and says why - see
  [Web Dashboard](/mods/snitch/guides/web-dashboard/).
- `snitch vanilla on` installs Harmony probes that aggregate one label across all instances (e.g. total
  `NPCMovement.Update` ms/frame). These are self-measured (only the methods Snitch wraps) - see
  [How It Works](/mods/snitch/guides/how-it-works/).
- `snitch ablate npc` toggles all NPC movement off and measures the settled frame-time delta. It runs
  host-only and is cleanest with other NPC mods (like Siesta) disabled.
- Reports (`snitch report`) are written to `Mods/Snitch/runs/` in your game folder as Markdown + CSV.

