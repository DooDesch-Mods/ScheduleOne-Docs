---
title: "Modder API"
description: "TightBeam exposes a small cross-mod control API so your mod can drive the player's flashlight - on/off, brightness, range, colour, dynamic Blink/Flicker/Pulse, and scoped per-field overrides."
sidebar:
  order: 1
---
TightBeam exposes a small cross-mod control API so your mod can drive the player's flashlight - on/off, brightness, range, colour, dynamic Blink/Flicker/Pulse, and scoped per-field overrides. **Every call is a zero-overhead no-op when TightBeam is not installed**, so you can ship it with no hard dependency and it just lights up when a player has TightBeam.

## Add the shim

Pick one:

- **Copy-in source (recommended):** copy the single file **[The Beam shim](/mods/tightbeam/guides/the-beam-shim/)** (`TightBeam.cs`, namespace `TightBeam.Api`) into your mod project. It is Unity-free and compiles into your DLL - nothing extra to ship.
- **Reference the DLL:** reference `TightBeam.Api.dll`.

The shim binds to the TightBeam host by reflection and shares no type with it (all data crosses as plain BCL types), so there is no hard dependency and load order does not matter - calls you make before TightBeam is ready are queued and flushed on bind.

## Quick start

```csharp
using TightBeam.Api;

// One-shot effects
Beam.Blink(3);                    // blink the beam 3 times (e.g. a low-battery stutter)
Beam.Flicker(0.35f, 6f, 11f);     // flicker at 35% depth for 6s at ~11 Hz
Beam.SetColorHex("#ff3030");      // tint the beam red

// Scoped, per-field override - dim + narrow the beam while the player is in your zone,
// then release it so the beam returns to the player's own settings.
using (var ov = Beam.BeginOverride("MyMod"))
{
    ov.SetIntensity(1f).SetSpotAngle(28f);
    // ... while in the zone ...
}   // Dispose() releases the override
```

## Reading state

