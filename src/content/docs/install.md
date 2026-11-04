---
title: Install mods
description: Install a DooDesch Schedule I mod with a mod manager or by hand.
sidebar:
  order: 1
---

Install a mod and everything it needs. A mod manager does it in one click.

## With Nexus Mods

1. Open the mod's page on [Nexus Mods](https://www.nexusmods.com/games/schedule1/mods) and download it with Vortex, or as a zip.
2. Vortex installs it into Schedule I. For a zip, follow "By hand" below.
3. Install the mods the page lists under "Requires" the same way.

Each mod page links to its Nexus page.

## With a Thunderstore mod manager

1. Install [r2modman](https://thunderstore.io/c/schedule-i/p/ebkr/r2modman/) or [Gale](https://thunderstore.io/c/schedule-i/p/Kesomannen/GaleModManager/).
2. Select Schedule I and create a profile.
3. Search the mod and click Install. The manager also installs MelonLoader, S1API and every other dependency.
4. Start the game from the manager.

Each mod page also links to its Thunderstore package.

## By hand

1. Install MelonLoader 0.7.3 or newer from [github.com/LavaGang/MelonLoader](https://github.com/LavaGang/MelonLoader/releases). Use only this source.
2. Start the game once. MelonLoader creates its folders. Close the game.
3. Put the mod's `.dll` into `Schedule I/Mods/`.
4. Install every mod that the mod's page lists under "Requires" in the same way.

## Check it works

Open `Schedule I/MelonLoader/Latest.log`. The mod is in the list of loaded mods.

## Update a mod

Update the mod and its dependencies together. A mod that needs a newer dependency can load and then fail later.
After a game update, read the mod's changelog before you report a bug.

## Next

- [Fix a broken install](/fix-install/)
- [All mods](/mods/)
