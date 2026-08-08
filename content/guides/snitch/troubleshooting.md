---
title: "Troubleshooting"
description: "- Make sure the game is running with Snitch installed (you should see `Snitch v1.0.0` in the MelonLoader log)"
sidebar:
  order: 7
---
## The dashboard says "Searching…" and never connects

- Make sure the game is running with Snitch installed (you should see `Snitch v1.0.0` in the MelonLoader log)
  and that you're in a save (the server runs once the mod loads).
- The hosted page connects to `ws://127.0.0.1:6140`. If your browser shows an **"allow access to your local
  network"** prompt, allow it (Chrome's Private Network Access). 
- If you use a custom dashboard origin, add it to the `AllowedOrigins` preference (localhost is always
  allowed). The default allows the official hosted domain.
- Check the port: the `ServerPort` preference defaults to `6140`. If another tool uses it, change it and
  reconnect.

## The dashboard connects but shows no data ("idle")

Sampling is off. Press **Start** on the page, or run `snitch start` in game. Everything is idle until armed.

## fps looks the same with `snitch vanilla on`

The vanilla section costs are self-measured (only the methods Snitch wraps). The dominant cost of a system can
be native code Snitch can't time directly - use `snitch ablate <lever>` to measure the real total cost.

## An ablation result looks wrong / negative

Ablation measures a settled frame-time delta. Run it on a calm scene (not right after a load), and disable
other mods that fight the same subsystem (e.g. an NPC-LOD mod when ablating `npc`). A noisy scene gives noisy
deltas.

## Multiplayer

Profiling/measurement runs locally and is safe on every peer. State-mutating features (the ablation levers)
run host-only by design.

## Reports

`snitch report all` writes Markdown + CSV to `Mods/Snitch/runs/` in your game folder - attach those when
asking for help.

