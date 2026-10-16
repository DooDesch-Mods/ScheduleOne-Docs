---
title: Pack format reference
description: Look up the folder layout and manifest.json fields of an Inkorporated tattoo pack.
sidebar:
  order: 2
---

Look up the folder layout and `manifest.json` fields of a tattoo pack. A pack needs no code.

```
Schedule I/UserData/Inkorporated/Packs/<YourPackName>/
    manifest.json
    one or more .png files
```

Inkorporated scans every folder in `Packs/` at startup. It loads each folder that has a `manifest.json`.

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
| `tattoos` | yes | Array of tattoo entries. |

### Tattoo entry

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique inside the pack. Lowercase, no spaces. It becomes part of the registered resource path. |
| `name` | no | Label on the shop button. Default: `id`. |
| `placement` | yes | `chest`, `leftarm`, `rightarm` or `face`. Case-insensitive. `left`, `right`, `left_arm` and `right_arm` also work. |
| `file` | no | PNG file name in the pack folder. Default: `<id>.png`. |
| `price` | no | Shop price. Omit it or use `0` for "Free". |

Inkorporated skips an entry with an unknown `placement`, a missing `id` or a missing PNG. It logs a warning for each.

## PNG files

Each `file` is a transparent PNG. Its opaque pixels sit at the UV region of the body part. Recommended canvas: 2048x2048 for chest and arms, 512x512 for face. There is no hard size limit. See [Author a tattoo PNG](/mods/inkorporated/guides/authoring-tattoos/).

## Publish a pack

1. Zip the pack so it extracts to `UserData/Inkorporated/Packs/<YourPackName>/`.
2. Add `DooDesch-Inkorporated` as a dependency in the Thunderstore `manifest.json`.
3. Use the `pack/` folder of the [example repo](https://github.com/DooDesch-Mods/ScheduleOne-InkorporatedExample) as a template.
