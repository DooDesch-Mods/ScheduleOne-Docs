---
title: Troubleshoot Snitch
description: Find the Snitch symptom you see and apply its fix.
sidebar:
  order: 7
---

Find your symptom below. Check `MelonLoader/Latest.log` first.

## The dashboard says "Searching..." and never connects

- Check that the game runs with Snitch installed and a save is loaded. The log shows `Snitch v...` when the mod loads.
- The hosted page connects to `ws://127.0.0.1:6140`. If the browser asks to "allow access to your local network", allow it.
- For a custom dashboard origin, add it to the `AllowedOrigins` preference. Localhost and the official hosted domain are allowed already.
- Another tool may use the port. Change the `ServerPort` preference (default `6140`) and reconnect.

## The dashboard connects but shows "idle"

Sampling is off. Press **Start** on the page, or run `snitch start`.

## `snitch dashboard` opens nothing

The local data server is off. Set `ServerEnabled` in MelonPreferences and restart the game.

## fps looks the same with `snitch vanilla on`

Vanilla section costs cover only the methods Snitch wraps. The main cost of a system can be native code. Run `snitch ablate <lever>` for the real total.

## An ablation result looks wrong or negative

Ablation measures a settled frame-time change. Run it in a calm scene, not right after a load. Disable other mods that act on the same subsystem, for example an NPC-LOD mod when you ablate `npc`.

## A control is missing from my mod panel

Two slider labels may give the same id. See [Add a slider](/mods/snitch/guides/sliders/). Run `snitch panels` to compare control counts.

## Ablation does nothing on a client

Ablation levers run on the host only. Measurement itself runs on every peer.

## I need to ask for help

Run `snitch report all`. Attach the files from `Mods/Snitch/runs/` and `MelonLoader/Latest.log`.
