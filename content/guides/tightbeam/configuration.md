---
title: "Configuration"
description: "Settings live in `UserData/MelonPreferences.cfg` under `[TightBeam]`."
sidebar:
  order: 3
---
Settings live in `UserData/MelonPreferences.cfg` under `[TightBeam]`.

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master on/off for the whole mod. |
| `FocusModifierKey` | `LeftAlt` | Hold this and scroll the mouse wheel to change focus. |
| `DefaultFocus` | `0.5` | Starting focus. `1` = wide flood, `0` = tight throw. |
| `DefaultIntensity` | `7` | Base brightness (clamped to Min/Max). |
| `MinIntensity` / `MaxIntensity` | `1` / `20` | Hard floor / ceiling for brightness. |
| `RangeWide` / `RangeNarrow` | `8` / `34` | Beam range (m) at each focus extreme. |
| `AngleWide` / `AngleNarrow` | `66` / `16` | Cone angle (deg) at each focus extreme. |
| `ColorHex` | `#E6F2FF` | Beam colour (cool white). |
| `CastShadows` | `true` | Soft shadows so the beam is blocked by walls (turn off on low-end machines). |

There are more fine-tuning knobs for the focus feel (sensitivity, easing, flick threshold) in the same section if you want to dial it in.

## Co-op

| Setting | Default | What it does |
|---|---|---|
| `RemoteBeams` | `true` | Show the other players' flashlights as TightBeam cones. |
| `MaxRemoteBeams` | `4` | Most other beams drawn at once, nearest first. `0` turns them off. |
| `RemoteBeamMaxDistance` | `70` | Metres beyond which another player's beam is not drawn. |
| `RemoteShadowNearest` | `0` | How many of the nearest remote beams may cast shadows. `0` keeps a full lobby smooth. |
| `RemoteSmoothingTau` | `0.08` | Smoothing on another player's aim. The game replicates their camera about 10x/sec, so without this the cone steps visibly. |
| `RemoteBeamsForUnmoddedPlayers` | `true` | Also draw a cone for players without TightBeam, using your defaults. Turn off to leave their vanilla light alone. |
| `SuppressRemoteVanillaLights` | `true` | Turn off their vanilla flashlight light while their cone is shown, so you never see both. |
| `SyncMyBeam` | `true` | Share your own beam's shape, colour and effects with the others. |

If a big lobby costs you frames, drop `MaxRemoteBeams` first, then `RemoteBeamMaxDistance`. Leave
`RemoteShadowNearest` at `0` unless you want a teammate's beam to cast shadows of its own.

## Notes

- **On/off is the game's own flashlight.** There is no separate TightBeam toggle key - the beam follows the game's `FlashlightOn` state, so it is always in sync and you use your normal flashlight key.
- **Brightness is not a player control.** It rests at `DefaultIntensity` (bounded by Min/Max); only mods can change it, via the [Modder API](/mods/tightbeam/guides/modder-api/).

