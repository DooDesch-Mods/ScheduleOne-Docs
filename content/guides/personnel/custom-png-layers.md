---
title: Add a custom PNG layer
description: Ship your own face paint, tattoo or shirt print on a Personnel NPC with a PNG file.
sidebar:
  order: 3
---

Add your own art to an NPC with a PNG in the pack folder. Custom layers work like [Inkorporated](https://github.com/DooDesch-Mods/ScheduleOne-Inkorporated) tattoos and follow the same rules.

**You need:** an NPC pack. See [Make an NPC pack](/mods/personnel/guides/getting-started/).

## Steps

1. Know the rule: the PNG is a full UV-space skin texture, not a sticker. The body shares one UV unwrap for torso, arms and legs. The face has its own. The opaque pixels must sit at the UV position of the target body part. Everything else must be transparent. A shape centered on a blank canvas lands wherever the UV center is, often on the legs or arms.
2. Create the PNG with a transparent background (RGBA). Use 2048x2048 for body layers and 512x512 for face layers. There is no size limit. Resolution changes sharpness only, not placement.
3. Paint over aligned art. The PNGs of the Inkorporated example pack are aligned to the same UVs. So are the files in the `Templates/` folder that a DEBUG build of Inkorporated exports.
4. Put the PNG next to `manifest.json` in the pack folder.
5. Reference it in the manifest. Use `faceLayers` for face art and `bodyLayers` for body art:
   ```json
   "faceLayers": [ { "file": "warpaint.png", "tint": "#FFFFFF" } ],
   "bodyLayers": [ { "file": "sleeve.png",   "tint": "#C0FFEE" } ]
   ```
6. Restart the game.

Colour art works. The default tint is white, and the manifest `tint` multiplies over the PNG.

## Check it works

The NPC shows the art on the intended body part. The [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify) editor previews a PNG live on the menu character. Use it to check alignment before you restart the game.

If the art lands on the wrong part, check the UV alignment first. Then check that a face design is in `faceLayers` and a body design is in `bodyLayers`.

## Next

- [Pack format](/mods/personnel/guides/pack-format/)
- [Multiplayer and saves](/mods/personnel/guides/multiplayer-and-saves/)
- [Troubleshooting](/mods/personnel/guides/troubleshooting/)
