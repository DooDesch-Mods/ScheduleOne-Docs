---
title: "Installation"
description: "You install Sideload because another mod needs it."
sidebar:
  order: 1
---
## For players

You install Sideload because another mod needs it. On its own it adds no gameplay, no menu and no phone app -
it does nothing until a mod registers one, and every developer tool in it is off unless you switch it on.

### With a mod manager (recommended)

Install from Thunderstore with r2modman or Gale. MelonLoader and the support libraries are pulled in and placed
correctly for you. Nothing else to do.

### By hand

1. Install **MelonLoader 0.7.3** for Schedule I.
2. Drop **`Sideload.dll`** into `Schedule I/Mods/`.

That is the whole list. Since 1.11.0 the HTML parser, the script engine and its parser live inside
`Sideload.dll`, so there is no second step to get wrong and nothing left behind when you remove the mod.

Upgrading from 1.10.0 or older? You will have `AngleSharp.dll`, `Jint.dll` and `Esprima.dll` in `UserLibs/` or
next to the mod in `Mods/`. Sideload still prefers those if it finds them, so an existing install keeps working
untouched. Delete them whenever you like.

## Requirements

| Component | Version |
|---|---|
| Schedule I | IL2CPP, current Steam public build |
| MelonLoader | 0.7.3 or newer |

Sideload does **not** use S1API. It patches `HomeScreen.Start` itself, because S1API discovers phone apps by
type and Sideload declares them at runtime.

## For mod authors

You do not install Sideload into your project. You compile in one file:

```xml
<Compile Include="path\to\Sideload.cs" Link="Sideload.Api.cs" />
```

`Sideload.Api/Sideload.cs` lives in the [Sideload repo](https://github.com/DooDesch-Mods/ScheduleOne-Sideload/blob/main/Sideload.Api/Sideload.cs).
It has **zero references** - no MelonLoader, no Unity, no IL2CPP interop - and finds the running host by
reflection. Referencing `Sideload.Api.dll` instead behaves identically, at the cost of a second assembly your
users have to install.

Either way your mod ships as one DLL and works whether or not Sideload is present. See
**[Your First App](/mods/sideload/guides/your-first-app/)**.

## Settings

Settings live in `UserData/MelonPreferences.cfg` under `Sideload_01_Main`.

`AppKeys` is the only one meant for players, and it is **on**. It lets an app be reached by a key with your
phone still in your pocket - press it and the app comes up ready to use. Only a key the app asked for is read,
only where the game would let you take your phone out anyway, and never while you are typing, paused, or in a
station, shop or the console. Turn it off and no app gets a key. See **[Keys and Typing](/mods/sideload/guides/keys-and-typing/)**.

Everything else there is a developer tool and is off by default; see
**[Dev Loop and Testing](/mods/sideload/guides/dev-loop-and-testing/)** for what each one does.

