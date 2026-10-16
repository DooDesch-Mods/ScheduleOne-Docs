---
title: Author a tattoo PNG
description: Draw a tattoo PNG whose pixels land on the right body part instead of a wrong limb.
sidebar:
  order: 3
---

Draw a transparent PNG that lands on the body part you want. A tattoo is a full UV-space skin texture, not a sticker.

**You need:** an image editor with layers, and a reference template (step 1).

## Steps

1. Get a reference. A DEBUG build of Inkorporated exports every built-in tattoo texture to `Schedule I/UserData/Inkorporated/Templates/<placement>/<name>.png`. The PNGs of the example pack are aligned too. A Release build writes no `Templates/` folder.
2. Open the reference for your placement as a bottom layer. Use the same canvas size.
3. Draw your design over the inked area. Put opaque pixels only where the ink goes. Everything else must be transparent.
4. Hide the reference. Export a PNG with real transparency (RGBA). Colour art works, because the layer tint is white by default.
5. Set the matching `placement` in the manifest. See [Pack format](/mods/inkorporated/guides/pack-format/).

## Why alignment matters

The body shares one UV unwrap for torso, arms and legs. The face has its own. The avatar shader samples your PNG across that whole UV. A design centered on a blank canvas lands at the middle of the body UV, often across the legs or arms.

## Size and format

- Format: PNG, RGBA, transparent background.
- Canvas: 2048x2048 for chest and arms, 512x512 for face.
- There is no size cap. Resolution changes sharpness only, not placement.
- Paint a whole arm UV island opaque for a full sleeve. Cover the torso for a chest piece.

## Face tattoos

`placement: face` needs a design drawn to the face UV, not the body UV. The game routes face and body layers by the `/Face/` segment in the resource path. Inkorporated registers face tattoos under `.../custom/Face/...` for you. `chest`, `leftarm` and `rightarm` use the body mesh.

## Check it works

The tattoo appears in the shop under its placement tab. Select it. The ink shows on the intended body part.

## Next

- [Pack format](/mods/inkorporated/guides/pack-format/)
- [Troubleshooting](/mods/inkorporated/guides/troubleshooting/)
