---
title: "Troubleshooting Sideload apps"
description: "Match what you see in your Sideload app to its cause and fix."
sidebar:
  order: 15
---
Find your symptom below. Check `MelonLoader/Latest.log` first.

## No icon on the phone

The log should show `app registered: <id>`. If it is missing, `Apps.Register` never ran, usually because the mod threw earlier. If it is there, look for `spawned on the phone`.

## The page is blank and the log says `index.html not found in bundle or override`

The `LogicalName` in your csproj does not match the `bundlePrefix` you passed to `Apps.Register`. Set `LogicalName` explicitly, because MSBuild mangles folder names otherwise. The two must agree exactly.

## No page builds and the log says `runtime dependency not found in UserLibs or next to the mod`

Sideload 1.10.0 or older ships AngleSharp, Jint and Esprima as separate DLLs, and one is missing. Update to 1.11+. See [Installation](/mods/sideload/guides/installation/).

## Everything stacks vertically

Every box is a flex column. Add `flex-direction: row`.

## A list will not scroll and pushes everything off screen

Add `min-height: 0` next to its `flex: 1`. The automatic minimum is the content height.

## A rule does nothing

Read the log. Sideload names each unusable rule once per app:

```
[Sideload] my-app: 4 Deklaration(en) wirkungslos - der Browser befolgt sie, diese Engine nicht:
    'padding: 1rem' - der Wert ist fuer diese Engine unlesbar, die Deklaration faellt weg.
    'align-items: baseline' wird gelesen und dann ignoriert - es passiert nichts.
    '@media (min-width: 640px)' wird uebersprungen - der ganze Block darin ist wirkungslos.
    Listener auf 'change' - dieses Ereignis stellt Sideload nie zu, der Handler laeuft nie.
```

Five things get named: a property with no case, an unreadable value, a value read then ignored by layout, a rejected selector, and a listener on an event that is never dispatched. The whole stylesheet is scanned on first load. Then check [CSS and layout reference](/mods/sideload/guides/css-and-layout/).

## `margin: 0 auto` does not centre

Auto margins are zero. Use `justify-content` or `align-self`.

## A `:hover` rule that changes size does nothing

State rules repaint and do not re-lay-out. Colours work, geometry does not.

## Contents draw outside a box with `overflow: hidden`

Sideload older than 1.1 does not clip with `hidden`. Update.

## A child's square corner draws over its parent's rounded one

The clip is an axis-aligned rectangle. Give the child the same radius, or inset it. See [Clip and scroll content](/mods/sideload/guides/clipping-and-scrolling/).

## Nothing scrolls sideways

There is no horizontal scroll area. Move the strip with a `transform` inside an `overflow: hidden` box.

## A character renders as an empty box

The game's font atlases carry Latin text only. Arrows, checkmarks, dingbats and `…` come out as tofu. Write the word, or use three full stops.

## Every word breaks after one character

The page was laid out while its panel was hidden, so text measured about ten times too short. Sideload refuses to build off screen. If you see this, something forces a render on a hidden view.

## The list jumps to the bottom while the player reads further up

`scrollToEnd()` ran on a render that changed nothing the reader cares about. The host restores scroll offsets across a rebuild. Call it only when the content grew.

## Typing into a field swallows characters

Report it. The engine keeps the control across a rebuild, so this should not happen.

## Typing in the app moves the player

No field has the caret, so every letter is a game binding. Put `data-typing` on the input. If it is there, the field is not painted in the current layout or is not a real `input`/`textarea`. See [Handle keys and typing](/mods/sideload/guides/keys-and-typing/).

## The caret will not stay in the box

Something else is selected: a control the player clicked, or a game screen. `data-typing` never takes the caret from either.

## A key claimed with `OnKey` never fires

Check three causes in order. The key was refused at parse time (the log says `[Sideload] '<app>' asked for the key ...`). The app on screen owns that key and did not claim it. Sideload is older than 1.10, where `OnKey` does nothing (`AppHandle.CanClaimKeys` tells you). A key that does nothing at a station, a shop or the console is correct.

## Escape needs two presses

Update to Sideload 1.10+. Older versions lose the press while a field has the caret.

## `addEventListener('change', ...)` never fires

Only `click`, `input`, `keydown`, `mouseenter`, `mouseleave`, `dragstart`, `drag`, `dragend`, `wheel`, `back` and `orientationchange` exist. The log names a listener on any other type.

## A click never arrives

A hit target exists only on elements that a state rule targets, on `button`/`a`/`input`/`textarea`, and on elements with a **click**, **drag** or **wheel** listener. A `mousedown` listener does not count.

## A list stopped scrolling after a drag or wheel listener went on a row

Both gestures are taken from the scroll area the element sits in. Move the listener to the thing that pans.

## A drag ends and the click handler fires too

A drag on a draggable element suppresses the click. If the click fires, the dragged element is not the clicked element.

## The pan hitches and the F9 render count climbs every frame

The page rebuilds every frame, at about 0.5 ms per box. Write `transform` instead of `left`/`top`. The list of properties that repaint is in [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/).

## The app cannot be closed with right-click

Your `back` handler takes the event every time. In landscape a two-pane app has nothing to step back from, so check `s1.orientation` first. See [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/).

## Turning the phone lands on the wrong pane

`@media` cannot decide that. Listen for `orientationchange` and pick the pane the player was looking at.

## `app.Open()` does nothing and the log says `open: '<id>' is not on a phone`

The app is not spawned yet. The home screen is built when the gameplay scene starts, so `Open()` from mod init or the main menu has nothing to open.

## An iconless app cannot be reached

`NoIcon()` removes the only door Sideload provides. Call `Open()` from your own entry point. On an older host the icon appears anyway and `Open()` does nothing. Check `AppHandle.CanOpenProgrammatically` before you register.

## Editing a file changes nothing

Either the watcher never started (the `Mods/<appId>/` folder must exist before first launch), or a stale `Mods/<appId>/` folder overrides your new bundle. The F9 overlay says which. See [Hot reload and test your app](/mods/sideload/guides/dev-loop-and-testing/).

## The game freezes when the app opens

Something used `await` on a promise the host settles later, usually `await fetch(...)`. Jint blocks the main thread inside `await`. Use `.then()` / `.catch()`. Sideload logs a warning at load when it sees the pattern.

## `s1.call` returns an empty string

No handler is registered under that app id and name (logged as a warning), or the handler threw (logged as an exception). Both look the same from the page, so treat `""` as a real answer.

## A page refuses to render and says it is too large

The page has over 20000 elements or 200 nesting levels. A loop is probably building nodes without clearing.

## Getting help

Attach `MelonLoader/Latest.log`. `[Sideload]` lines carry the app id, and a script error carries `file:line`. For a visual problem add an F9 screenshot and the `[Sideload/layout]` dump for the box.

[support.doodesch.de/sideload](https://support.doodesch.de/sideload)
