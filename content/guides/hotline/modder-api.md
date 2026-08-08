---
title: "Modder API"
description: "Hotline gives any mod a ready-made panel in the unified overlay, and it is a **zero-overhead no-op when Hotline"
sidebar:
  order: 2
---
Hotline gives any mod a ready-made panel in the unified overlay, and it is a **zero-overhead no-op when Hotline
is not installed** - so you can ship the integration unconditionally with no hard dependency. Full working
example: [ScheduleOne-HotlineExample](https://github.com/DooDesch-Mods/ScheduleOne-HotlineExample).

## Add the shim

- **Copy-in source (recommended):** drop `Hotline.cs` (from the example repo) into your mod project. It compiles
  into your DLL - nothing extra to ship.
- **Reference the DLL:** reference `Hotline.Api.dll`.

Both bind to the running Hotline host by reflection, so they share no type with it and work regardless of load
order (registrations queue until the host is up).

## Register a panel

```csharp
using Hotline.Api;   // Hud, Panel, HotlineKey, LogLevel

Hud.RegisterPanel("MyMod", "My Mod")
   .Text(() => "queue = " + _queue.Count)                  // a free, multi-line readout
   .Action("Reload", Reload)                               // a button (replaces a debug hotkey)
   .Toggle("Verbose", () => _verbose, v => _verbose = v)   // an on/off control
   .Slider("batch size", 1, 64, () => _batch, v => _batch = (int)v, 1)   // a draggable value
   .Hotkey("Reload", HotlineKey.F8, Reload)                // an optional central hotkey (Hotline polls it)
   .Log();                                                 // show this panel's log channel
```

That is the whole UI - no `OnGUI`, no uGUI, no per-mod hotkey. The player opens the overlay with the master key
(F6); your panel is a window there, toggled from the Overview (or `hotline panel MyMod on`).

## The builder

- `.Text(Func<string>)` - a multi-line readout, polled by Hotline a few times a second.
- `.Image(Func<int[]>)` - raw ARGB pixels (`{ width, height, argb0, argb1, ... }`) drawn in the panel, e.g. a QR
  code. Return null or an empty array for "nothing to show".
- `.Action(string label, Action run)` - a button; runs on the Unity main thread when clicked.
- `.Toggle(string label, Func<bool> get, Action<bool> set)` - an on/off control.
- `.Slider(string label, double min, double max, Func<double> get, Action<double> set, double step = 0, string unit = null)` -
  a draggable value. Hotline clamps to the range and snaps to the step before your setter sees it. See
  **[Sliders](/mods/hotline/guides/sliders/)**, including the id collision that eats controls.
- `.Hotkey(string label, HotlineKey key, Action run)` - bind a key centrally; Hotline owns the polling and flags
  conflicts. Pass `HotlineKey.None` to skip the key.
- `.Log()` - show this panel's log channel; send lines with `.Write("...")` or `Hud.Log("MyMod", "...")`.

The lower-level static calls
(`Hud.RegisterPanel/RegisterAction/RegisterToggle/RegisterSlider/RegisterText/RegisterImage/RegisterHotkey/Log`)
exist too if you prefer them to the builder.

## Already using a raw function key?

If your mod polls a raw `Input.GetKeyDown(KeyCode.Fx)`, Hotline auto-detects it and adds a button for it to your
panel anyway (see [Auto-Intercepted Hotkeys](/mods/hotline/guides/how-it-works/)). Registering a panel as above is the clean way and
gives you text, toggles, sliders and a log on top.

## Rules

- Call from the **Unity main thread**. Action/toggle/slider/text delegates are invoked by Hotline on the main
  thread, so they may safely touch game objects.
- Use your mod name as the panel id so an auto-detected hotkey lands in the same panel.
- Every call is a no-op when Hotline is absent; there is no hard dependency.

