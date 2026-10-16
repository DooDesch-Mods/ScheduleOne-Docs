---
title: Render a page in your own panel
description: Mount a Sideload page in any RectTransform, such as a menu column or a machine panel.
sidebar:
  order: 5
---

Render a page where there is no phone: a main menu column, a machine panel or a wall board. A surface uses the same renderer, CSS subset and `s1.call` / `s1.on` channel as a phone app.

**You need:** Sideload 1.13.0+, a bundle with `LogicalName` resources (see [Build your first app](/mods/sideload/guides/your-first-app/)), and a `RectTransform` to draw into.

A surface has no home-screen icon, no turnable orientation, no badge and no notifications. For those, register an app.

## Steps

1. Mount the page.

   ```csharp
   using Sideload.Api;

   Surfaces.Mount(myPanel, "sidehustle-menu", "SideHustle.Assets.menu")
           .OnCall("menu.state", _ => StateJson())
           .Emit("ready");
   ```

   | Argument | Meaning |
   |---|---|
   | `hostRect` | Your `UnityEngine.RectTransform`. Typed `object` so the shim compiles without a Unity reference. Pass the RectTransform directly. |
   | `id` | Unique across apps and surfaces. It is also the folder under `Mods/` that overrides the bundle. |
   | `bundlePrefix` | Embedded-resource prefix of your web files. |
   | `designShortSide` | Default 0. See step 2. |
   | `hostAssembly` | Assembly that holds the bundle. Defaults to the caller's. |

   `Mount` returns a `SurfaceHandle` with chainable `OnCall`, `Emit`, `AllowHost` and `Unmount`.

2. Choose `designShortSide`. A wrong value makes everything the wrong size.
   - `0` maps one CSS pixel to one device unit. Use it for a panel that uGUI has already laid out.
   - A number such as `400` scales the page against that width. A phone-app stylesheet then renders unchanged.

3. Remount when the panel is rebuilt. A surface ends when its `RectTransform` is destroyed, so a scene reload needs nothing else.

   ```csharp
   if (!Surfaces.IsMounted("sidehustle-menu")) Mount();
   ```

4. Keep a fallback for hosts without surfaces. `Surfaces.Available` is false on Sideload 1.12.0 and older, and `Mount` then returns a handle whose calls do nothing.

   ```csharp
   if (Surfaces.Available) MountThePage();
   else BuildTheOldPanel();
   ```

## Check it works

The page draws inside the panel at the size you expect. `Surfaces.IsMounted(id)` returns true. It returns false once the panel is destroyed.

## Next

- [The bridge](/mods/sideload/guides/the-bridge/) - `s1.call`, `Emit`, storage and `fetch` work the same on a surface.
- [CSS and layout](/mods/sideload/guides/css-and-layout/)
- [Companion seam](/mods/sideload/guides/companion-seam/)
- [API reference](/mods/sideload/api/)
