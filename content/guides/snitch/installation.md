---
title: Install Snitch
description: Install the Snitch profiler and start sampling from the Schedule I developer console.
sidebar:
  order: 5
---

Install Snitch, then start sampling from the developer console.

**You need:** the IL2CPP build of Schedule I, MelonLoader 0.7.x and S1API (`ifBars-S1API_Forked`). See [Install](/install/) for MelonLoader.

## Steps

1. With a mod manager (r2modman or the Thunderstore app), install **Snitch**. MelonLoader and S1API come as dependencies.
2. Without a manager, install MelonLoader and S1API, then put `Snitch.dll` in the game's `Mods/` folder.
3. Optional: install [Hotline](https://github.com/DooDesch-Mods/ScheduleOne-Hotline) for the in-game windows. Without it, Snitch still runs, reports to the console and serves the web dashboard.
4. Start the game and open the developer console.
5. Run `snitch start`.

## Check it works

- The MelonLoader console shows `Snitch v... - profiler.` at startup.
- `snitch status` prints a one-line summary.
- With Hotline installed, **F6** opens the overlay.

## Settings

Settings are in `UserData/MelonPreferences.cfg` under `Snitch_01_Main`, or in the in-game Mod Manager UI.

They cover the master switch, multiplayer behavior, auto-start, HUD, provider poll rate and the local data server. The server port is `6140` and listens on loopback only.

## Next

- [Console commands](/mods/snitch/guides/console-commands/)
- [Open the web dashboard](/mods/snitch/guides/web-dashboard/)
- [Troubleshooting](/mods/snitch/guides/troubleshooting/)
