---
title: "Troubleshooting"
description: "Symptom first."
sidebar:
  order: 11
---
Symptom first. Every entry here has actually happened.

## Nothing appears at all

**No icon on the phone.** Check the log for `app registered: <id>`. If it is missing, `Apps.Register` never ran -
usually because the mod threw earlier. If it is there but no icon follows, look for `spawned on the phone`.

**The app opens but the page is blank, and the log says `index.html not found in bundle or override`.** The
`LogicalName` in your csproj does not match the `bundlePrefix` you passed to `Apps.Register`. Without an explicit
`LogicalName`, MSBuild mangles folder names into the resource name. They must agree exactly.

**No page builds and the log says `runtime dependency not found in UserLibs or next to the mod`.** You are on
1.10.0 or older, where AngleSharp, Jint and Esprima shipped as separate DLLs and one of them is missing. From
1.11.0 they live inside `Sideload.dll` and this cannot happen. See [Installation](/mods/sideload/guides/installation/).

## It renders, but wrong

**Everything is stacked vertically when it should be side by side.** Every box is a flex **column** by default.
Add `flex-direction: row`.

**A list will not scroll, and it pushes everything else off screen.** Add `min-height: 0` next to its `flex: 1`.
A flex item's automatic minimum is its content height, so without it the box is as tall as its contents. The
single most common mistake.

**A rule does nothing.** Read the log before you debug anything else. Since 1.12.0 Sideload names every rule it
could not use, once per app, with the value that got dropped:

```
[Sideload] my-app: 4 Deklaration(en) wirkungslos - der Browser befolgt sie, diese Engine nicht:
    'padding: 1rem' - der Wert ist fuer diese Engine unlesbar, die Deklaration faellt weg.
    'align-items: baseline' wird gelesen und dann ignoriert - es passiert nichts.
    '@media (min-width: 640px)' wird uebersprungen - der ganze Block darin ist wirkungslos.
    Listener auf 'change' - dieses Ereignis stellt Sideload nie zu, der Handler laeuft nie.
```

Five things get named: a property with no case at all, a value the parsers cannot read (`1rem`, `calc(...)`,
`oklch(...)`), a value they read and the layout then ignores (`align-items: baseline`, `position: relative`), a
selector the DOM library rejected, and a listener on an event that is never dispatched. Before 1.12.0 only the
first of those was reported and the rest went out in silence, which is where most of the afternoons went.

It scans the whole stylesheet, not only the rules that match something on screen, so a sheet from a build tool
gets a full answer on the first load. Then check [CSS and Layout](/mods/sideload/guides/css-and-layout/).

**`margin: 0 auto` does not centre.** Auto margins are zero. Use `justify-content` or `align-self`.

**A `:hover` rule that changes size does nothing.** State rules repaint, they do not re-lay-out. Colours work,
geometry does not.

**Contents draw outside a box with `overflow: hidden`, across the phone and off it.** `hidden` did not clip
before 1.1.0 - it was parsed and dropped, and only `auto`/`scroll` produced a clip. Update, or give the box
`overflow: auto` and enough content to scroll.

**A child's square corner draws over its parent's rounded one.** The clip is an axis-aligned rectangle, so a
radius is not part of it. Give the child the same radius, or inset it. More of these in
[Clipping and Scrolling](/mods/sideload/guides/clipping-and-scrolling/).

**Nothing scrolls sideways.** There is no horizontal scroll area at all. Move the strip with a `transform`
inside an `overflow: hidden` box instead.

**A character renders as an empty box.** The game's font atlases carry Latin text and little else. Arrows,
checkmarks, dingbats and `…` all come out as tofu. Write the word; use three full stops.

**Every word breaks after one character, one letter per line.** The page was laid out while its panel was
hidden. Text is measured by a TextMeshPro probe, TMP initialises in `Awake`, and `Awake` never runs on an
inactive object - so measurements come back about ten times too short. Sideload refuses to build off screen, so
you should never see this; if you do, something is forcing a render on a hidden view.

**The list jumps to the bottom while the player is reading further up.** `scrollToEnd()` was called on a render
that changed nothing they care about. The host restores scroll offsets across a rebuild by itself - call it only
when the thing being read actually grew.

## Input

**Typing into a field swallows characters.** This is fixed in the engine - a rebuild used to destroy the control
and with it the caret and the half-typed word. If you see it, file it.

