---
title: "Custom PNG Layers"
description: "Custom layers let a pack ship its own art on an NPC - tattoos, face paint, patterns, shirt prints."
sidebar:
  order: 4
---
Custom layers let a pack ship its own art on an NPC - tattoos, face paint, patterns, shirt prints. They
work exactly like [Inkorporated](https://github.com/DooDesch-Mods/ScheduleOne-Inkorporated) tattoos, and
the same authoring rules apply.

## A layer PNG is a full UV-space skin texture, not a sticker

There are **no per-body-part square zones** your image gets dropped into. The body shares **one UV unwrap**
(torso + both arms + legs in a single texture space); the face has its own. Your PNG is sampled across that
entire UV by the avatar shader:

> The design's **opaque pixels must sit at the UV coordinates of the body part you want**. Everything else
> must be transparent.

Draw a shape centered on a blank canvas and its pixels land wherever the middle of the body UV happens to
be (often across legs/arms) - the classic "it is on the wrong limb" mistake.

## Size and format

- **Format:** PNG with a transparent background (RGBA).
- **Recommended canvas:** **2048x2048** for body layers, **512x512** for face layers (matches the built-ins).
- **No size cap** - resolution affects sharpness only, not placement. Big pieces (full sleeve, whole torso)
  are fine: paint that UV region opaque.
- **Colour art works** - layers default to a white tint; the manifest `tint` multiplies over it.

## Alignment references

Paint over aligned art instead of guessing:

- Inkorporated's example pack PNGs (and its DEBUG-build `Templates/` export) are aligned to the same UVs.
- The [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify) editor previews your PNG live on
  the menu character - the fastest feedback loop for alignment.

## Wiring it into the manifest

```json
"faceLayers": [ { "file": "warpaint.png", "tint": "#FFFFFF" } ],
"bodyLayers": [ { "file": "sleeve.png",   "tint": "#C0FFEE" } ]
```

The PNG sits next to `manifest.json` in the pack folder. `faceLayers` files register on the face mesh,
`bodyLayers` files on the body mesh - putting a face design into `bodyLayers` (or vice versa) is the other
common cause of art landing in the wrong place.

