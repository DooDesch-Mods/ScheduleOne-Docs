---
title: "Installation"
description: "Install Hotline with r2modman or Gale from the Schedule I community."
sidebar:
  order: 1
---
## Recommended: a Thunderstore mod manager

Install Hotline with r2modman or Gale from the Schedule I community. Its only dependency (MelonLoader) is pulled
in automatically.

## Manual

1. Install **MelonLoader 0.7.3** for Schedule I (IL2CPP).
2. Drop **`Hotline.dll`** into your Schedule I `Mods/` folder.

Hotline has no other hard dependency - it does not use S1API.

## Settings

In `UserData/MelonPreferences.cfg` under `Hotline_01_Main`:

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master on/off. |
| `MasterHotkey` | `F6` | The key that opens/closes the overlay (any UnityEngine.KeyCode name). Reserved for Hotline. |
| `InterceptFunctionKeys` | `true` | Detect other mods' F1-F12 and add each as a button in that mod's panel. |
| `SuppressRawFunctionKeys` | `false` | Full takeover: a physical function key opens the overlay instead of reaching the mod. |
| `HudFontSize` | `12` | Overlay text size (px). |
| `ShowHud`, `HudX`, `HudY`, `WindowLayouts` | managed | Visibility, position and saved window layouts. |

