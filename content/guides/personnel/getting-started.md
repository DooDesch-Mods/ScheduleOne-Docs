---
title: Make an NPC pack
description: Write a manifest.json that adds your own NPC to Schedule I, with no code.
sidebar:
  order: 1
---

Write a pack folder with one `manifest.json`. Personnel loads it and spawns your NPC in the world.

**You need:** Personnel and S1API installed. See [Install](/install/) for MelonLoader, S1API and the mod DLL.

## Steps

1. Create the folder `Schedule I/UserData/Personnel/Packs/MyPack/`.
2. Create `manifest.json` in that folder:
   ```json
   {
     "name": "My Pack",
     "author": "you",
     "autoRegister": true,
     "npcs": [
       {
         "id": "mypack_pale",
         "name": "Pale",
         "appearance": { "skinColor": "#8899AA", "hairPath": "Avatar/Hair/Spiky/Spiky" },
         "spawn": { "x": -66.4, "y": -2.9, "z": 86.1, "rotationY": 145, "region": "Westville", "physical": true }
       }
     ]
   }
   ```
3. Set the spawn point. Stand where the NPC must appear. Enable the console in Settings, press the backtick key, and run `personnel spawn`. Paste the result into `spawn`.
4. Optional: add a `schedule`. Walk to each stop and run `personnel route 07:00`. Then run `personnel route show` and paste the steps into `"schedule": [ ... ]`.
5. Restart the game. Pack changes need a restart.

To start from a working pack, set `LoadExamplePack` to `true` under `[Personnel_01_Main]` in `UserData/MelonPreferences.cfg`. Restart. Personnel writes `UserData/Personnel/Packs/Examples/`. It never overwrites an existing folder.

To design the look in a live editor, use [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify). Export the pack and copy the `Personnel/Packs/<name>` folder into `UserData/Personnel/Packs/`.

## Check it works

`MelonLoader/Latest.log` lists each pack with its ids:

```
[Personnel] Pack 'MyPack' (My Pack): 1 NPC(s) [mypack_pale].
```

In game, the NPC stands at the spawn point.

If you do not set `autoRegister`, Personnel only loads the definitions. A mod must then spawn them through the [API](/mods/personnel/api/).

## Next

- [Pack format](/mods/personnel/guides/pack-format/)
- [Custom PNG layers](/mods/personnel/guides/custom-png-layers/)
- [Multiplayer and saves](/mods/personnel/guides/multiplayer-and-saves/)
- [Troubleshooting](/mods/personnel/guides/troubleshooting/)
- [API reference](/mods/personnel/api/)
