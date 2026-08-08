---
title: "Sliders"
description: "Some values can only be judged by watching them move: how large a model sits in the hand, or how hard a winch"
sidebar:
  order: 3
---
Some values can only be judged by watching them move: how large a model sits in the hand, or how hard a winch
pulls. You find those by dragging, not by reasoning about a number. A slider puts one in your mod's panel as a
track you can grab.

## Register one

```csharp
using Hotline.Api;   // Hud, Panel
using UnityEngine;   // Vector3

Hud.RegisterPanel("Yoink", "Yoink (Winch)")
   .Slider("size", 0.2, 2.0, () => WinchItem.HeldScale, v => WinchItem.HeldScale = (float)v, 0.05, "x")
   .Slider("rig height", -0.15, 0.15, () => WinchItem.RigOffset.y,
           v => WinchItem.RigOffset = new Vector3(WinchItem.RigOffset.x, (float)v, WinchItem.RigOffset.z), 0.005, "m")
   .Slider("pull force", 0, 60000, () => Preferences.PullNewtons, v => Preferences.PullNewtons = (float)v, 500, "N")
   .Slider("tool turn", 0, 360, () => WinchItem.HeldRotation.y,
           v => WinchItem.HeldRotation = new Vector3(WinchItem.HeldRotation.x, (float)v, WinchItem.HeldRotation.z), 5, "deg");
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
| `get` | reads the current value; called on the main thread while the panel is drawn |
| `set` | applies a new value, on the main thread |
| `step` | snap increment. `0` means continuous |
| `unit` | short suffix printed after the number (`m`, `N`, `deg`). Optional |

The lower-level static form is `Hud.RegisterSlider(panelId, label, min, max, get, set, step, unit)`.

## The host owns the range

Hotline clamps to `[min, max]` and snaps to `step` **before** it calls your setter, whichever way the write
arrived - a drag in the overlay or `hotline slider` in the console. Your setter never sees a value outside the
range it declared, so it does not have to defend itself:

```csharp
v => Preferences.PullNewtons = (float)v   // no clamping needed here
```

Give the range more room than the band you expect to use. A value you cannot reach costs you a rebuild; slack
at the ends costs nothing, because the ends are still hard limits.

## What it looks like

The panel draws a caption carrying the label and the live value, with a filled track under it. Grab the track
and the knob follows the cursor until you release the button, even once the pointer has left the track or the
window, so a drag never dies halfway. Printed decimals follow the step, so a `0.005` slider does not read `0`
for most of its travel.

## From the console

```
hotline slider <sliderId>          read the value, its range and its step
hotline slider <sliderId> 0.85     write it (clamped and snapped like any other write)
```

This matters more than it looks. A slider is a mouse control, and no automated harness can drag a mouse. The
console command is the same value reachable by typing, which keeps a tuning session reproducible and lets a
value you found by eye be read back and written into your defaults.

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
- Every call is a no-op when Hotline is absent, and on a Hotline older than the one that added sliders.

