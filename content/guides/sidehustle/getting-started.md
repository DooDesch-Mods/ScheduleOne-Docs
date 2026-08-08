---
title: "Getting Started"
description: "1."
sidebar:
  order: 2
---
## Install (players)

1. Install **MelonLoader 0.7.3+** for Schedule I.
2. Install **S1API** (ifBars/S1API_Forked) - its DLLs go in `Mods/` and `Plugins/` per its own instructions.
3. Drop **`SideHustle.dll`** into your `…/Schedule I/Mods/` folder.
   (A Thunderstore mod manager like r2modman/Gale pulls MelonLoader + S1API in automatically.)
4. Install one or more gamemode mods that use Side Hustle - they appear under the **Side Hustle** menu entry.

On its own Side Hustle just adds the (empty) menu entry; the gamemodes come from other mods.

## Register your first gamemode (mod authors)

In a MelonLoader mod, reference `SideHustle.dll`, declare it as an optional dependency, and register from
`OnInitializeMelon`:

```csharp
using SideHustle;
using MelonLoader;

[assembly: MelonOptionalDependencies("SideHustle")]

public sealed class Core : MelonMod
{
    public override void OnInitializeMelon()
    {
        SideHustle.API.Register(new GamemodeDescriptor
        {
            Id = "you.yourmode",                  // stable, unique
            DisplayName = "Your Mode",
            Description = "What your gamemode does.",
            Author = "You",
            Support = GamemodeSupport.Singleplayer,   // or Multiplayer / Hybrid
            Surface = GamemodeSurface.MenuSpace,      // overlay on the menu (no save), or World
            OnLaunchSingleplayer = ctx => Start(ctx),
            OnExitToHub = ctx => CleanUp()
        });
    }

    private void Start(LaunchContext ctx) { /* build your overlay / start your mode */ }
    private void CleanUp() { /* tear down */ }
}
```

That is the whole integration. Selecting your gamemode in the menu calls `OnLaunchSingleplayer`. When your
mode finishes (e.g. the player clicks Back), call `ctx.ReturnToHub()` to return to the menu. Full details:
[API Reference](/mods/sidehustle/api/).

## Where things live

| Path | What |
|------|------|
| `…/Schedule I/Mods/SideHustle.dll` | The hub + the public API |
| `UserData/MelonPreferences.cfg` -> `[SideHustle_01_Main]` | The `Enabled` toggle |

