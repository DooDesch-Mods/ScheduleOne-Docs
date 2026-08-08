---
title: "Keys and Typing"
description: "Every key on the board is a game binding."
sidebar:
  order: 7
---
Every key on the board is a game binding. W walks, 1 to 9 swap inventory slots, Escape leaves whatever the
player is in. A mod interface that wants a keystroke is borrowing one of those, and everything below is the
arrangement that gets it handed back.

Three mechanisms, and picking the wrong one is the usual mistake:

| You want | Use | Scope |
|---|---|---|
| a key while the player is typing in your field | `data-keys` on the input | that field, while it has the caret |
| a key that OPENS your app | `app.OnKey(...)` in C# | anywhere the game would let the player take their phone out |
| typing to land in your box without a click first | `data-typing` on the input | your app, while that box is on screen |

## Why a field holding the caret matters

Sideload's `<input>` is a real `TMP_InputField`, and a focused one sets `GameInput.IsTyping`. That single flag
is what stops the game reading the keyboard - which is why a chat with the caret in its message box is a chat
you can type in, and a chat without it is a chat where "hello" walks you forward, crouches you and swaps two
inventory slots.

"Does my app have the caret" therefore decides who the player's keystrokes belong to, and everything below
follows from that.

---

## `data-keys`: keys for a focused field

The page names the keys it wants on the field itself:

```html
<input id="prompt" data-keys="Tab ArrowUp ArrowDown Ctrl+R">
```

They arrive as `keydown` on that element, carrying `e.key`, `e.ctrlKey` / `e.shiftKey` / `e.altKey`, `e.repeat`
and `e.hasSelection` - the last one is how a terminal tells Ctrl+C-as-copy from Ctrl+C-as-interrupt.

Only the keys an app names are read, only they are dispatched, and only they are taken away from the field. A
page that declares nothing behaves exactly as it did before this existed, which is the point of declaring at
all: forwarding every keystroke would make every page pay for the feature and let a careless one swallow keys
the player bound to something else. `Ctrl+Backspace` can delete a word while a plain Backspace stays the
field's own.

**Modifiers match exactly.** `Tab` fires only for a bare Tab, never for Shift+Tab, so an app that wants both
declares both and can tell them apart. A page that only asked for `ArrowUp` leaves Shift+Up free to select text.

**A declared key is always swallowed.** `preventDefault()` is on the event for symmetry with `back`, but it
cannot un-move a caret - the field processes keys from the EventSystem and nothing guarantees your handler runs
first. A page that wants the caret to keep moving simply does not declare the arrows.

Holding a key repeats it after 0.35 s, then every 0.06 s, dropping to 0.03 s after 1.2 s so a hundred-item list
stays reachable. `data-reject-first` on the field keeps a dead key from opening a fresh line.

### The vocabulary

