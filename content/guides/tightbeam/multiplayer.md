---
title: "Multiplayer"
description: "Since 2.0.0, TightBeam works in co-op."
sidebar:
  order: 4
---
Since 2.0.0, TightBeam works in co-op. Everyone else's flashlight is a cone, aimed where they are
looking, with their own focus, brightness and colour.

## What you get

- **Cones instead of dots.** The base game shows another player's flashlight as a small point light on
  their body. TightBeam replaces it with the same beam you have, pointed the same way they are.
- **Their settings, not yours.** If they have TightBeam, their focus, brightness and colour come across
  live. Effects come across too, so a mod that flickers or blacks out their beam looks right to you.
- **Late joiners see the lights that are already on.** The base game never tells a joining player about a
  flashlight that was switched on before they arrived, so those players stay dark until the owner toggles.
  TightBeam carries that state itself and fixes it.
- **Players without the mod still get a cone**, drawn from your own default settings.

## Needs a Steam lobby

The sharing rides on the Steam lobby the game already uses, so it needs one. In a session without a Steam
lobby - a direct connect, a dedicated server, or single-player - other players still get proper cones,
aimed correctly, with your default settings. What you lose there is their individual focus, colour and
effects.

## Not everyone needs the mod

Nothing has to match. If you have TightBeam and nobody else does, you still see everyone with a proper
cone - you just see your defaults rather than their settings. If they have it too, you see exactly what
they see. Nothing is required of the host.

## Keeping a big lobby smooth

Lights are the expensive part, so TightBeam caps them rather than lighting everyone:

- at most `MaxRemoteBeams` at once (default `4`), nearest first
- nothing past `RemoteBeamMaxDistance` (default `70` m)
- nothing that is not on screen
- no shadows on other players' beams (`RemoteShadowNearest`, default `0`)

If frames get tight, drop `MaxRemoteBeams` first, then the distance. All of it is in
[Configuration](/mods/tightbeam/guides/configuration/).

## Turning it off

- `RemoteBeams = false` - stop drawing other players' cones. You still share yours.
- `SyncMyBeam = false` - stop sharing yours (your notice comes down straight away). You still see theirs.
- `RemoteBeamsForUnmoddedPlayers = false` - only draw cones for players who actually have TightBeam.
- `SuppressRemoteVanillaLights = false` - leave their vanilla light alone, so you see both.

## How it works, briefly

Where you are looking and whether your flashlight is on are things the game already sends to every
player, so TightBeam just reads them. It never sends a position or a rotation and never writes to the
game's own state.

Only the beam's shape and colour need sharing, and those go on a noticeboard rather than in messages:
each player writes their own beam into their own slot of the Steam lobby, and everyone running TightBeam
reads the others'. Nobody can write anyone else's slot, so there is no host and nothing to desync. Steam
hands a joining player the existing notices by itself, which is why late joiners just work.

**Players without the mod are not touched by any of this.** The game itself never reads or writes that
part of the lobby, so nothing runs on their machine because of you - no messages, no log lines, nothing.

Modders: see [Modder API](/mods/tightbeam/guides/modder-api/) for reading other players' beams.

