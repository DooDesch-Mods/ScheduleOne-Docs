---
title: "Getting Started"
description: "1."
sidebar:
  order: 3
---
## Install

1. Install **MelonLoader 0.7.3+** for Schedule I.
2. Install **S1API** (ifBars/S1API_Forked) - its DLLs go in `Mods/` and `Plugins/` per its own instructions.
3. Drop **`Personnel.dll`** into your `…/Schedule I/Mods/` folder.
   (A Thunderstore mod manager like r2modman/Gale pulls MelonLoader + S1API in automatically.)

## See the format instantly: the bundled example pack

Personnel ships a small example pack, off by default. Turn it on to get two working NPC definitions plus a
manifest template to copy:

1. Set **`LoadExamplePack`** to `true` in
   `…/Schedule I/UserData/MelonPreferences.cfg` under `[Personnel_01_Main]`.
2. Restart the game.
3. Look in `…/Schedule I/UserData/Personnel/Packs/Examples/` - a complete pack you can copy.

(Enabling it never overwrites an existing `Examples` folder, so your edits are safe.)

## Check what loaded

The MelonLoader console/log lists every pack with the ids it provides:

```
[Personnel] Pack 'Examples' (Personnel Examples): 2 NPC(s) [examples_pale, examples_ashen].
[Personnel] Personnel 1.0.0 - 2 NPC def(s) from packs (2 total).
```

Those ids (`examples_pale`, ...) are what consumer mods reference - see [API Reference](/mods/personnel/api/).

## Make your first NPC

- **No code, comfortable:** use the in-game editor
  [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify) - design the NPC live on the menu
  character, hit Export, and copy the exported `Personnel/Packs/<name>` folder into
  `UserData/Personnel/Packs/`.
- **No code, by hand:** copy the example pack and edit its `manifest.json` - see [Pack Format](/mods/personnel/guides/pack-format/).
- **From a mod:** reference `Personnel.dll` and spawn definitions as real S1API NPCs - see [API Reference](/mods/personnel/api/).

## What Personnel does NOT do

Personnel only provides the definitions (and realises their appearance). It does not place NPCs into the
world by itself - that is the consumer mod's job (schedules, dialogue, spawn points). If you install only
Personnel + a pack and nothing consumes it, nothing visibly changes in-game; the definitions just load.

