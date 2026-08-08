---
title: "Authoring Tattoos"
description: "This is the page people skip and then wonder why their tattoo is a black blob on the wrong limb."
sidebar:
  order: 4
---
This is the page people skip and then wonder why their tattoo is a black blob on the wrong limb. Read it.

## A tattoo is a full UV-space skin texture, not a sticker

There are **no per-body-part square zones** that your image gets dropped into. The body shares **one UV
unwrap** (torso + both arms + legs baked into a single texture space) and the face has its own. Your PNG is
sampled across that entire UV by the avatar shader. So:

> Your design's **opaque pixels must sit at the UV coordinates of the body part you want**. Everything else
> must be transparent.

The built-in "chest" tattoo, for example, is a full-size texture where only the chest-region pixels are
opaque. If you draw a big shape centered in a blank 512x512 canvas, its opaque pixels land wherever the
center of the body UV happens to be (often across the legs/arms) - that is the classic "it is on the wrong
limb" mistake.

## Get the UV right: use the templates

The reliable way is to paint over a real built-in tattoo. A **DEBUG build of Inkorporated** auto-exports
every built-in tattoo texture to:

```
…/Schedule I/UserData/Inkorporated/Templates/<placement>/<name>.png
```

Open one for your placement as a reference layer in your image editor, draw your design over the inked area
(same canvas size), then export your own transparent PNG. The shipped example pack PNGs are already aligned
and make good starting points too.

(If you only have the normal Release build, the `Templates/` folder will not appear - grab a DEBUG build, or
start from the example pack's aligned PNGs.)

## Size and format

- **Format:** PNG with a transparent background (RGBA). Opaque where the ink is, transparent everywhere else.
- **Recommended canvas:** **2048x2048** for chest/arms, **512x512** for face (matches the built-ins).
- **There is no size cap.** Resolution only affects sharpness, not placement. A 512 and a 2048 both cover the
  whole UV; 2048 just has more detail.
- **Colour:** the design renders in its own colours (the tattoo layer is tinted white by default), so colour
  art works, not just black line art.

## Full sleeves and big pieces

Because the texture covers the body's whole UV, you are **not** limited to small marks. Paint the entire
arm's UV island opaque and you get a full sleeve; cover the torso for a chest piece; you can even cover most
of the body. The built-ins are small by artistic choice, not a technical limit.

## Placement and the face

`placement` decides which built-in layer is cloned and how the path is routed:

- `chest`, `leftarm`, `rightarm` go through the body mesh.
- `face` is special: the game routes face vs body by whether the resource path contains `/Face/`, so
  Inkorporated registers face tattoos under `…/custom/Face/…` and clones a face layer. You do not have to do
  anything - just set `placement: face` - but it is why a face design must be drawn to the **face** UV, not
  the body UV.

## Checklist

- [ ] Transparent background, opaque only where the ink is.
- [ ] Opaque pixels aligned to the target body part's UV (painted over a template).
- [ ] Right `placement` for that UV.
- [ ] Reasonable size (2048 body/arm, 512 face).

