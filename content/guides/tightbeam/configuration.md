---
title: "Configuration"
description: "Look up every TightBeam setting, its default and what it does."
sidebar:
  order: 3
---
Look up TightBeam settings. They are in `UserData/MelonPreferences.cfg` under `[TightBeam]`.

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master switch for the mod. |
| `FocusModifierKey` | `LeftAlt` | Hold it and scroll the mouse wheel to change focus. |
| `DefaultFocus` | `0.5` | Starting focus. `1` is a wide flood, `0` is a tight throw. |
| `DefaultIntensity` | `7` | Base brightness, clamped to Min/Max. |
| `MinIntensity` / `MaxIntensity` | `1` / `20` | Floor and ceiling for brightness. |
| `RangeWide` / `RangeNarrow` | `8` / `34` | Beam range in metres at each focus extreme. |
| `AngleWide` / `AngleNarrow` | `66` / `16` | Cone angle in degrees at each focus extreme. |
| `ColorHex` | `#E6F2FF` | Beam colour (cool white). |
| `CastShadows` | `true` | Walls block the beam. Turn off on weak machines. |

The same section has more settings for the focus feel: sensitivity, easing and flick threshold.

## Co-op

| Setting | Default | What it does |
|---|---|---|
| `RemoteBeams` | `true` | Draw other players' flashlights as TightBeam cones. |
| `MaxRemoteBeams` | `4` | Most other beams drawn at once, nearest first. `0` turns them off. |
| `RemoteBeamMaxDistance` | `70` | Metres past which a beam is not drawn. |
| `RemoteShadowNearest` | `0` | How many of the nearest remote beams cast shadows. |
| `RemoteSmoothingTau` | `0.08` | Smoothing of another player's aim. The game sends their camera about 10 times per second. |
| `RemoteBeamsForUnmoddedPlayers` | `true` | Also draw a cone for players without TightBeam, with your defaults. |
| `SuppressRemoteVanillaLights` | `true` | Hide their vanilla light while their cone shows. |
| `SyncMyBeam` | `true` | Share your beam's shape, colour and effects. |

## Notes

- There is no TightBeam toggle key. The beam follows the game's `FlashlightOn` state, so use your normal flashlight key.
- Brightness is not a player control. It stays at `DefaultIntensity`. Only mods change it, through the [API](/mods/tightbeam/guides/modder-api/).
