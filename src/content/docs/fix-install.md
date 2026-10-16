---
title: Fix a broken install
description: Find the mod that stops your game from loading or working, and report it so it gets fixed.
sidebar:
  order: 2
---

Find your symptom below. Check `Schedule I/MelonLoader/Latest.log` first: it lists every mod that loaded, every mod that failed, and the error.

## A mod does nothing

- A dependency is missing. Install everything the mod's page lists under "Requires".
- The log shows the mod failed to load. The error line under it names the cause.
- MelonLoader is older than 0.7.3. Update it.

## The game crashes or does not start

Find the mod by halving:

1. Disable half of your mods. Start the game.
2. If the problem is gone, it is in the disabled half. If not, it is in the enabled half.
3. Repeat with the half that has the problem. Five rounds find one mod out of thirty.

A mod manager disables mods per profile. By hand, move DLLs from `Mods/` to another folder.

## A mod broke after an update

- You updated the mod but not its dependencies. Update them together.
- The game updated. Read the mod's changelog for a fixed version.

## Report a bug

Open the support link on the mod's page and attach:

- `MelonLoader/Latest.log` as a file, not pasted in pieces
- the mod version and the game version
- singleplayer, host or client
- what you did right before the problem

A log helps much more than a screenshot.

## Ask a person

The [DooDesch Mods Discord](https://mods.doodesch.de) helps when the log does not tell you enough. Bring the log.
