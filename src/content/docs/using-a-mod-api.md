---
title: Call another mod's API
description: Add another mod's API to your project and keep your mod working when that mod is not installed.
sidebar:
  order: 2
---

Add the API to your project, mark the mod optional, and call it. The "Use this API" block on each API reference page has the exact file and csproj lines.

## Pick your kind of API

| Kind | Mods | What you add |
|---|---|---|
| One source file | Snitch, Hotline, Sideload, TightBeam, Clipwise, Hash | Copy one `.cs` file into your project. Nothing extra to ship. |
| The mod's DLL | SideHustle, Personnel, Inkorporated | Reference the mod's DLL with `<Private>false</Private>`. |

## Steps for a source file

1. Copy the file into your project:

   ```xml
   <Compile Include="path\to\Snitch.cs" />
   ```

2. Mark the mod optional:

   ```csharp
   [assembly: MelonOptionalDependencies("Snitch")]
   ```

3. Call it. Without the mod, every call does nothing and returns a default.

   ```csharp
   using Snitch.Api;

   using (Profiler.Sample("MyMod.Pathfinding"))
   {
       // runs the same with or without Snitch
   }
   ```

Calls made before the mod loads run when it loads. Load order does not matter.

## Steps for a DLL

1. Reference the DLL from your game's `Mods` folder:

   ```xml
   <Reference Include="SideHustle">
     <HintPath>path\to\Schedule I\Mods\SideHustle.dll</HintPath>
     <Private>false</Private>
   </Reference>
   ```

2. Mark the mod optional, as above.

3. Put every call into a separate class, and call that class only when the mod is loaded.

   A method that names a type from a missing DLL fails before its first line. A `try`/`catch` inside that method does not catch it. SideHustle ships [`SideHustleLink.cs`](https://github.com/DooDesch-Mods/ScheduleOne-SideHustle/blob/main/Examples/SideHustleLink.cs) for this.

## Rules for every API

- Call the API from Unity's main thread. Your callbacks also run on the main thread.
- In a hot path, check the API's `Enabled` or `Available` flag first. A call that does nothing still costs a call.

  ```csharp
  if (Profiler.Enabled)
  {
      using (Profiler.Sample("MyMod.Inner")) { }
  }
  ```

## Support an older version of the mod

The reference shows the latest release. A member that came later says **Added in `x.y.z`**. A member without that line exists in every release.
The **Changes by version** page lists what each release added and removed. Read "Removed" before you raise the version you require.

## Next

- [What do you want to build?](/build/)
