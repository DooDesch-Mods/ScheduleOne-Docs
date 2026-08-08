---
title: "Installation"
description: "Install **Snitch** from Thunderstore via r2modman / the Thunderstore app."
sidebar:
  order: 1
---
## Requirements

| Requirement | Notes |
|---|---|
| Schedule I | the IL2CPP build |
| MelonLoader | 0.7.x |
| S1API | `ifBars-S1API_Forked` |

## Mod manager (recommended)

Install **Snitch** from Thunderstore via r2modman / the Thunderstore app. MelonLoader and S1API are pulled in
as dependencies automatically.

## Manual

1. Install [MelonLoader](https://melonwiki.xyz/) 0.7.x for Schedule I.
2. Install S1API (`ifBars-S1API_Forked`).
3. Drop `Snitch.dll` into the game's `Mods/` folder.
4. Launch the game. You should see a `Snitch ... - profiler.` line in the MelonLoader console.

## First run

Open the in-game developer console and type:

```
snitch start
```

That arms sampling. Press **F6** for the on-screen overlay, which the
[Hotline](https://github.com/DooDesch-Mods/ScheduleOne-Hotline) framework draws - install it too if you want
the in-game windows; without it Snitch still runs, reports to the console and serves the web dashboard. See [Console Commands](/mods/snitch/guides/console-commands/) for the rest, or
open the [Web Dashboard](/mods/snitch/guides/web-dashboard/) at [snitch.doodesch.de](https://snitch.doodesch.de).

## Settings

Settings live in `UserData/MelonPreferences.cfg` under `Snitch_01_Main` (or the in-game Mod Manager UI):
master switch, multiplayer behaviour, auto-start, HUD, provider poll rate, and the local data-server port
(`6140` by default, loopback only). The profiler is idle until you `snitch start`.

