---
title: "Modder API"
description: "Snitch lets any mod report its own performance, and it is a **zero-overhead no-op when Snitch is not"
sidebar:
  order: 4
---
Snitch lets any mod report its own performance, and it is a **zero-overhead no-op when Snitch is not
installed** - so you can ship the integration unconditionally with no hard dependency. Full working example:
[ScheduleOne-SnitchExample](https://github.com/DooDesch-Mods/ScheduleOne-SnitchExample).

## You get the basics for free

When Snitch is installed and sampling, it **auto-times every loaded mod's per-frame methods** (`OnUpdate`,
`OnFixedUpdate`, `OnLateUpdate`, `OnGUI`) and shows them as `<YourMod>.OnUpdate` etc. - with **zero code on
your side**. Your mod already appears in the profiler's frame budget without integrating anything at all.

Add the API below only to go further: your own panel (counters, state, free text, action buttons, toggles,
sliders and a log), hand-timed sub-sections, or ablation levers.

## Add the API

- **Copy-in source (recommended):** drop `Snitch.cs` (from the example repo) into your mod project. It
  compiles into your DLL - nothing extra to ship.
- **Reference the DLL:** reference `Snitch.Api.dll`.

Both bind to the running Snitch host by reflection, so they share no type with it and work regardless of load
order (registrations are queued until the host is up).

## Give your mod a panel with zero wiring

Name a class `SnitchProbe` with a static `Register()` anywhere in your mod. Snitch **discovers and calls it
automatically** - you never wire a call into your `OnInitializeMelon`. There, declare a **panel**: your mod's
own toggleable, movable, resizable area in the Snitch overlay and web dashboard, holding your counters, state,
free text, action buttons, toggles, sliders and a log channel:

```csharp
using Snitch.Api;   // Profiler, Panel, StateSnapshot

internal static class SnitchProbe
{
    public static void Register()
    {
        Panel p = Profiler.RegisterPanel("MyMod", "My Mod");        // counters/state added here become "MyMod.*"
        p.Counter("QueueLength", () => MyMod.Queue.Count, "items"); // numeric gauge
        p.State("Jobs", () => new StateSnapshot { Title = "Jobs" }  // name -> count distribution (bars)
            .Add("running", MyMod.Running).Add("queued", MyMod.Queued));
        p.Text(() => $"mode: {MyMod.Mode}");                        // free multi-line readout
        p.Action("Flush queue", () => MyMod.Flush());              // a button (replaces a debug hotkey)
        p.Toggle("Verbose", () => MyMod.Verbose, v => MyMod.Verbose = v); // an on/off control
        p.Slider("batch size", 1, 64,                                // a draggable value, snapped to whole steps
            () => MyMod.Batch, v => MyMod.Batch = (int)v, 1);
        p.Log();                                                    // show this panel's log channel
    }
}
```

Open it in-game from the Overview window's `windows` list; `snitch panels` lists them. Actions, toggles and
sliders run on the Unity main thread, so they may touch game objects. Send a log line with `p.Write("...")` or
`Profiler.Log("MyMod", "...")` - it shows in your panel log and the combined timeline.

Sliders have their own page, including the id collision that silently deletes controls: **[Sliders](/mods/snitch/guides/sliders/)**.

## The full API

```csharp
using Snitch.Api;   // Profiler, Panel, StateSnapshot, Scope

// A panel groups everything below under your mod (the fluent builder above). Lower-level calls also exist:
//   Profiler.RegisterCounter / RegisterStateProvider / RegisterAction / RegisterToggle / RegisterSlider /
//   RegisterText / Log

// Hand-time a sub-section (finer than the automatic per-mod timing). No heap alloc; no-op when not sampling.
using (Profiler.Sample("MyMod.Pathfinding")) { /* expensive work */ }

// gate hot loops for the absolutely-free path:
if (Profiler.Enabled) using (Profiler.Sample("MyMod.Tick")) { /* ... */ }

// A numeric gauge (polled a few Hz by the host).
Profiler.RegisterCounter("MyMod.QueueLength", () => _queue.Count, "items");

// An entity/state distribution (a bar panel in the HUD + web dashboard).
Profiler.RegisterStateProvider("MyMod.Jobs", () =>
    new StateSnapshot { Title = "Jobs" }.Add("running", _running).Add("queued", _queued));

// A value you tune by dragging. Clamped to [min,max] and snapped to the step before your setter runs, whether
// the write came from the overlay, the dashboard or 'snitch slider'. Step 0 = continuous.
Profiler.RegisterSlider("MyMod", "pull force", 0, 60000,
    () => Preferences.PullNewtons, v => Preferences.PullNewtons = (float)v, step: 500, unit: "N");

// An ablation lever so 'snitch ablate mymod.fx' measures your subsystem's causal frame cost.
Profiler.RegisterAblationLever("mymod.fx", apply: () => DisableFx(), restore: () => EnableFx());

// Mark a one-off spike.
Profiler.Mark("MyMod.LevelLoaded");
```

## Rules

- Call from the **Unity main thread**. Counter, state, action, toggle and slider delegates are invoked by the
  host on the main thread, so they may safely touch game objects.
- Prefix labels with `MyMod.` so they roll up per mod in the HUD and dashboard.
- `Profiler.Sample` returns a `readonly struct` scope - no heap allocation, and `Dispose` is a no-op when
  Snitch isn't sampling.

Your sections, counters and states appear live in the in-game HUD and the [Web Dashboard](/mods/snitch/guides/web-dashboard/),
right alongside the vanilla NPC/trash/quest data.

