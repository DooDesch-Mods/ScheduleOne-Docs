---
title: "Pack Format"
description: "A tattoo pack is a plain folder - no code."
sidebar:
  order: 1
---
A tattoo pack is a plain folder - no code. It lives under:

```
…/Schedule I/UserData/Inkorporated/Packs/<YourPackName>/
    manifest.json
    one or more .png files
```

Inkorporated scans every folder in `Packs/` at startup and loads each one that has a `manifest.json`.

## manifest.json

```json
{
  "name": "My Pack",
  "author": "you",
  "tattoos": [
    { "id": "skull", "name": "Skull",    "placement": "chest",   "file": "skull.png" },
    { "id": "tear",  "name": "Teardrop", "placement": "face",     "file": "tear.png", "price": 250 },
    { "id": "sleeve","name": "Full Sleeve","placement": "leftarm","file": "sleeve.png" }
  ]
}
```

### Top level

| Field | Required | Notes |
|-------|----------|-------|
| `name` | no | Pack name, shown in the load log. |
| `author` | no | Your name. |
| `tattoos` | **yes** | Array of tattoo entries (below). |

### Each tattoo entry

| Field | Required | Notes |
|-------|----------|-------|
| `id` | **yes** | Unique within this pack. Lowercase, no spaces (used in the registered resource path). |
| `name` | no | The label on the shop button. Falls back to `id`. |
| `placement` | **yes** | `chest` \| `leftarm` \| `rightarm` \| `face` (case-insensitive; `left`/`right`/`left_arm`/`right_arm` also accepted). |
| `file` | no | PNG filename in the pack folder. Defaults to `<id>.png`. |
| `price` | no | Shop price. Omit or `0` for "Free". |

Entries with an unknown `placement`, a missing `id`, or a missing PNG file are skipped with a warning in the
MelonLoader log - check it if a tattoo does not show up.

## The PNGs

Each `file` is a transparent PNG whose **opaque pixels sit at the UV region of that body part**. This is the
one thing to get right - a tattoo is a full skin-texture layer, not a centered sticker. Read
[Authoring Tattoos](/mods/inkorporated/guides/authoring-tattoos/) before drawing. Recommended canvas: 2048x2048 for body/arms, 512x512 for face (there
is no hard size limit; you can do a full sleeve).

## Shipping a pack as a mod

A pack folder is already a complete mod. To distribute it on Thunderstore, zip the pack so it extracts to
`UserData/Inkorporated/Packs/<YourPackName>/`, and declare **`DooDesch-Inkorporated`** as a dependency in
your `manifest.json` (Thunderstore one) so installers pull the framework in. See the
[example repo](https://github.com/DooDesch-Mods/ScheduleOne-InkorporatedExample)'s `pack/` folder for a
ready template.

