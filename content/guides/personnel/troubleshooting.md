---
title: Troubleshoot Personnel
description: Find the cause and fix for a Personnel pack that does not load, spawn or render.
sidebar:
  order: 5
---

Find your symptom below. Check `MelonLoader/Latest.log` first.

## My pack does not load

Every pack logs one line. A broken pack logs a warning with the file name:

- `manifest has no 'npcs' array`: the JSON root must contain `"npcs": [ ... ]`.
- `failed to read manifest.json`: the JSON is invalid. A trailing comma is the usual cause.
- `an NPC entry has no 'name'`: give every NPC a `name`.

The manifest must be at `UserData/Personnel/Packs/<YourPack>/manifest.json`. Use one folder per pack.

## The log lists my NPCs, but nothing appears in the world

Without `autoRegister`, Personnel only loads definitions. Set `"autoRegister": true`, or let a mod that uses the [API](/mods/personnel/api/) spawn the ids. An NPC with `"physical": false` appears only as a phone contact.

## An NPC does not walk its schedule

- A step with an invalid `time`, `position` or `type` logs a warning and is skipped.
- An unknown building or seat name logs a warning and the NPC skips that step.
- An unreachable destination leaves the NPC where it stood. Pick a point on the navmesh.
- A step skipped because no player was nearby needs `warpIfSkipped: true`.

## My mod's spawn fails or uses defaults

- `no definition '<id>' found`: the pack is not installed, or the id is wrong. Check the startup log for the exact ids. Without an authored `id`, the id is `packname_npcname`, lowercase.
- Make `DefId` a compile-time constant. Personnel reads it from an uninitialized instance, so a field set in your constructor returns null.
- Spawn after a save is loaded, on the host.

## A custom PNG lands on the wrong limb or shows as a blob

The PNG is a full UV-space texture. Align it to the target UV. See [Custom PNG layers](/mods/personnel/guides/custom-png-layers/). Also check the list: `faceLayers` files go to the face mesh, `bodyLayers` files to the body mesh.

## Another player does not see the custom art

That player needs Personnel and the same pack. See [Multiplayer and saves](/mods/personnel/guides/multiplayer-and-saves/).

## The example pack does not appear

Restart the game after you set `LoadExamplePack`. Personnel never overwrites a `Packs/Examples` manifest you edited. Delete the folder to get a fresh copy.

## Still stuck

Send `MelonLoader/Latest.log` and the pack's `manifest.json` to support.
