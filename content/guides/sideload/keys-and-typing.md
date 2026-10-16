---
title: "Handle keys and typing"
description: "Read keys in a focused field, open your app with a key, and keep the keyboard in your box."
sidebar:
  order: 13
---
Every key is a game binding: W walks, 1-9 swap slots, Escape leaves. Pick the mechanism that gets a key handed to your app.

| You want | Use | Scope |
|---|---|---|
| a key while the player types in your field | `data-keys` on the input | that field, while it has the caret |
| a key that opens your app | `app.OnKey(...)` in C# | anywhere the game lets the player take their phone out |
| typing to land in your box without a click | `data-typing` on the input | your app, while that box is on screen |

A focused `<input>` sets `GameInput.IsTyping`, and that flag stops the game reading the keyboard. Without a focused field, typing "hello" walks the player around.

## Read keys in a focused field

1. Name the keys on the input:

   ```html
   <input id="prompt" data-keys="Tab ArrowUp ArrowDown Ctrl+R">
   ```

2. Listen for `keydown` on that element. It carries `e.key`, `e.ctrlKey` / `e.shiftKey` / `e.altKey`, `e.repeat` and `e.hasSelection`. `e.hasSelection` tells Ctrl+C as copy from Ctrl+C as interrupt.

Rules:

- Only named keys are dispatched, and only they are taken from the field. A page with no `data-keys` behaves as before. `Ctrl+Backspace` can delete a word while plain Backspace stays the field's own.
- **Modifiers match exactly.** `Tab` fires for a bare Tab, not Shift+Tab. Declare both to get both. A page that names only `ArrowUp` leaves Shift+Up free to select text.
- **A declared key is always swallowed.** `preventDefault()` cannot un-move a caret. To keep the caret moving, do not declare the arrows.
- A held key repeats after 0.35 s, then every 0.06 s, then every 0.03 s after 1.2 s. `data-reject-first` on the field keeps a dead key from opening a fresh line.

**Key names:** letters, digits, `F1`-`F12`, `Tab`, `Backspace`, `Delete`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`,
`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space`. Modifiers are `Ctrl`, `Shift` and `Alt`, joined with `+`.

Punctuation is not allowed, because it sits on different physical keys on different layouts. `Enter` and `Escape` are refused with a log line. Enter already arrives as `keydown` from the field's submit, and Escape arrives as `back`.

## Open the app with a key

`data-keys` needs a page on screen. To open the app, claim the key in C# (needs Sideload 1.10+):

```csharp
Apps.Register("whatsdab", "WhatsDab.Assets.whatsdab")
    .OnKey("Enter", key => QuickChat());

private static bool QuickChat()
{
    if (!Online) return false;      // nothing to write to - let somebody else have Enter
    if (!app.Show()) return false;  // the game refused the phone

    app.Emit("chat.compose", "everyone");
    return true;
}
```

- `AppHandle.CanClaimKeys` is false on older hosts, where `OnKey` does nothing. Check it when the key is the only way in, especially with `NoIcon()`.
- Key spelling matches `data-keys`. Separate several keys with spaces or commas. `Enter` is allowed and `Escape` is not.
- Return `false` to pass the press to the next app that wants the key. The argument is the key that fired.
- **Two apps, one key:** the app that notified the player most recently gets it. An app that never notified sorts last. A single claimant wins from the first press.
- **An app on screen owns every key it claimed.** No other app is offered them.

The key is read only where the game's own phone key works. It is not read:

- while the player is typing, including in your focused fields
- while paused, asleep, dead or arrested
- while another screen owns the view: a station, a shop, dialogue, the rename dialog, the developer console

The player switch is `AppKeys` in `MelonPreferences.cfg`, on by default. `Enter` also answers the number pad.

## Keep the keyboard in your box

```html
<input class="entry" id="entry" data-typing placeholder="Write a message">
```

While the field is painted and its app is shown, the caret returns to it whenever nothing else holds one. Use it for chat, search and other type-first screens.

- **Painted only.** A pane hidden with `display: none` does not hold the keyboard.
- **App shown only.** An app that is open but back in the player's pocket does not take the keyboard. Sideload also lets go if the app stops being visible while it holds the caret.
- **Nothing selected only.** A control the player clicked keeps the caret, so your search box and the game's console and dialogs stay usable. Clicking a non-field (row, list, button) selects nothing, and that press brings the keyboard back.

While a field has the caret, the game ignores Escape, right-click and the phone key. Sideload reads the game's exit actions itself and delivers `back` on the first press. You need no code for this.

## Do not poll the keyboard

A mod that polls `Input.GetKeyDown` gets none of the above. It fires while the player names a save and fights other mods for the key.

## Check it works

| What you see | Cause |
|---|---|
| the key never fires | refused at parse time - look for `[Sideload] '<app>' asked for the key` in the log |
| the key fires nowhere useful | another app claimed it and notified more recently, or the app on screen owns it |
| the key does nothing at a station or in the console | the gate is shut wherever the phone key is refused |
| `OnKey` does nothing at all | Sideload older than 1.10 - check `AppHandle.CanClaimKeys` |
| typing walks the player around | no `data-typing`, or the field is not painted in this layout |
| the caret will not stay in the box | something else is selected: a clicked control or a game screen |

## Next

- [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/)
- [Phone integration](/mods/sideload/guides/phone-integration/)
- [API reference](/mods/sideload/api/)
