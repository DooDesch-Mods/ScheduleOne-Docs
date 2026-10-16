---
title: Console commands
description: Look up every hotline console command with its arguments and effect.
sidebar:
  order: 3
---

Look up a `hotline` command here. Open the in-game console and type it.

## Overlay

| Command | What it does |
|---|---|
| `hotline hud [on\|off]` | Show or hide the overlay. The master key (default F6) does the same. |
| `hotline hud move <x> <y>` | Move the overlay. |
| `hotline hud font <n>` | Set the text size. |
| `hotline hud reset` | Reset the overlay. |

## Panels

| Command | What it does |
|---|---|
| `hotline panels` | List every registered panel. |
| `hotline panel <id> [on\|off\|move <x> <y>\|size <w> <h>\|reset]` | Control one panel window. Built-in ids: `overview`, `timeline`. |
| `hotline act <actionId>` | Run a panel action button. |
| `hotline toggle <toggleId> [on\|off]` | Flip a panel toggle. |
| `hotline slider <sliderId> [value]` | Write a panel slider. Omit the value to read it with its range and step. The host clamps and snaps it like a drag. See [Add a slider](/mods/hotline/guides/sliders/). |
| `hotline log [<channel>\|all] [n]` | Read the logs. |

## Hotkeys

| Command | What it does |
|---|---|
| `hotline keys` | List the centrally bound hotkeys. |
| `hotline intercept [on\|off\|status]` | Turn interception of other mods' function keys on or off. `status` lists the caught keys. |
| `hotline intercept suppress [on\|off]` | Full takeover: the raw key opens the overlay instead of reaching the mod. |
| `hotline key master <KeyCode>` | Change the master overlay key, for example `hotline key master F4`. |
| `hotline key press <KeyCode> [mod]` | Send a synthetic press of a caught key to one mod, or to all mods that poll it. |
