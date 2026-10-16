---
title: "Use TightBeam in co-op"
description: "See other players' flashlights as aimed cones and tune the cost for big lobbies."
sidebar:
  order: 4
---
In co-op, every other flashlight is a cone aimed where that player looks. Nobody else needs the mod.

## What you get

- The base game shows another player's flashlight as a small point light. TightBeam replaces it with a cone like yours.
- If the other player has TightBeam, you see their focus, brightness, colour and effects live.
- Players without TightBeam still get a cone, drawn with your default settings.
- Players who join late see flashlights that are already on. The base game leaves those dark until the owner toggles.

Sharing settings needs a Steam lobby. In a direct connect, on a dedicated server or in single-player, cones are still aimed correctly but use your defaults.

## Steps

1. If a big lobby costs frames, lower `MaxRemoteBeams` (default `4`).
2. If it still costs frames, lower `RemoteBeamMaxDistance` (default `70` m).
3. Keep `RemoteShadowNearest` at `0` (no shadows on other players' beams).

TightBeam never draws a beam that is off screen. Settings are in [Configuration](/mods/tightbeam/guides/configuration/).

## Turn parts off

- `RemoteBeams = false`: do not draw other players' cones. You still share yours.
- `SyncMyBeam = false`: do not share your beam. You still see theirs.
- `RemoteBeamsForUnmoddedPlayers = false`: draw cones only for players with TightBeam.
- `SuppressRemoteVanillaLights = false`: keep their vanilla light, so you see both.

## Check it works

Join a lobby with a second player. Their flashlight shows as a cone that follows their aim.

## How it syncs

The game already sends look direction and flashlight state to every player, and TightBeam reads them. Beam shape and colour go into your own slot in the Steam lobby data. Others read it. Nobody can write another player's slot, so there is no host role and nothing to desync. Players without the mod run nothing because of you.

## Next

- [Control the flashlight](/mods/tightbeam/guides/modder-api/) (read other players' beams)
- [Configuration](/mods/tightbeam/guides/configuration/)
