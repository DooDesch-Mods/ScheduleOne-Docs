---
title: Add a gamemode
description: Register your mod as a gamemode so it shows in the Side Hustle hub with its own Host, Join and Solo buttons.
sidebar:
  order: 1
---

Register your mod as a gamemode. It then shows as a row in the Side Hustle hub, and the player starts it from there.

**You need:** Side Hustle 3.0, a MelonLoader mod project.

## Steps

1. Reference `SideHustle.dll` from your game's `Mods` folder. Do not copy it into your output.

   ```xml
   <Reference Include="SideHustle">
     <HintPath>path\to\Schedule I\Mods\SideHustle.dll</HintPath>
     <Private>false</Private>
   </Reference>
   ```

   Your project also needs `UnityEngine.CoreModule`, because the descriptor has `Sprite` and `Texture2D` fields.

2. Copy [`SideHustleLink.cs`](https://github.com/DooDesch-Mods/ScheduleOne-SideHustle/blob/main/Examples/SideHustleLink.cs) into your project. It keeps your mod working when Side Hustle is not installed.

3. Mark Side Hustle as an optional dependency, once in any file:

   ```csharp
   [assembly: MelonOptionalDependencies("SideHustle")]
   ```

4. Put every Side Hustle type in its own class. Your `MelonMod` class must not mention one.

   ```csharp
   using SideHustle;

   internal static class Gamemode
   {
       internal static GamemodeDescriptor Build() => new GamemodeDescriptor
       {
           Id = "you.yourmode",                     // stable and unique
           DisplayName = "Your Mode",
           Description = "What your gamemode does.",
           Author = "You",
           Support = GamemodeSupport.Singleplayer,  // or Multiplayer, Hybrid
           Surface = GamemodeSurface.MenuSpace,     // MenuSpace = overlay on the menu, World = loads a world
           OnLaunchSingleplayer = Start,
           OnExitToHub = ctx => CleanUp(),
       };

       private static void Start(LaunchContext ctx) { /* build your overlay or start your mode */ }
       private static void CleanUp() { /* remove everything you built */ }
   }
   ```

   A method that names a Side Hustle type fails before its first line when `SideHustle.dll` is missing. A `try`/`catch` inside that method does not help.

5. Register from `OnInitializeMelon`:

   ```csharp
   public override void OnInitializeMelon()
   {
       SideHustleLink.TryRegister(() => Gamemode.Build(), LoggerInstance);
   }
   ```

6. Call `ctx.ReturnToHub()` when your mode ends, for example on a Back button. Side Hustle then shows the menu and the hub again.

## Add an icon

Embed a PNG as `<AssemblyName>.hub-icon.png`. The hub finds it without any code:

```xml
<EmbeddedResource Include="icon.png" LogicalName="YourMod.hub-icon.png" />
```

The hub shows this icon also while the boot gate holds your mod back and none of your code has run.
For another resource name, set `IconResource` on the descriptor. `Icon` (a `Sprite`) and `IconTex` (a `Texture2D`) win over both.

## Check it works

The log shows:

```
Gamemode registered: 'Your Mode' (you.yourmode).
```

Your row is in the hub. Click Solo, and `OnLaunchSingleplayer` runs.

![The Side Hustle hub with the "Your Mode" row selected: icon, name, author and the Host, Join and Solo buttons](/img/guides/sidehustle/hub-your-mode.webp)

A problem in the descriptor is logged with the gamemode id and the field name.

## Next

- [Add host settings](/mods/sidehustle/guides/host-settings/)
- [React to players and send messages](/mods/sidehustle/guides/sessions-and-messages/)
- [Run your gamemode in the game world](/mods/sidehustle/guides/world-gamemodes/)
- [Example gamemode](https://github.com/DooDesch-Mods/ScheduleOne-SideHustle/tree/main/Examples/ExampleGamemode)
- [API reference](/mods/sidehustle/api/)