| Member | Meaning |
|---|---|
| `bool Beam.Available` | `true` only when the TightBeam host is installed and bound. You rarely need this - the API is a safe no-op when absent. |
| `bool Beam.IsOn` | Is the flashlight currently on (the player's own flashlight state)? |
| `float Beam.Intensity` / `Beam.Range` / `Beam.SpotAngle` | The beam's current composited values. |
| `Beam.GetColor(out r, out g, out b, out a)` | The beam's current colour (0..1 floats). |
| `event Action<bool> Beam.OnToggled` | Fires whenever the flashlight transitions on/off (player key or any mod). |

## Driving the beam

Persistent changes to the player's base beam:

| Method | What it does |
|---|---|
| `Beam.TurnOn()` / `Beam.TurnOff()` / `Beam.Toggle()` / `Beam.SetOn(bool)` | Turn the flashlight on/off (drives the game's own flashlight). |
| `Beam.SetIntensity(float)` | Set base brightness (clamped to the configured Min/Max). |
| `Beam.SetRange(float meters)` | Pin the beam range until the player scrolls focus again. |
| `Beam.SetSpotAngle(float degrees)` | Pin the cone angle until the player scrolls focus again. |
| `Beam.SetColor(float r, float g, float b, float a = 1)` | Set the beam colour (0..1 floats). |
| `Beam.SetColorHex(string hex)` | Set the beam colour from `#RRGGBB` / `#RRGGBBAA`. |

## Dynamic effects

| Method | What it does |
|---|---|
| `Beam.Blink(int times, float intervalSeconds = 0.12f)` | Blink the beam N times. |
| `Beam.Flicker(float strength01, float durationSeconds, float frequencyHz = 14f)` | Smooth noise flicker for a duration. |
| `Beam.StopFlicker()` | Stop an active flicker early. |
| `Beam.Pulse(float amplitude01, float periodSeconds, float durationSeconds)` | Sine-pulse the brightness. Pass `float.PositiveInfinity` for the duration to pulse until stopped. |
| `Beam.StopPulse()` | Stop an active pulse. |
| `Beam.SetTemporaryIntensity(float value, float seconds, float fadeSeconds = 0.25f)` | Momentary brightness override that auto-restores after `seconds`. |
| `Beam.SetTemporaryColor(float r, float g, float b, float seconds, float a = 1, float fadeSeconds = 0.25f)` | Momentary colour override that auto-restores. |

## Scoped overrides (the recommended way to "hold" the beam)

`Beam.BeginOverride(string ownerId)` returns an `OverrideHandle` (a disposable struct). Set any field to hold it; clear or dispose to release it and let the player's own settings show through again. Overrides stack across mods - the newest non-null value per field wins.

| `OverrideHandle` member | What it does |
|---|---|
| `.SetIntensity(float)` / `.SetRange(float)` / `.SetSpotAngle(float)` / `.SetColor(r, g, b, a = 1)` | Hold that field (fluent - chainable). |
| `.ClearIntensity()` / `.ClearRange()` / `.ClearSpotAngle()` / `.ClearColor()` | Release just that field, keep the others. |
| `.Dispose()` | Release the whole override. Use `using (...)` or dispose on scope exit. |

```csharp
// A dark room that dims the beam while the player is inside.
var ov = Beam.BeginOverride("DarkRoom");
ov.SetIntensity(1.5f);
// ... later, when they leave ...
ov.Dispose();
```

## Reading the other players' beams (ABI 2+)

In co-op you can read what everyone else's flashlight is doing. Players are named by SteamID64, the same
value the game replicates as `Player.PlayerCode`.

| Member | What it gives you |
|---|---|
| `Beam.AbiVersion` | `0` when TightBeam is absent, `1` for a local-only host, `2` once the members below work. |
| `Beam.IsMultiplayer` | True in a session with at least one other player. |
| `Beam.LocalSteamId` | Your own id, or `0` before it is known. |
| `Beam.RemoteIds` | Every other player being tracked. Never null. |
| `Beam.RemoteHasTightBeam(id)` | Whether that player is sharing a beam. False means what you read below is a local default, not their real setting. |
| `Beam.TryGetRemote(id, out RemoteBeamState)` | Their beam as it is drawn: `IsOn`, `Intensity`, `Range`, `SpotAngle`, `R/G/B/A`. |
| `Beam.TryGetRemotePose(id, out px, py, pz, fx, fy, fz)` | Where that beam starts and which way it points. False when it is not currently drawn. |
| `Beam.IsRemoteRendered(id)` | Whether it is actually on screen, as opposed to lit but culled by distance or the beam cap. |
| `Beam.OnRemoteToggled` | `Action<ulong, bool>` - fires when another player's beam goes on or off. |

```csharp
// Is anyone shining a light at me?
foreach (var id in Beam.RemoteIds)
{
    if (!Beam.TryGetRemotePose(id, out var px, out var py, out var pz,
                                    out var fx, out var fy, out var fz)) continue;
    // ... dot the beam direction against the vector from that beam to the player ...
}
```

### There are no remote setters, on purpose

Every player is the sole author of their own beam, which is why there is nothing to fight over and nothing
to desync. **Drive the local beam exactly as you always have and the state replicates by itself** - a
blackout you apply through `BeginOverride` is what the other players see. Adding a way to write another
player's beam would introduce an authority question this design does not have.

## Rules

- Call all methods on the **Unity main thread**.
- Use a **stable, unique `ownerId`** for `BeginOverride` (your mod name) and always release it.
- Every call is a **no-op when TightBeam is absent** - you do not need to guard with `Beam.Available`.
- The contract is **additive-only** (currently ABI v2): members are never renamed or removed. An older shim
  works against a newer host, and a newer shim against an older host reports nothing for the members that
  host does not have - so you can compile against it safely either way.

