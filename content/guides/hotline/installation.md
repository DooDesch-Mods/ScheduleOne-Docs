---
title: Install Hotline
description: Install the Hotline overlay and open it with the F6 key.
sidebar:
  order: 5
---

Install Hotline and open the overlay with F6.

**You need:** the IL2CPP build of Schedule I and MelonLoader 0.7.3. See [Install](/install/) for MelonLoader. Hotline does not use S1API.

## Steps

1. With a Thunderstore mod manager (r2modman or Gale), install **Hotline**. MelonLoader comes as a dependency.
2. Without a manager, put `Hotline.dll` in your Schedule I `Mods/` folder.
3. Start the game.

## Check it works

Press **F6**. The overlay opens.

![The Hotline overlay with one button per mod panel: My Mod, Yoink (Winch), Snitch (Profiler), Sideload and Timeline (logs)](/img/guides/hotline/overlay.webp)

## Settings

Settings are in `UserData/MelonPreferences.cfg` under `Hotline_01_Main`.

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master on/off. |
| `MasterHotkey` | `F6` | Key that opens and closes the overlay. Any `UnityEngine.KeyCode` name. Hotline reserves it. |
| `InterceptFunctionKeys` | `true` | Detect other mods' F1-F12 keys and add each as a button in that mod's panel. |
| `SuppressRawFunctionKeys` | `false` | Full takeover: a physical function key opens the overlay instead of reaching the mod. |
| `HudFontSize` | `12` | Overlay text size in px. |
| `ShowHud`, `HudX`, `HudY`, `WindowLayouts` | managed | Visibility, position and saved window layouts. Hotline writes them. |

## Next

- [Console commands](/mods/hotline/guides/console-commands/)
- [Add a panel](/mods/hotline/guides/modder-api/)
