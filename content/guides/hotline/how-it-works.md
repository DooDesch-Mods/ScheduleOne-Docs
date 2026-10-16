---
title: How hotkey interception works
description: Look up how Hotline catches other mods' function keys and turns them into panel buttons.
sidebar:
  order: 4
---

Hotline catches mods that poll a raw function key (F1-F12) and adds a button for each key to that mod's panel. You trigger any mod's hotkey from one place, and two mods no longer fight over a key. The mod does not need to use the [Hotline API](/mods/hotline/guides/modder-api/).

## How it works

1. Hotline wraps the per-frame methods of every other mod (`OnUpdate` and others) to know which mod is running.
2. A Harmony hook on `UnityEngine.Input.GetKeyDown` assigns each polled function key to that mod.
3. Hotline adds a "Press Fx" button to the mod's panel.

The hook applies to mod code only. The game's own input is not touched.

## Press a caught key

Click the "Press Fx" button, or run `hotline key press Fx <mod>`. Hotline sends a one-frame synthetic press that only the owning mod sees. Input is read on the client, so multiplayer is not affected.

## Full takeover

By default the raw key keeps working. Set **`SuppressRawFunctionKeys`** to `true`, or run `hotline intercept suppress on`, for full takeover. A physical function-key press then no longer reaches the mod. It opens the overlay on that mod's panel, where each key is a button.

## Master key

The overlay key (default **F6**) belongs to Hotline and is never caught. If a mod also uses F6, it still gets a button. Pressing F6 opens the overlay on that mod's panel, and the mod's raw F6 is blocked so it cannot fire twice.

## One window per mod

A registered panel, forwarded data (for example from Snitch) and caught hotkeys land in one panel when they share the mod's name.

## Limits

- Hotline catches only mods that use the legacy `UnityEngine.Input`. Mods on the new Input System are not caught and are not affected.
- The vanilla game binds no function keys, so it is never touched.
