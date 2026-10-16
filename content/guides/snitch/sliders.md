---
title: Add a slider
description: Tune a value by dragging it in your Snitch panel, in the overlay, the dashboard or the console.
sidebar:
  order: 2
---

Add a slider to your Snitch panel. You drag it in the overlay or the [web dashboard](/mods/snitch/guides/web-dashboard/), or write it with `snitch slider`.

This page uses the **Snitch** API (`Snitch.Api`). For the Hotline API, see the [Hotline slider guide](/mods/hotline/guides/sliders/).

**You need:** a Snitch panel. See [Profile your mod](/mods/snitch/guides/modder-api/).

## Steps

1. Call `Slider` on your panel, inside `SnitchProbe.Register()`.

   ```csharp
   using Snitch.Api;

   Panel p = Profiler.RegisterPanel("Yoink", "Yoink (Winch)");
   p.Slider("size", 0.2, 2.0, () => WinchItem.HeldScale, v => WinchItem.HeldScale = (float)v, 0.05, "x");
   p.Slider("pull force", 0, 60000, () => Preferences.PullNewtons, v => Preferences.PullNewtons = (float)v, 500, "N");
   ```

2. Pick a range wider than the values you expect. The ends are hard limits.
3. Give every slider in the panel a label that differs in its words. See "Label collisions" below.

The signature:

```csharp
Panel Slider(string label, double min, double max, Func<double> get, Action<double> set,
             double step = 0d, string unit = null)
```

| Parameter | Meaning |
|---|---|
| `label` | Text next to the value. It also makes the slider id. |
| `min` / `max` | Ends of the track. `max` must be greater than `min`. |
| `get` | Reads the current value on the main thread. |
| `set` | Applies a new value on the main thread. |
| `step` | Snap increment. `0` means continuous. |
| `unit` | Short suffix after the number, for example `m`, `N`, `deg`. Optional. |

The static form is `Profiler.RegisterSlider(panelId, label, min, max, get, set, step, unit)`.

Snitch clamps the value to `[min, max]` and snaps it to `step` before it calls `set`. Your setter needs no range check.

## Check it works

1. Run `snitch panels`. The panel lists one more slider.
2. Run `snitch slider Yoink:size`. It prints the value, range and step.
3. Run `snitch slider Yoink:size 0.85`. The game applies the clamped, snapped value.
4. Drag the slider in the overlay or the dashboard. Both use the same path.

![The Yoink (Winch) card in the web dashboard with the size slider at 1.00 x and the pull force slider at 20000.00 N](/img/guides/snitch/yoink-sliders.webp)

## Label collisions

A slider id is `<panelId>:<slug of the label>`. The slug keeps letters and digits, lowercases them and turns every other run of characters into one hyphen.

| Label | Id in panel `Yoink` |
|---|---|
| `size` | `Yoink:size` |
| `pull force` | `Yoink:pull-force` |
| `size -0.05` and `size +0.05` | both `Yoink:size-0-05` |

Two labels with the same id replace each other. No warning or log line appears, and the first control disappears. Use `size down` and `size up`, not `size -0.05` and `size +0.05`.

## Rules

- Register from the Unity main thread.
- A call is dropped silently if `max` is not greater than `min`, or if `get` or `set` is null.
- Registering the same id again replaces the slider. Running your probe twice is safe.
- Overlay, dashboard, phone remote and console all reach the same `set`. Write it so any of them can call it at any time.
- On a Snitch without sliders, the call is a no-op.

## Next

- [Console commands](/mods/snitch/guides/console-commands/)
- [Web dashboard](/mods/snitch/guides/web-dashboard/)
- [API reference](/mods/snitch/api/)
