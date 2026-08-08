---
title: "Console Commands"
description: "Open the in-game console and use the `hotline` prefix."
sidebar:
  order: 5
---
Open the in-game console and use the `hotline` prefix.

## Overlay

- `hotline hud [on|off]` - show/hide the whole overlay (or press the master key, default F6).
- `hotline hud move <x> <y>` / `hotline hud font <n>` / `hotline hud reset` - position, text size, reset.

## Panels

- `hotline panels` - list every registered panel.
- `hotline panel <id> [on|off|move <x> <y>|size <w> <h>|reset]` - control one panel's window (also `overview`, `timeline`).
- `hotline act <actionId>` - run a panel action button.
- `hotline toggle <toggleId> [on|off]` - flip a panel toggle.
- `hotline slider <sliderId> [value]` - write a panel slider, or omit the value to read it back with its range
  and step. The value is clamped and snapped exactly as a drag would be. See [Sliders](/mods/hotline/guides/sliders/).
- `hotline log [<channel>|all] [n]` - read the logs.

## Hotkeys

- `hotline keys` - list the centrally-bound hotkeys.
- `hotline intercept [on|off|status]` - the auto-interception of other mods' function keys (status lists what was caught).
- `hotline intercept suppress [on|off]` - the full-takeover mode (raw key opens the overlay instead of the mod).
- `hotline key master <KeyCode>` - change the master overlay key (e.g. `hotline key master F4`).
- `hotline key press <KeyCode> [mod]` - inject a synthetic press of a caught key (to a specific mod, or all that poll it).