Letters, digits, `F1`-`F12`, `Tab`, `Backspace`, `Delete`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`,
`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Space`. Modifiers are `Ctrl`, `Shift` and `Alt`, joined with
`+`.

Punctuation is deliberately absent: it sits on different physical keys on different layouts, so a page
declaring one would work for its author and silently not for half its players.

`Enter` and `Escape` are refused here, and the refusal is written to the log. Both already reach a page by
another route - Enter as a `keydown` from the field's own submit, Escape as `back` - and delivering either
twice would make a page act on one press twice.

---

## `OnKey`: a key that opens the app

`data-keys` needs a page that is on screen, so it can never be the thing that PUTS one there. That is a
separate call, in C#:

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

Needs Sideload **1.10.0**. `AppHandle.CanClaimKeys` is false on anything older, where `OnKey` is a silent
no-op - worth checking only when the key is the ONLY way in, because pairing it with `NoIcon()` on an old host
leaves the player an app they can neither see nor reach.

Spelling is the same as `data-keys`, several keys separated by spaces or commas, modifiers exact. `Enter` is
allowed here and `Escape` is not: Escape is the game's own exit action, and an app that could take it globally
could take it while the player is trying to leave something else.

### Your handler answers "did you take it"

Returning `false` passes the press to the next app that wants the same key, which is how you decline a key you
cannot use right now. A chat with no lobby behind it should not open, and should not swallow the key on its way
past. The argument is the key that fired, so one handler can serve several.

### When two apps want the same key

It goes to **whichever notified the player most recently**. Two messengers installed side by side then behave
the way a phone should: the key answers the conversation that is actually waiting, rather than whichever mod
happened to load first. An app that has never notified is not excluded, it just sorts last in the order the
claims arrived - which is what makes the ordinary case work, because a single claimant wins from the first
press with no notification needed.

**An app on screen owns every key it claimed**, and no other app is offered them. Without that rule, reading one
app and pressing Enter would throw the phone at a different one; with it, a key the app on screen did not claim
simply does nothing, which is better than doing something surprising.

Nothing here is yours to arbitrate. Claim your key and answer when you are asked.

### Where the key is read

Only where the game's own phone key would work. That condition is copied from `GameplayMenu` term for term,
so the answer never drifts from what the player already expects:

- not while they are typing - which covers YOUR focused fields, so Enter inside an open chat sends the message
  instead of arriving here;
- not while paused, asleep, dead or arrested;
- not while another screen owns the view: a station, a shop, dialogue, the rename dialog, the developer
  console. Enter at a mixing station stays the game's Begin button and Enter in the console stays submit.

The player's switch over all of it is `AppKeys` in `MelonPreferences.cfg`, on by default.

`Enter` answers the number pad as well - it is the same key to everyone pressing it.

---

## `data-typing`: keeping the keyboard

```html
<input class="entry" id="entry" data-typing placeholder="Write a message">
```

While that field is painted and its app is on screen, the caret returns to it whenever nothing else holds one.
For a chat, a search screen or anything else whose main verb is "type", this is the difference between an app
the player can use and one that fights them.

Three limits, and each is a bug you do not have to find:

- **Painted only.** A pane hidden with `display: none` paints nothing, so the compose box behind a portrait
  thread list does not hold the keyboard from where the player cannot see it.
- **On screen only**, checked against the app being SHOWN rather than merely open. An app stays open on a phone
  that went back in the player's pocket; taking the keyboard there leaves someone who cannot move, cannot
  Escape and cannot reach their phone. Sideload also lets go by itself if the app stops being visible while it
  holds the caret, which is what the phone's character tab does.
- **Only when nothing at all is selected.** A control the player clicked keeps the caret, so your own search box
  stays usable, and so do the game's console and its dialogs. Clicking something that is NOT a field - a row, a
  list, a button - selects nothing, and that is the press that brings the keyboard home again.

The check is "nothing is selected", not "no field is focused", and that is deliberate: TextMeshPro activates a
field one frame after the EventSystem selects it, so a rule watching focus would take the caret back inside that
frame and a clicked search box would never come alive.

### Escape still works, and now on the first press

`GameInput.HandleExitInputs()` returns on its first line while the player is typing, so neither Escape nor
right-click nor the phone key raises anything at all. Every vanilla screen survives that because its field lets
go on the first Escape and the second press gets through - which is why the game's own input boxes feel like
they swallow one.

A field that takes the caret straight back has no second press, and the player would be shut inside your app.
So Sideload reads the game's own exit actions itself and delivers the `back` your page is already listening
for. Nothing to do on your side, and an app with any focused field now leaves on the FIRST press rather than
the second.

---

## Reading the keyboard yourself

Do not. A mod polling `Input.GetKeyDown` gets none of the above: not the gate, not the arbitration, not the
player's switch, and not the exit rescue. It will fire while the player is naming a save, and it will fight the
next mod that wants the same key.

## Symptoms

| What you see | Why |
|---|---|
| the key never fires | it was refused at parse time - check the log for `[Sideload] '<app>' asked for the key` |
| the key fires nowhere useful | another app claimed it and notified more recently, or the app on screen owns it |
| the key does nothing at a station or in the console | working as intended: the gate is shut wherever the phone key would be refused |
| `OnKey` does nothing at all | Sideload older than 1.10.0 - check `AppHandle.CanClaimKeys` |
| typing walks the player around | no `data-typing` on the field, or the field is not painted in the current layout |
| the caret will not stay in the box | something else is selected - a control the player clicked, or a screen of the game's own |
| a page cannot declare `Enter` | correct; it arrives as `keydown` from the field's own submit |

## See also

- **[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)** - the `keydown` event object in full.
- **[Phone Integration](/mods/sideload/guides/phone-integration/)** - `Show()`, `Emit()` and the order they go in.
- **[API Reference](/mods/sideload/api/)** - `OnKey` and `CanClaimKeys` signatures.

