---
title: Profile your mod
description: Show your mod's timings, counters and controls in the Snitch overlay and web dashboard.
sidebar:
  order: 1
---

Add a Snitch panel to your mod. It shows your counters, state bars, buttons, toggles, sliders and log in the overlay and the web dashboard.

Snitch times `OnUpdate`, `OnFixedUpdate`, `OnLateUpdate` and `OnGUI` of every loaded mod without any code. Your mod already appears as `<YourMod>.OnUpdate`. Follow the steps only if you want more.

**You need:** Snitch in your test game and a MelonLoader mod project. Players do not need Snitch: every call is a no-op without it.

## Steps

1. Copy `Snitch.cs` from [ScheduleOne-SnitchExample](https://github.com/DooDesch-Mods/ScheduleOne-SnitchExample) into your project. It compiles into your DLL. You can reference `Snitch.Api.dll` instead.
2. Add a static class named `SnitchProbe` with a static `Register()` method. Snitch finds and calls it. You do not call it yourself.
3. Register a panel in `Register()` and add controls.

   ```csharp
   using Snitch.Api;   // Profiler, Panel, StateSnapshot

   internal static class SnitchProbe
   {
       public static void Register()
       {
           Panel p = Profiler.RegisterPanel("MyMod", "My Mod");
           p.Counter("QueueLength", () => MyMod.Queue.Count, "items");
           p.State("Jobs", () => new StateSnapshot { Title = "Jobs" }
               .Add("running", MyMod.Running).Add("queued", MyMod.Queued));
           p.Text(() => $"mode: {MyMod.Mode}");
           p.Action("Flush queue", () => MyMod.Flush());
           p.Toggle("Verbose", () => MyMod.Verbose, v => MyMod.Verbose = v);
           p.Slider("batch size", 1, 64, () => MyMod.Batch, v => MyMod.Batch = (int)v, 1);
           p.Log();
       }
   }
   ```

4. Time a hot section by hand. The call allocates nothing and does nothing when Snitch is not sampling.

   ```csharp
   using (Profiler.Sample("MyMod.Pathfinding")) { /* expensive work */ }

   // Skip even the call on a hot loop:
   if (Profiler.Enabled) using (Profiler.Sample("MyMod.Tick")) { /* ... */ }
   ```

5. Optional: register an ablation lever. `snitch ablate mymod.fx` then measures what your subsystem costs per frame.

   ```csharp
   Profiler.RegisterAblationLever("mymod.fx", apply: () => DisableFx(), restore: () => EnableFx());
   ```

6. Optional: mark a one-off spike with `Profiler.Mark("MyMod.LevelLoaded")`.

## Check it works

1. Start the game and run `snitch start` in the console.
2. Run `snitch panels`. Your panel and its control counts appear.
3. Open the panel from the `windows` list of the Overview window, or in the [web dashboard](/mods/snitch/guides/web-dashboard/).

## Rules

- Call the API from the Unity main thread. Snitch also runs your counter, state, action, toggle and slider delegates on the main thread, so they may use game objects.
- Prefix labels with `MyMod.` so they group per mod.
- Write log lines with `p.Write("...")` or `Profiler.Log("MyMod", "...")`. They appear in your panel and in the combined timeline.
- Registrations made before Snitch loads are queued. Load order does not matter.
- Lower-level calls exist: `Profiler.RegisterCounter`, `RegisterStateProvider`, `RegisterAction`, `RegisterToggle`, `RegisterSlider`, `RegisterText`, `Log`.

## Next

- [Add a slider](/mods/snitch/guides/sliders/)
- [Console commands](/mods/snitch/guides/console-commands/)
- [API reference](/mods/snitch/api/)
