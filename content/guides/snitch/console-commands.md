---
title: Console commands
description: Look up every snitch console command with its arguments and effect.
sidebar:
  order: 4
---

Look up a `snitch` command here. Open the in-game developer console and type it. Snitch is idle until `snitch start`.

| Command | What it does |
|---|---|
| `snitch start` | Arm sampling and start streaming live data. |
| `snitch stop` | Disarm sampling. The game keeps running. |
| `snitch status` | One-line summary: active, fps, section, state and counter counts. |
| `snitch frame` | Log the frame-time distribution (mean, median, p95, p99, min, max, fps, GC). |
| `snitch top [n]` | Log the top N sections by ms/frame. Default 8. |
| `snitch sections` | Log all sections. |
| `snitch states [id]` | Log entity-state distributions, optionally filtered. |
| `snitch counters` | Log the registered counters. |
| `snitch panels` | List the registered mod panels and their control counts. |
| `snitch act <actionId>` | Run a panel action by id, for example `Siesta:force-cosmetic`. |
| `snitch toggle <toggleId> [on\|off]` | Flip a panel toggle. Omit the state to switch it. |
| `snitch slider <sliderId> [value]` | Write a panel slider. Omit the value to read it with its range and step. See [Add a slider](/mods/snitch/guides/sliders/). |
| `snitch dashboard` | Open the [web dashboard](/mods/snitch/guides/web-dashboard/) in your browser. |
| `snitch log [<channel>\|all] [n]` | Print the last N log lines of a mod channel, or the combined timeline. |
| `snitch vanilla on\|off` | Time vanilla hot paths, for example `NPCMovement.Update` and `FixedUpdate`. |
| `snitch ablate <lever>` | Measure a subsystem's frame cost with an A/B toggle. Built-in lever: `npc`. |
| `snitch levers` | List the ablation levers. |
| `snitch report [md\|csv\|all]` | Write a report to `Mods/Snitch/runs/` as Markdown and CSV. |

## Notes

- `snitch slider` clamps and snaps like a drag. Use it for scripted tuning, because a script cannot drag.
- `snitch dashboard` opens the bundled dashboard when it sits beside the DLL, and the hosted site otherwise. It opens nothing when the local data server is off, and says so.
- `snitch vanilla on` adds Harmony probes that sum one label over all instances. Only the methods Snitch wraps are timed. See [How Snitch measures](/mods/snitch/guides/how-it-works/).
- `snitch ablate npc` switches all NPC movement off and measures the settled frame-time change. It runs host-only. Disable other NPC mods such as Siesta first.
