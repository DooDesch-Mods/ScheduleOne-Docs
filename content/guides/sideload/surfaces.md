---
title: "Surfaces"
description: "A surface is a page rendered somewhere that is not the phone: a column in the main menu, a panel on a machine, a"
sidebar:
  order: 9
---
A surface is a page rendered somewhere that is not the phone: a column in the main menu, a panel on a machine, a
board on a wall. Needs Sideload **1.13.0**.

The renderer never cared about the phone. It draws into any `RectTransform`, and the phone was simply the first
caller - there just was no door to it from outside. `Surfaces` is that door.

## What you get, and what you do not

Same renderer, same CSS subset, same `s1.call` / `s1.on` channel. A page written for one works on the other with
a different stylesheet.

What a surface does not have is everything that belongs to the phone: no home-screen icon, no orientation the
player can turn, no unread badge, no notifications. If you want those, register an app.

## Mounting one

```csharp
using Sideload.Api;

Surfaces.Mount(myPanel, "sidehustle-menu", "SideHustle.Assets.menu")
        .OnCall("menu.state", _ => StateJson())
        .Emit("ready");
```

| Argument | What it is |
|---|---|
| `hostRect` | Your `UnityEngine.RectTransform`. Typed as `object` only so the shim compiles in a mod with no Unity reference - pass the RectTransform straight in. |
| `id` | Stable id, unique across apps **and** surfaces. They share one namespace, so a surface cannot quietly take an app's `s1.call` handlers. Also the folder under `Mods/` that overrides the bundle. |
| `bundlePrefix` | Embedded-resource prefix of your web files. Same `LogicalName` rules as an app - see [Your First App](/mods/sideload/guides/your-first-app/). |
| `designShortSide` | See below. Defaults to 0. |
| `hostAssembly` | The assembly holding the bundle. Defaults to the caller's. |

`Mount` returns a `SurfaceHandle` with `OnCall`, `Emit`, `AllowHost` and `Unmount`. They chain.

## designShortSide: the one decision to make

A phone app never has to think about this, because every app is written for the same 400px panel. A surface has
no such agreement, so you pick:

- **`0`** (the default) maps one CSS pixel to one device unit. Your page works in the panel's own pixels. This
  is what a panel uGUI has already laid out wants - your CSS matches what the rest of the menu measures.
- **A number** gives you the phone's contract: the page is written against that width and scales with the panel.
  Pass `designShortSide: 400` and a stylesheet from a phone app renders unchanged.

Getting this wrong is not subtle. Everything comes out at the wrong size at once.

## Lifetime

The panel owns it. A surface goes away when its `RectTransform` is destroyed, so a scene reload needs no
bookkeeping from you.

`Surfaces.IsMounted(id)` answers false once the panel is gone, which makes it the check to remount on:

```csharp
if (!Surfaces.IsMounted("sidehustle-menu")) Mount();
```

## Shipping against it

`Surfaces.Available` is false on Sideload 1.12.0 and older, and `Mount` there returns a handle whose calls are
no-ops. So a mod ships this without a hard version pin and keeps its own UI as the fallback:

```csharp
if (Surfaces.Available) MountThePage();
else BuildTheOldPanel();
```

## Known difference from a phone app

Colours were converted twice on a screen overlay before 1.13.0, so `#808080` arrived as `#383838` and dark
surfaces sank into whatever was behind them while the text stayed correct. Fixed in 1.13.0. Phone apps were
never affected, which is why it survived as long as it did.

## See also

- **[The Bridge](/mods/sideload/guides/the-bridge/)** - `s1.call`, `Emit`, storage and `fetch` work identically here.
- **[CSS and Layout](/mods/sideload/guides/css-and-layout/)** - the same subset applies.
- **[Companion Seam](/mods/sideload/guides/companion-seam/)** - a different thing: the same app on a second screen, not a page in your own panel.

