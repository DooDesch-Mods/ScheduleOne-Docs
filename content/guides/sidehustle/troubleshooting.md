---
title: Troubleshoot Side Hustle
description: Find the cause and fix when the hub, your gamemode row or a multiplayer join does not work.
sidebar:
  order: 6
---

Find your symptom below. Check `MelonLoader/Latest.log` first.

## The hub does not open in the main menu

- Side Hustle did not load. The log must show `Side Hustle <version> ready - N gamemode(s) registered so far.` If not, put `SideHustle.dll` in `Mods` and install MelonLoader and S1API.
- The hub page needs Sideload. Without a Sideload that can mount surfaces, the classic hub shows instead.
- `Enabled` is off. Set it to `true` under `[SideHustle_01_Main]` in `UserData/MelonPreferences.cfg`.
- You pressed Esc on the hub. The plain menu keeps a "Side Hustle" entry that opens it again.

## My gamemode is not in the list

- No `Gamemode registered: '<Name>' (<id>).` line in the log. Call `API.Register` in `OnInitializeMelon`.
- The log shows a JIT or `TypeLoadException` error from your `MelonMod` class. Move every Side Hustle type out of that class. See [Add a gamemode](/mods/sidehustle/guides/getting-started/).
- Two gamemodes use the same `Id`. The second one replaces the first. Give each gamemode its own `Id`.

## Clicking Host, Join or Solo does nothing

- The callback for that button is null. Solo needs `OnLaunchSingleplayer`. Host and Join need `OnHostMultiplayer` and `OnJoinMultiplayer`.
- Your callback throws. The exception is in the log.

## The menu does not come back after my gamemode

Call `ctx.ReturnToHub()` when your mode ends. Remove your own overlay in `OnExitToHub`.

## My icon does not show

- The resource name is wrong. The log lists the resource names your assembly has.
- Name the resource `<AssemblyName>.hub-icon.png`. Set `LogicalName` in the csproj, or the build adds the folder to the name.

## A joiner times out while the world loads

- Builds differ. Everyone must run the same build of the gamemode. Side Hustle warns on the lobby card and in the log.
- Mod sets differ. A mod that adds networked objects on one side only can stall the world sync. Host with "Required mods only" when the gamemode has a mod policy.

## A joiner never gets my mod installed

See [Make your mod sync to other players](/mods/sidehustle/guides/mod-sync/). The usual causes:

- `downloadLink` is not set, or it is not an `https` link.
- No GitHub release has a tag that matches the `MelonInfo` version.
- The released DLL is not the same file the host runs. The hash check refuses it.

## A non-friend drops out about ten seconds after joining

The game kicks players who are not on the host's friends list. Side Hustle removes this kick while you host a Side Hustle lobby.
On the host, the log shows `[mp] public-lobby access installed (non-friends may join a hosted lobby).`
Co-op that you start outside Side Hustle keeps the friends-only rule.
