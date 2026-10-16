---
title: How Snitch measures
description: Look up what each Snitch number measures, and where it cannot see.
sidebar:
  order: 6
---

Look up how Snitch gets its numbers. Snitch shows only numbers it can back up.

## The four layers

| Layer | What it measures | Limit |
|---|---|---|
| Frame time and GC | A rolling window gives mean, median, p95, p99 and fps. It also counts GC gen-0 and gen-1 collections per 1000 frames. | None. Build-independent. Every other number is checked against it. |
| Sections | Stopwatch time of named sections: the ones a mod registers through the [API](/mods/snitch/guides/modder-api/), and vanilla hot paths with `snitch vanilla on`. | Self-measured. It sees only wrapped methods and includes a small patch overhead. It is not a sampling profiler. |
| State distributions | Counts of entities by state (NPC movement and visibility, trash physics, quest state, mod providers), read a few times a second. | Read-only tallies. |
| Ablation | `snitch ablate <lever>` switches a subsystem off, waits for a stable frame time and reports the change. | Needs a calm scene. |

## Rules to know

- ProfilerRecorder engine counters do not work in the IL2CPP build. Snitch does not use them.
- Section times miss native work such as the NavMeshAgent. Use ablation for the total cost of a subsystem.
- Snitch shows its own cost as the `Snitch.Self` section.
- Everything is idle until `snitch start`.
- Profiling is read-only and safe in multiplayer. Ablation levers change state and run host-only.

## Example

`NPCMovement.Update` costs about 0.06 ms/frame for 200 NPCs. `NPCMovement.FixedUpdate` costs more, because it runs at the physics rate. The largest per-NPC cost is native (NavMeshAgent), and only ablation shows it.

## Next

- [Console commands](/mods/snitch/guides/console-commands/)
- [Profile your mod](/mods/snitch/guides/modder-api/)
