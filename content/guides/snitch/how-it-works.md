---
title: "How It Works"
description: "Snitch is built to be **honest**: it never shows a number it can't stand behind."
sidebar:
  order: 6
---
Snitch is built to be **honest**: it never shows a number it can't stand behind.

## The layers

1. **Frame time + GC (load-bearing).** A rolling window of frame times yields mean/median/p95/p99 and fps,
   plus GC gen-0/gen-1 collections per 1000 frames. This is build-independent and always reliable - it is the
   truth everything else is checked against.
2. **Section timing (the "what is slow").** Stopwatch accumulators time named sections - both the ones a mod
   registers via the [API](/mods/snitch/guides/modder-api/) and (with `snitch vanilla on`) vanilla hot paths wrapped by Harmony.
   These are **self-measured**: they only see the methods Snitch explicitly wraps, and they include a small
   patch overhead. They are not a sampling profiler.
3. **State distributions.** Cheap, read-only tallies of entities by state (NPCs by movement/visibility, trash
   by physics state, quests by state, plus any modder provider), polled a few times a second.
4. **Ablation (causal cost).** `snitch ablate <lever>` toggles a subsystem off, lets the frame time settle
   under a stability gate, and reports the delta - the build-independent "total cost" of that subsystem,
   including native cost the section timers can't see.

## Honesty rules

- **ProfilerRecorder engine counters are inert in Schedule I's IL2CPP build**, so Snitch does not rely on
  them - frame-time + GC are the load-bearing truth.
- Section costs are self-measured (only wrapped methods). For "total subsystem cost" including native work
  (e.g. the NavMeshAgent), use **ablation**.
- Snitch reports **its own overhead** as the `Snitch.Self` section, so you can see what the profiler costs.
- Everything is idle until `snitch start`. Profiling is read-only and safe in multiplayer; state-mutating
  features (ablation levers) run host-only.

## A worked finding

`NPCMovement.Update` is cheap (~0.06 ms/frame for ~200 NPCs); `NPCMovement.FixedUpdate` costs more (it runs at
the physics rate). But the dominant per-NPC cost is native (the NavMeshAgent), which only ablation reveals -
exactly the kind of thing Snitch is built to surface.