**Typing in the app moves the player.** No field has the caret, so every letter is still a game binding. Put
`data-typing` on the box the player is meant to type in and it takes the keyboard back whenever nothing else
holds it. If it is already there, the field is either not painted in the current layout or not a real
`input`/`textarea`. See [Keys and Typing](/mods/sideload/guides/keys-and-typing/).

**The caret will not stay in the box.** Something else is selected - a control the player clicked, or one of the
game's own screens. `data-typing` deliberately never takes the caret off either.

**A key claimed with `OnKey` never fires.** Three usual reasons, in order: it was refused at parse time, and the
log says so (`[Sideload] '<app>' asked for the key ...`); the app on screen owns that key and did not claim it;
or the installed Sideload predates 1.10.0, where `OnKey` is a no-op - `AppHandle.CanClaimKeys` answers that one.
A key that does nothing at a station, a shop or the console is working as intended.

**Escape needs two presses.** Fixed in 1.10.0. The game stops delivering the press entirely while a field has
the caret, so Sideload delivers it itself.

**`addEventListener('change', ...)` never fires.** Only `click`, `input`, `keydown`, `mouseenter`, `mouseleave`,
`dragstart`, `drag`, `dragend`, `wheel`, `back` and `orientationchange` exist. Since 1.12.0 a listener on
anything else is named in the log instead of failing quietly.

**A click never arrives.** A hit target is only wired on elements that a state rule targets, that are
`button`/`a`/`input`/`textarea`, or that the script has a **click**, **drag** or **wheel** listener on. A
`mousedown` listener does not count.

**A list stopped scrolling after a drag or wheel listener went on one of its rows.** That is the trade: both
gestures are taken away from the scroll area the element sits in, which is the only way an element can handle
them at all. Move the listener to the thing that actually pans.

**A drag ends and the click handler fires too.** It should not - a drag on a draggable element suppresses the
click that uGUI would otherwise raise. If it fires, the element being dragged is not the element being clicked.

**The pan hitches, and the F9 render count climbs every frame.** The page is being rebuilt per frame, at roughly
half a millisecond per box. Move by writing `transform` rather than `left`/`top`; that repaints one box and
leaves the render count flat. The full list of properties that repaint is in
[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/).

## Behaviour

**The app cannot be closed with right-click any more.** Your `back` handler is taking the event unconditionally.
In landscape a two-pane app has nothing to step back from, so check `s1.orientation` first - see
[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/).

**Turning the phone lands on the wrong pane.** `@media` cannot decide that. Listen for `orientationchange` and
pick the pane your player was just looking at.

**`app.Open()` does nothing and the log says `open: '<id>' is not on a phone`.** The app has not been spawned
yet. The home screen is built when the gameplay scene starts, so an `Open()` from mod init or from the main menu
has nothing to open.

**An iconless app cannot be reached.** `NoIcon()` removes the only door Sideload provides, and `Open()` is then
yours to call from wherever your entry point is. On an older host it is the other way round: the icon appears
anyway and your `Open()` does nothing. `AppHandle.CanOpenProgrammatically` tells the two apart, and the place to
check it is before you register.

**Editing a file changes nothing.** Either the watcher never started - the folder must exist before the first
launch - or the opposite: a stale `Mods/<appId>/` folder is overriding your freshly built bundle. The overlay
says which.

## Hard failures

**The game freezes solid the moment the app opens, and only Task Manager gets you out.** Something wrote `await`
on a promise the host settles later, almost always `await fetch(...)`. Jint blocks the main thread inside
`await`, so the frame that would deliver the answer never runs. Rewrite as `.then()` / `.catch()`. Sideload logs
a warning at load if it spots the pattern in your source.

**`s1.call` returns an empty string.** Either no handler is registered under that app id and name - a warning is
logged - or the handler threw, which logs the exception. Both look identical from the page, so handle `""` as a
real answer.

**A page refuses to render and says it is too large.** Over 20000 elements or 200 nesting levels. Both are
generous; hitting them means a loop is building nodes without clearing.

## Getting help

Include the MelonLoader log. `[Sideload]` lines carry the app id, and a script error carries `file:line`. If the
problem is visual, an F9 overlay screenshot plus the `[Sideload/layout]` dump for the box in question says more
than a description.

[support.doodesch.de/sideload](https://support.doodesch.de/sideload)

