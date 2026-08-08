---
title: "Troubleshooting"
description: "- Check the MelonLoader console/log."
sidebar:
  order: 6
---
## My pack does not load

- Check the MelonLoader console/log. Every pack logs a line; a broken one logs a warning naming the file:
  - `manifest has no 'npcs' array` - the JSON root must contain `"npcs": [ ... ]`.
  - `failed to read manifest.json` - invalid JSON (trailing comma is the usual suspect).
  - `an NPC entry has no 'name'` - every NPC needs a `name`.
- The folder must be `UserData/Personnel/Packs/<YourPack>/manifest.json` - one folder per pack, manifest at
  the folder root.

## The log shows my NPCs, but nothing appears in the world

That is expected with only Personnel installed - it is a library. Something has to consume the definitions:
a mod using [API Reference](/mods/personnel/api/), or any released mod that lists your pack's ids. See
[Getting Started](/mods/personnel/guides/getting-started/) ("What Personnel does NOT do").

## My mod's spawn fails / falls back to defaults

- `no definition '<id>' found` - the pack is not installed or the id is wrong. Ids are DERIVED
  (`packname_npcname`, lowercased, `_`-collapsed) - check the startup log for the exact strings; a manifest
  `id` field is ignored. See [Pack Format](/mods/personnel/guides/pack-format/).
- `DefId` must be a compile-time constant - it is read from an uninitialized instance, so returning a field
  set in your constructor yields null.
- Spawn after a save is loaded, on the host.

## Custom PNG lands on the wrong limb / shows as a blob

Your PNG is a full UV-space texture, not a centered sticker - see [Custom PNG Layers](/mods/personnel/guides/custom-png-layers/). Also check the
layer list: `faceLayers` files go to the face mesh, `bodyLayers` files to the body mesh.

## Another player does not see the custom art

They need Personnel **and the same pack** installed - custom layers travel as resource paths, not textures.
See [Multiplayer and Saves](/mods/personnel/guides/multiplayer-and-saves/).

## Example pack does not appear

`LoadExamplePack` requires a game **restart** after enabling, and it never overwrites an existing
`Packs/Examples` folder - delete that folder if you want a fresh copy.

## Still stuck?

> (`…/Schedule I/MelonLoader/Latest.log`) and the pack's `manifest.json`.

