---
title: Make a tattoo pack
description: Add your own tattoo to the Schedule I tattoo shop with a manifest.json and a PNG.
sidebar:
  order: 1
---

Make a tattoo pack: a folder with a `manifest.json` and a PNG. Your tattoo appears in the in-game tattoo shop.

**You need:** Inkorporated and S1API installed. See [Install](/install/) for MelonLoader, S1API and the mod DLL.

## Steps

1. Create the folder `Schedule I/UserData/Inkorporated/Packs/MyPack/`.
2. Create `manifest.json` in that folder:
   ```json
   {
     "name": "My Pack",
     "author": "you",
     "tattoos": [
       { "id": "skull", "name": "Skull", "placement": "chest", "file": "skull.png" }
     ]
   }
   ```
3. Put `skull.png` next to it. Use a transparent PNG. The opaque pixels must sit at the UV region of the chest. See [Author a tattoo PNG](/mods/inkorporated/guides/authoring-tattoos/).
4. Start the game.

To start from a working pack, set `LoadExamplePack` to `true` under `[Inkorporated_01_Main]` in `UserData/MelonPreferences.cfg`. Restart. Inkorporated writes `UserData/Inkorporated/Packs/Examples/`. It never overwrites an existing folder. Its tattoos also appear in the shop.

## Check it works

`MelonLoader/Latest.log` shows `Pack 'MyPack' (...): 1 tattoo(s)`. In the tattoo shop, "Skull" appears in the Chest category.

## Register a tattoo from code

Use this path when your own mod ships the tattoo. List Inkorporated as a dependency and register early:

```csharp
using Inkorporated;
using Inkorporated.Model;

// In OnInitializeMelon:
API.RegisterTattooFromFile("skull", "Skull", TattooPlacement.Chest, pngPath, source: "MyMod");
```

A ready project is in the [example repo](https://github.com/DooDesch-Mods/ScheduleOne-InkorporatedExample).

## Where files live

| Path | Content |
|------|---------|
| `UserData/Inkorporated/Packs/<Pack>/` | Your packs: folder, `manifest.json`, PNGs |
| `UserData/Inkorporated/Templates/` | UV reference textures. Only a DEBUG build writes them. |
| `UserData/MelonPreferences.cfg`, `[Inkorporated_01_Main]` | The `LoadExamplePack` toggle |

## Next

- [Pack format](/mods/inkorporated/guides/pack-format/)
- [Author a tattoo PNG](/mods/inkorporated/guides/authoring-tattoos/)
- [Multiplayer, saves and NPCs](/mods/inkorporated/guides/multiplayer-saves-and-npcs/)
- [Troubleshooting](/mods/inkorporated/guides/troubleshooting/)
- [API reference](/mods/inkorporated/api/)
