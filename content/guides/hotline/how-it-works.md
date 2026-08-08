---
title: "Auto-Intercepted Hotkeys"
description: "Beyond the [modder API](/mods/hotline/guides/modder-api/), Hotline covers mods that never adopt it."
sidebar:
  order: 4
---
Beyond the [modder API](/mods/hotline/guides/modder-api/), Hotline covers mods that never adopt it. It watches for mods that poll a
raw function key (F1-F12) and turns each into a button in that mod's overlay panel - so you can trigger any
mod's hotkey from one place, and two mods stop colliding on the same key.

## How discovery works

Hotline wraps every other mod's per-frame methods (`OnUpdate` etc.) so it knows which mod is running, then a
Harmony hook on `UnityEngine.Input.GetKeyDown` attributes each polled function key to that mod and adds a
"Press Fx" button to its panel. This is scoped to mod code, so the game's own input is never touched.

## Triggering a caught hotkey

Click the "Press Fx" button (or run `hotline key press Fx <mod>`). Hotline injects a one-frame synthetic press
that only the owning mod sees. Input is read client-side, so this never affects multiplayer.

## Optional full takeover

By default the raw key keeps working and the button is just an addition. Turn on **`SuppressRawFunctionKeys`**
(or `hotline intercept suppress on`) for full takeover: a physical function-key press no longer reaches the mod
at all - instead it opens the Hotline overlay focused on that mod's panel, where each of its keys is a button.
Now two mods can never collide on a function key.

## The master key

The overlay key (default **F6**) is reserved for Hotline and is never intercepted. If a mod also uses F6, it
still gets a button, and pressing F6 opens the overlay on that mod's panel - the mod's raw F6 is taken over so it
cannot double-fire with the overlay toggle.

## One window per mod

A mod's registered panel, its forwarded data (e.g. from Snitch) and its auto-caught hotkeys all land in a single
panel when they share the mod's name - so you get one window per mod, not several.

## Limits

Hotline only catches mods that poll the legacy `UnityEngine.Input`. Mods on the new Input System are not
intercepted (and are simply unaffected). Vanilla reads gameplay through its own input system and binds no
function keys, so it is never touched.

