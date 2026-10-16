---
title: Troubleshoot Inkorporated
description: Find the cause and fix for a tattoo that is missing, misplaced, black or invisible to other players.
sidebar:
  order: 5
---

Find your symptom below. Check `MelonLoader/Latest.log` first.

## My tattoo does not appear in the shop

- Pack not loaded: the log must show `Pack '<YourPack>' (...): N tattoo(s)`. If not, the folder is not at `UserData/Inkorporated/Packs/<Pack>/`, or `manifest.json` is missing or invalid.
- Entry skipped: look for a warning with your tattoo name. Causes are an unknown `placement`, a missing `id` or a missing PNG. Check the `file` name.
- Wrong tab: a `chest` tattoo shows only under Chest, a `face` tattoo only under Face.
- API: register in `OnInitializeMelon`, before the shop UI is built.

## The tattoo is in the wrong place or a blob on a limb

The opaque pixels are not at the UV of the body part. Paint over a template. See [Author a tattoo PNG](/mods/inkorporated/guides/authoring-tattoos/).

## I select the button and nothing shows

The texture is fully transparent, or its opaque area is tiny or in an unused UV corner. Check that the PNG has visible pixels at the right UV. Check that the placement matches the art.

## The tattoo is solid black over a whole limb

The PNG has an opaque background. Export RGBA with a transparent background and opaque pixels only on the design.

## Other players cannot see my tattoo

They need Inkorporated and the same pack. The game syncs the path, and a client without the content cannot render it. See [Multiplayer, saves and NPCs](/mods/inkorporated/guides/multiplayer-saves-and-npcs/).

## My mod cannot find Inkorporated or fails to load

- Add `[assembly: MelonAdditionalDependencies("Inkorporated")]` so your mod loads after the framework.
- Install `Inkorporated.dll` and S1API in `Mods/`.
- Reference the DLLs from a real install. See the [API reference](/mods/inkorporated/api/) and the example `.csproj`.

## The Templates folder is missing

Only a DEBUG build of Inkorporated writes `UserData/Inkorporated/Templates/`. Use a DEBUG build, or start from the aligned PNGs of the example pack.

## Still stuck

Get support at [support.doodesch.de](https://support.doodesch.de/inkorporated).
