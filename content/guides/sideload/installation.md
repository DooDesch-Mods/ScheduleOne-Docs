---
title: Install Sideload
description: Install Sideload for players, or add its one-file API to your own mod project.
sidebar:
  order: 2
---

Install Sideload because another mod needs it. On its own it adds nothing to the game.

**You need:** Schedule I (IL2CPP, current Steam build) and MelonLoader 0.7.3 or newer. See [Install](/install/).

## Steps for players

1. With r2modman or Gale: install Sideload from Thunderstore. Dependencies are placed for you.
2. By hand: install MelonLoader 0.7.3, then put `Sideload.dll` in `Schedule I/Mods/`.

`Sideload.dll` contains the HTML parser and the script engine. Nothing else is needed.

If you upgrade from 1.10.0 or older, `AngleSharp.dll`, `Jint.dll` and `Esprima.dll` may remain in `UserLibs/` or `Mods/`. Sideload uses them if present. You can delete them.

Sideload does not use S1API. It patches `HomeScreen.Start` itself.

## Steps for mod authors

1. Add `Sideload.cs` to your project as source. Do not reference Sideload.

   ```xml
   <Compile Include="path\to\Sideload.cs" Link="Sideload.Api.cs" />
   ```

2. Get the file from [`Sideload.Api/Sideload.cs`](https://github.com/DooDesch-Mods/ScheduleOne-Sideload/blob/main/Sideload.Api/Sideload.cs).

The file has no references (no MelonLoader, Unity or IL2CPP interop). It finds the host by reflection. Your mod ships as one DLL and works with or without Sideload. Referencing `Sideload.Api.dll` behaves the same but adds a second assembly for players to install.

Two optional npm packages (MIT):

| Package | Use |
|---|---|
| [`@doodesch/create-sideload-app`](https://www.npmjs.com/package/@doodesch/create-sideload-app) | `npx @doodesch/create-sideload-app my-app` creates the bundle, C# mod, Vite build and types |
| [`@doodesch/sideload-vite`](https://www.npmjs.com/package/@doodesch/sideload-vite) | The Vite plugin alone, for an existing project |

## Settings

Settings are in `UserData/MelonPreferences.cfg` under `Sideload_01_Main`.

- `AppKeys` is on by default. It lets an app open from a key it asked for while the phone is in the pocket. Sideload ignores the key while you type, while paused, and in a station, shop or the console. Set it off and no app gets a key.
- All other settings are developer tools and are off by default.

## Check it works

Start the game. `MelonLoader/Latest.log` lists Sideload under the loaded mods.

## Next

- [Build your first app](/mods/sideload/guides/your-first-app/)
- [Keys and typing](/mods/sideload/guides/keys-and-typing/)
- [Dev loop and testing](/mods/sideload/guides/dev-loop-and-testing/)
