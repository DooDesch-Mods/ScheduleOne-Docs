---
title: "Troubleshooting"
description: "Always check the MelonLoader log first: `…/Schedule I/MelonLoader/Logs/` (newest file)."
sidebar:
  order: 6
---
Always check the MelonLoader log first: `…/Schedule I/MelonLoader/Logs/` (newest file). Inkorporated logs
every pack it loads, every tattoo it registers, and any problem with a warning.

## My tattoo does not appear in the shop at all

- **Pack not loaded?** The log should show `Pack '<YourPack>' (...): N tattoo(s)`. If not, the folder is not
  under `UserData/Inkorporated/Packs/<Pack>/`, or `manifest.json` is missing/invalid JSON.
- **Entry skipped?** Look for a warning naming your tattoo: unknown `placement`, missing `id`, or the PNG
  file was not found (check the `file` name and that it sits in the pack folder).
- **Wrong category tab.** A `chest` tattoo only shows under Chest, `face` under Face, etc.
- **(API)** You registered too late. Register in `OnInitializeMelon`, before the shop UI is built. See
  [API Reference](/mods/inkorporated/api/).

## The tattoo shows, but it is in the wrong place / a black blob on a limb

This is almost always **UV misalignment**: the PNG's opaque pixels are not at the body part's UV. A big
centered design maps across the wrong areas. Re-read [Authoring Tattoos](/mods/inkorporated/guides/authoring-tattoos/) and paint over a UV template.

## The button appears but selecting it does nothing visible

- The texture may be fully transparent, or its opaque area is tiny / off in an unused UV corner. Verify the
  PNG actually has visible pixels and is aligned.
- Confirm the placement matches the art (a face design under `face`, etc.).

## A custom tattoo I made is solid black over a whole limb

Your PNG is opaque where it should be transparent (e.g. an opaque background). Tattoos need a transparent
background with opaque pixels only on the design. Export as RGBA with real transparency.

## Other players cannot see my tattoo

Expected unless they also have Inkorporated **and the same pack/registration**. The path is synced, but a
client without the content cannot render it. See [Multiplayer Saves and NPCs](/mods/inkorporated/guides/multiplayer-saves-and-npcs/).

## (API) My mod fails to load / cannot find Inkorporated

- Add `[assembly: MelonAdditionalDependencies("Inkorporated")]` so it loads after the framework.
- Make sure `Inkorporated.dll` (and S1API) are actually installed in `Mods/`.
- Reference the DLLs from a real install (see [API Reference](/mods/inkorporated/api/) / the example `.csproj`).

## Where are the UV templates?

`UserData/Inkorporated/Templates/` is written only by a **DEBUG** build of Inkorporated. With the normal
Release build it will not exist - use a DEBUG build to export them, or start from the example pack's aligned
PNGs.

Still stuck? 🛟 [support.doodesch.de](https://support.doodesch.de/inkorporated).

