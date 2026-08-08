---
title: "Getting Started"
description: "1."
sidebar:
  order: 3
---
## Install

1. Install **MelonLoader 0.7.3+** for Schedule I.
2. Install **S1API** (ifBars/S1API_Forked) - its DLLs go in `Mods/` and `Plugins/` per its own instructions.
3. Drop **`Inkorporated.dll`** into your `…/Schedule I/Mods/` folder.
   (A Thunderstore mod manager like r2modman/Gale pulls MelonLoader + S1API in automatically.)

## See the format instantly: the bundled example pack

Inkorporated ships a small example pack, off by default. Turn it on to get a few working tattoos plus a
folder/manifest template to copy:

1. Set **`LoadExamplePack`** to `true` in
   `…/Schedule I/UserData/MelonPreferences.cfg` under `[Inkorporated_01_Main]`.
2. Restart the game.
3. Look in `…/Schedule I/UserData/Inkorporated/Packs/Examples/` - that is a complete pack you can copy.
   The tattoos also appear in the in-game tattoo shop.

(Enabling it never overwrites an existing `Examples` folder, so your edits are safe.)

## Make your first tattoo

### The no-code way (content pack)

1. Create `…/Schedule I/UserData/Inkorporated/Packs/MyPack/`.
2. Add a `manifest.json`:
   ```json
   {
     "name": "My Pack",
     "author": "you",
     "tattoos": [
       { "id": "skull", "name": "Skull", "placement": "chest", "file": "skull.png" }
     ]
   }
   ```
3. Put `skull.png` (a transparent PNG) next to it. **Important:** the opaque pixels must sit at the chest's
   UV region - see [Authoring Tattoos](/mods/inkorporated/guides/authoring-tattoos/). Use the example pack's PNGs as a reference.
4. Launch - "Skull" appears in the tattoo shop's Chest category.

Full schema: [Pack Format](/mods/inkorporated/guides/pack-format/).

### The code way (the API)

In a MelonLoader mod that lists Inkorporated as a dependency:
```csharp
using Inkorporated;
using Inkorporated.Model;

// In OnInitializeMelon (register early):
API.RegisterTattooFromFile("skull", "Skull", TattooPlacement.Chest, pngPath, source: "MyMod");
```
Full reference: [API Reference](/mods/inkorporated/api/). A ready-to-build project is in the
[example repo](https://github.com/DooDesch-Mods/ScheduleOne-InkorporatedExample).

## Where things live

| Path | What |
|------|------|
| `UserData/Inkorporated/Packs/<Pack>/` | Your tattoo packs (folder + `manifest.json` + PNGs) |
| `UserData/Inkorporated/Templates/` | UV reference textures (only a **DEBUG** build of Inkorporated writes these) |
| `UserData/MelonPreferences.cfg` -> `[Inkorporated_01_Main]` | The `LoadExamplePack` toggle |

