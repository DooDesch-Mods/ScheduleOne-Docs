---
title: "Control the flashlight"
description: "Switch the player's flashlight, change its brightness and colour, and add effects from your own mod."
sidebar:
  order: 1
---
Drive the player's flashlight from your mod. Every call does nothing when TightBeam is not installed, so you need no hard dependency.

**You need:** a MelonLoader mod project.

## Steps

1. Copy [the shim file](/mods/tightbeam/guides/the-beam-shim/) (`TightBeam.cs`, namespace `TightBeam.Api`) into your project. It has no Unity references and compiles into your DLL. You can reference `TightBeam.Api.dll` instead.

2. Call the API from the Unity main thread.

   ```csharp
   using TightBeam.Api;

   Beam.Blink(3);                    // blink 3 times
   Beam.Flicker(0.35f, 6f, 11f);     // 35% depth, 6 s, about 11 Hz
   Beam.SetColorHex("#ff3030");      // tint the beam red
   ```

3. To hold a value while the player is in a zone, use a scoped override. Give it a stable, unique owner id (your mod name).

   ```csharp
   using (var ov = Beam.BeginOverride("MyMod"))
   {
       ov.SetIntensity(1f).SetSpotAngle(28f);
       // ... while the player is in the zone ...
   }   // Dispose() releases the override
   ```

4. Always release the override. Then the beam returns to the player's own settings.

Calls made before TightBeam is ready are queued and run when it binds. Load order does not matter.

## Check it works

Install TightBeam, load a save and run your code. The beam blinks, flickers or changes colour. Without TightBeam, nothing happens and no error appears.

## Read state

| Member | Meaning |
|---|---|
| `bool Beam.Available` | `true` when TightBeam is installed and bound. You rarely need it. |
| `bool Beam.IsOn` | The flashlight is on. |
| `float Beam.Intensity` / `Range` / `SpotAngle` | Current composited values. |
| `Beam.GetColor(out r, out g, out b, out a)` | Current colour, floats 0..1. |
| `event Action<bool> Beam.OnToggled` | Fires when the flashlight goes on or off, by key or by any mod. |

## Change the base beam

| Method | What it does |
|---|---|
| `Beam.TurnOn()` / `TurnOff()` / `Toggle()` / `SetOn(bool)` | Switch the game's own flashlight. |
| `Beam.SetIntensity(float)` | Base brightness, clamped to the configured Min/Max. |
| `Beam.SetRange(float meters)` | Pin the range until the player scrolls focus. |
| `Beam.SetSpotAngle(float degrees)` | Pin the cone angle until the player scrolls focus. |
| `Beam.SetColor(float r, float g, float b, float a = 1)` | Set the colour, floats 0..1. |
| `Beam.SetColorHex(string hex)` | Set the colour from `#RRGGBB` or `#RRGGBBAA`. |

## Effects

| Method | What it does |
|---|---|
| `Beam.Blink(int times, float intervalSeconds = 0.12f)` | Blink N times. |
| `Beam.Flicker(float strength01, float durationSeconds, float frequencyHz = 14f)` | Smooth noise flicker. |
| `Beam.StopFlicker()` | Stop the flicker. |
| `Beam.Pulse(float amplitude01, float periodSeconds, float durationSeconds)` | Sine pulse of the brightness. Use `float.PositiveInfinity` to pulse until stopped. |
| `Beam.StopPulse()` | Stop the pulse. |
| `Beam.SetTemporaryIntensity(float value, float seconds, float fadeSeconds = 0.25f)` | Brightness override that restores after `seconds`. |
| `Beam.SetTemporaryColor(float r, float g, float b, float seconds, float a = 1, float fadeSeconds = 0.25f)` | Colour override that restores after `seconds`. |

## Scoped overrides

`Beam.BeginOverride(string ownerId)` returns an `OverrideHandle`. Overrides from several mods stack. For each field, the newest non-null value wins.

| `OverrideHandle` member | What it does |
|---|---|
| `.SetIntensity(float)` / `.SetRange(float)` / `.SetSpotAngle(float)` / `.SetColor(r, g, b, a = 1)` | Hold that field. Chainable. |
| `.ClearIntensity()` / `.ClearRange()` / `.ClearSpotAngle()` / `.ClearColor()` | Release one field. |
| `.Dispose()` | Release the whole override. |

## Read other players' beams

Needs ABI 2. Players are identified by SteamID64, the same value as `Player.PlayerCode`.

| Member | What it gives you |
|---|---|
| `Beam.AbiVersion` | `0` without TightBeam, `1` for a local-only host, `2` when the members below work. |
| `Beam.IsMultiplayer` | `true` with at least one other player. |
| `Beam.LocalSteamId` | Your own id, or `0` if not yet known. |
| `Beam.RemoteIds` | Every tracked remote player. Never null. |
| `Beam.RemoteHasTightBeam(id)` | `false` means the values you read are local defaults, not their settings. |
| `Beam.TryGetRemote(id, out RemoteBeamState)` | Their drawn beam: `IsOn`, `Intensity`, `Range`, `SpotAngle`, `R/G/B/A`. |
| `Beam.TryGetRemotePose(id, out px, py, pz, fx, fy, fz)` | Beam start and direction. `false` when the beam is not drawn. |
| `Beam.IsRemoteRendered(id)` | The beam is on screen, not culled by distance or the beam cap. |
| `Beam.OnRemoteToggled` | `Action<ulong, bool>`. Fires when another player's beam goes on or off. |

```csharp
foreach (var id in Beam.RemoteIds)
{
    if (!Beam.TryGetRemotePose(id, out var px, out var py, out var pz,
                                    out var fx, out var fy, out var fz)) continue;
    // compare the beam direction with the vector from the beam to the player
}
```

There are no remote setters. Each player owns their own beam. To change what others see, change your local beam: an override from `BeginOverride` replicates by itself.

## Rules

- Call every method on the Unity main thread.
- Use a stable, unique `ownerId` and always release it.
- The API is additive-only (current ABI 2). An older shim works with a newer host. A newer shim reports nothing for members an older host lacks.

## Next

- [The shim file](/mods/tightbeam/guides/the-beam-shim/)
- [Multiplayer](/mods/tightbeam/guides/multiplayer/)
- [API reference](/mods/tightbeam/api/)
