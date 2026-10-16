---
title: Add a panel
description: Give your mod a panel in the Hotline overlay with text, buttons, toggles and sliders.
sidebar:
  order: 1
---

Give your mod its own panel in the Hotline overlay. Players open the overlay with F6 and see your panel as a window. You write no `OnGUI` and no uGUI.

**You need:** Hotline in your test game and a MelonLoader mod project. Players do not need Hotline: every call is a no-op without it.

## Steps

1. Copy `Hotline.cs` from [ScheduleOne-HotlineExample](https://github.com/DooDesch-Mods/ScheduleOne-HotlineExample) into your project. It compiles into your DLL. You can reference `Hotline.Api.dll` instead.
2. Register a panel. Use your mod name as the panel id.

   ```csharp
   using Hotline.Api;   // Hud, Panel, HotlineKey, LogLevel

   Hud.RegisterPanel("MyMod", "My Mod")
      .Text(() => "queue = " + _queue.Count)
      .Action("Reload", Reload)
      .Toggle("Verbose", () => _verbose, v => _verbose = v)
      .Slider("batch size", 1, 64, () => _batch, v => _batch = (int)v, 1)
      .Hotkey("Reload", HotlineKey.F8, Reload)
      .Log();
   ```

3. Optional: put the registration in a static class named `HotlineProbe` with a static `Register()` method. Hotline finds and calls it, so you wire nothing into `OnInitializeMelon`.

## Check it works

1. Start the game and press F6. The overlay opens.
2. Open your panel from the Overview window, or run `hotline panel MyMod on`.
3. Run `hotline panels`. `MyMod` is in the list.

## Builder methods

| Method | Result |
|---|---|
| `.Text(Func<string>)` | Multi-line readout, polled a few times a second. |
| `.Image(Func<int[]>)` | Raw ARGB pixels, for example a QR code. Use `{ width, height, argb0, argb1, ... }`. Return null or an empty array to show nothing. |
| `.Action(string label, Action run)` | Button. Runs on the main thread. |
| `.Toggle(string label, Func<bool> get, Action<bool> set)` | On/off control. |
| `.Slider(string label, double min, double max, Func<double> get, Action<double> set, double step = 0, string unit = null)` | Draggable value. See [Add a slider](/mods/hotline/guides/sliders/). |
| `.Hotkey(string label, HotlineKey key, Action run)` | Central hotkey. Hotline polls it and flags conflicts. `HotlineKey.None` skips the key. |
| `.Log()` | Show the panel's log channel. Write with `.Write("...")` or `Hud.Log("MyMod", "...")`. |

Static calls exist too: `Hud.RegisterPanel`, `RegisterAction`, `RegisterToggle`, `RegisterSlider`, `RegisterText`, `RegisterImage`, `RegisterHotkey`, `Log`.

## Rules

- Call the API from the Unity main thread. Hotline runs your delegates on the main thread, so they may use game objects.
- Registrations made before Hotline loads are queued. Load order does not matter.
- Your mod may poll a raw `Input.GetKeyDown(KeyCode.Fx)`. Hotline then adds a button for it to the panel with the same id as your mod name. See [How hotkey interception works](/mods/hotline/guides/how-it-works/).

## Next

- [Add a slider](/mods/hotline/guides/sliders/)
- [Console commands](/mods/hotline/guides/console-commands/)
- [API reference](/mods/hotline/api/)
