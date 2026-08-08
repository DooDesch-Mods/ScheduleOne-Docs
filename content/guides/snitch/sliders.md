---
title: "Sliders"
description: "Some values can only be judged by watching them move: how large a model sits in the hand, or how hard a winch"
sidebar:
  order: 5
---
Some values can only be judged by watching them move: how large a model sits in the hand, or how hard a winch
pulls. You find those by dragging, not by reasoning about a number. A slider puts one in your mod's panel as a
track you can grab, in the in-game overlay and in the [Web Dashboard](/mods/snitch/guides/web-dashboard/) alike.

## Register one

```csharp
using Snitch.Api;   // Profiler, Panel
using UnityEngine;  // Vector3

internal static class SnitchProbe
{
    public static void Register()
    {
        Panel p = Profiler.RegisterPanel("Yoink", "Yoink (Winch)");

        p.Slider("size", 0.2, 2.0, () => WinchItem.HeldScale, v => WinchItem.HeldScale = (float)v, 0.05, "x");

        p.Slider("rig height", -0.15, 0.15, () => WinchItem.RigOffset.y,
            v => WinchItem.RigOffset = new Vector3(WinchItem.RigOffset.x, (float)v, WinchItem.RigOffset.z), 0.005, "m");

        p.Slider("tool turn", 0, 360, () => WinchItem.HeldRotation.y,
            v => WinchItem.HeldRotation = new Vector3(WinchItem.HeldRotation.x, (float)v, WinchItem.HeldRotation.z), 5, "deg");

        p.Slider("pull force", 0, 60000, () => Preferences.PullNewtons, v => Preferences.PullNewtons = (float)v, 500, "N");
        p.Slider("max speed", 0.1, 12, () => Preferences.MaxSpeed, v => Preferences.MaxSpeed = (float)v, 0.25, "m/s");
    }
}
```

(from Yoink's winch panel, which uses sliders for every value that has to be framed by eye)

The signature:

```csharp
Panel Slider(string label, double min, double max, Func<double> get, Action<double> set,
             double step = 0d, string unit = null)
```

| Parameter | Meaning |
|---|---|
| `label` | printed next to the value, and the source of the slider id (see below) |
| `min` / `max` | the ends of the track. `max` must be greater than `min`, or the call is ignored |
| `get` | reads the current value; polled by the host on the main thread |
| `set` | applies a new value, on the main thread |
| `step` | snap increment. `0` means continuous |
| `unit` | short suffix printed after the number (`m`, `N`, `deg`). Optional |

The lower-level static form is
`Profiler.RegisterSlider(panelId, label, min, max, get, set, step, unit)`.

## The host owns the range

Snitch clamps to `[min, max]` and snaps to `step` **before** it calls your setter, whichever way the write
arrived - a drag in the overlay, a drag in the dashboard, a phone remote, or `snitch slider` in the console.
Your setter never sees a value outside the range it declared, so it does not have to defend itself:

```csharp
v => Preferences.PullNewtons = (float)v   // no clamping needed here
```

Give the range more room than the band you expect to use. A value you cannot reach costs you a rebuild; slack
at the ends costs nothing, because the ends are still hard limits.

## Where it shows up

Register once and the slider appears in three places:

- **The in-game overlay.** Snitch forwards your panel into [Hotline](https://github.com/DooDesch-Mods/ScheduleOne-Hotline),
  which draws the caption plus a filled track. The knob follows the cursor until you release the button, even
  once the pointer has left the track or the window.
- **The web dashboard.** A real range input inside your mod's panel card. While you drag, the knob follows your
  pointer rather than the incoming snapshot, so it cannot stutter backwards against the stream; on release the
  game's own reading takes over, which is also what shows you a clamp or a snap the host applied.
- **The phone remote.** The same control as a large touch target, so you can tune from your phone while the
  game has the desktop.

## From the console

```
snitch slider <sliderId>          read the value, its range and its step
snitch slider <sliderId> 0.85     write it (clamped and snapped like any other write)
```

This matters more than it looks. A slider is a mouse control, and no automated harness can drag a mouse. The
console command is the same value reachable by typing, which keeps a tuning session reproducible and lets a
value you found by eye be read back and written into your defaults.

`snitch panels` reports how many sliders each panel holds.

## Ids come from the label, and they collide

A slider's id is `<panelId>:<slug of the label>`. Slugging keeps letters and digits, lowercases them, and turns
every other run of characters into a single hyphen:

| Label | Id in panel `Yoink` |
|---|---|
| `size` | `Yoink:size` |
| `pull force` | `Yoink:pull-force` |
| `rig height` | `Yoink:rig-height` |

Punctuation is dropped, and that is where it bites. **Two labels that differ only in punctuation produce the
same id, and the second registration silently replaces the first.** No warning, no error, no log line: the
control is simply not there any more.

```
"size -0.05"  ->  size-0-05
"size +0.05"  ->  size-0-05     same id, so this one wins and the first vanishes
```

That exact pair shipped once and removed half a panel's controls before anyone noticed the count was short.
Make every label in a panel differ in its **words**, not in its symbols: `size down` and `size up` rather than
`size -0.05` and `size +0.05`.

## Rules

- Register from the **Unity main thread**. `get` and `set` are invoked there too, so they may touch game objects.
- `max` must be greater than `min`, and both `get` and `set` are required. Anything else is dropped silently.
- Re-registering the same id replaces the slider, so re-running your probe is safe.
- Every call is a no-op when Snitch is absent, and on a Snitch older than the one that added sliders.
- Actions, toggles and sliders all reach the same code from the overlay, the dashboard and the console. Write
  the setter so it tolerates being called from any of them at any time.

