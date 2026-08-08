---
title: "Phone Integration"
description: "What being on the phone gives your app, and the short list of things it does not."
sidebar:
  order: 8
---
What being on the phone gives your app, and the short list of things it does not.

The phone is not the only place a page can go. Everything on this page is what the phone adds on top of the
renderer - icon, badge, notifications, orientation. If you want the renderer in a panel of your own, with none
of that, see **[Surfaces](/mods/sideload/guides/surfaces/)**.

## The app icon

Ship `icon.png` in your bundle: a square PNG, 256x256 is plenty, transparent outside the rounded square, drawn
the way the vanilla app icons are. Without one your app gets a flat coloured square derived from its id.

The caption under it is `iconLabel` from `Apps.Register`, defaulting to the title.

## An app with no icon

`.NoIcon()` keeps the app off the home screen. It still gets its panel, its page and the exit key - only the
square is missing. For an app whose way in already exists somewhere else: a vanilla icon your mod has taken over,
a world object, another app handing off.

```csharp
Apps.Register("reflash-messages", "Reflash.Assets.reflash-messages", "Messages").NoIcon();
```

With no icon, `Open()` is the only route in.

```csharp
app.Open();              // exactly as pressing the icon would
app.Close();             // back to the home screen
bool open = app.IsOpen;
```

`Open()` closes whatever else the phone has open and turns the phone to this app's orientation, because it is the
same entry point the icon uses rather than a second one beside it. The page is built on the first open, not at
spawn, so that first call is where a page build is paid for.

Two limits. Before the app is on a phone there is nothing to open, so the call does nothing and the log says
`open: '<id>' is not on a phone`; the home screen is built when the gameplay scene starts. And it does not take
the phone out of the player's pocket - it decides which app is open, so a phone raised afterwards comes up on
yours. `IsOpen` is true in exactly that state, which is what separates it from `IsOnScreen`: that one also asks
whether the phone is up.

`NoIcon()` is read when the app is spawned onto a phone, so set it during init. Set after a spawn it applies to
the next one, which a scene change brings anyway.

### An icon that comes and goes

`Icon(bool)` makes the same decision while the game is running, for an app whose answer changes under the
player's hands:

```csharp
app.Icon(consoleIsOn);   // put the square there, or take it away
```

hash uses this: it opens on the console key, and it shows a home-screen square exactly while the game's console
is switched on - which is a toggle in the settings window, so the answer flips mid-session.

Two things follow from how the phone is built. Say it again rather than remembering it: the phone is rebuilt on
every scene load, and a remembered "already showing" would be a promise about a square that no longer exists.
And it is safe from an update loop - unlike `NoIcon()` the call is not queued until the host binds, so polling a
condition against a Sideload that never arrives cannot pile up work.

The square is created on the first `Icon(true)`, because an app registered as iconless never made one. Hiding
only deactivates it, so its place on the home screen survives and it returns where it was.

### Check the host before you take this route

```csharp
if (!AppHandle.CanOpenProgrammatically)
{
    LoggerInstance.Error("Sideload 1.1.0 or newer is required - not registering.");
    return;
}
```

Against an older Sideload both calls are silent no-ops: the icon you asked to suppress appears anyway, and the
entry point you built calls into nothing. The player gets a home screen you did not design and a door that does
nothing. Refuse to register and name the version instead - that is a message someone can act on.

## Both orientations

An app names the orientations it supports, in preference order. The first is what it opens in; naming two is
what lets the **player** turn the phone.

```csharp
.Orientation("landscape")               // landscape only, the phone never turns
.Orientation("landscape", "portrait")   // both, opens landscape
.Orientation("portrait", "landscape")   // both, opens portrait
// no call at all                       -> landscape only
```

Saying nothing locks you to landscape, which is the only safe reading of silence: an app that never styled
portrait must not be turned into it.

**Do not build a turn button.** The player turns the phone with the game's own rotate keys - Q and E out of the
box, gamepad triggers too, rebindable in the game's controls screen - and Sideload adds a "Rotate Phone" line to
the game's key-hint strip while a turnable app is open. Your app's screen stays yours.

The choice is **remembered per app**. Do not store it yourself.

`s1.setOrientation(v)` exists for the rare app that must turn itself for a reason of its own - a video, a map.
It is refused with a log line when the app never declared that orientation. `s1.orientation` reads the current
one.

A turn re-measures the viewport and lays the page out again; the document and the script survive, so scroll
positions and field contents are kept. Style both from one sheet:

```css
@media (orientation: portrait) {
  .app { flex-direction: column; }
  .sidebar { width: 100%; flex: 1; }
  .detail { display: none; }
  .app.on-detail .sidebar { display: none; }
  .app.on-detail .detail { display: flex; }
}
```

A two-pane split rarely survives 400px, so portrait usually wants push navigation - the script marks which pane
is showing, the stylesheet decides what that means. Pair it with `orientationchange` and `back`, both in
**[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)**.

## Unread badge

```csharp
app.Badge(unreadCount);   // zero clears it
```

The same red badge the vanilla apps use. Counts above 99 read as "99+". Set it whenever your own count changes,
not on a timer: the value survives the phone being rebuilt, so setting it once is enough and setting it again is
cheap.

## Notifications

```csharp
app.Notify("Jessi Waters", "on my way");
```

Raises one of the game's own phone notifications - the slide-in the vanilla apps use - carrying your app's icon.
Nothing happens if the app is not on a phone yet.

This interrupts whatever the player is doing, so spend it on what they would want to be interrupted for. A count
that can wait belongs in `Badge`.

## A key as the way in

```csharp
app.OnKey("Enter", _ => Online && app.Show());
```

`OnKey` reaches your mod with the phone still in the player's pocket, so one press can raise it with your app
already open. Whose key it is when two apps want one, where Sideload will and will not read it, and how a box
keeps the caret afterwards are all on **[Keys and Typing](/mods/sideload/guides/keys-and-typing/)**. What belongs here is the order:

```csharp
internal static bool QuickChat()
{
    if (!_source.Online) return false;   // nothing to write to; let somebody else have Enter
    if (!_app.Show()) return false;      // the game refused the phone

    _app.Emit("chat.compose", "everyone");
    return true;
}
```

**`Show()` before `Emit()`.** The page is built the first time the app is opened, and a page that does not
exist yet has nothing subscribed to your event - so emitting first drops it on the floor for exactly the app
that has never been opened, which is the case the key exists for. `Show()` builds it synchronously, so by the
next line the listener is there.

**`Show()`, not `Open()`.** `Open()` decides which app is open; it does not take the phone out. An app opened
with `Open()` alone is open and invisible, which is right for a background update and wrong for a key the
player just pressed. `Show()` is the pair, in the order that matters: raising first means the first frame is
laid out against the real viewport rather than a hidden panel, which is the difference between a page that
measures its text and one that wraps every line to nothing.

**Returning false is not failure.** It hands the press to the next app that wants the same key. Decline when
you cannot use it - an app that opens to say "there is nobody to message" is a phone appearing for no reason.

Then the page lands where it was told and calls `focus()` on its compose field. A focus asked for before the
field is painted is granted by the render that creates it, so there is nothing to wait for.

## Check before you interrupt

```csharp
if (!app.IsOnScreen) app.Notify(sender, text);
```

True while the player can actually see your app: it is the one the phone has open, and the phone is up. Ask
before interrupting - an event the player is already watching happen does not deserve a notification, and the
same event with the phone in their pocket does.

## Images

`<img src="...">` paints a file from your bundle:

```html
<img class="mark" src="glyph.png" alt="">
```

```css
.mark { width: 20px; height: 20px; color: #FFFFFF; }
```

**Both dimensions are required.** The layout runs without Unity and cannot open a PNG to learn an intrinsic size
the way a browser does, so an image with no width and height is a box of nothing. The aspect ratio is preserved
inside whatever box you give it, and `color` tints the image - so one white glyph works on a dark bar and on a
light one.

For a picture your mod produces at runtime - fetched, generated, per player - hand it over as PNG bytes and
reference it by name:

```csharp
app.Image("avatar/" + steamId, pngBytes);   // null or empty bytes remove it
```

```html
<img class="avatar" src="s1://avatar/76561198000000001">
```

Sprites are cached per app. Supplying the same name again replaces the picture.

## What the phone does NOT give a page

Hard walls, not gaps you can work around from the page. Check here before promising a feature.

| You want | Reality |
|---|---|
| read or set a scroll offset | **No.** `scrollToEnd()` is the only scroll member. You cannot restore a per-view scroll position, and you cannot ask "is the reader at the bottom". The host restores offsets across a rebuild by itself, and since 1.12.0 only where the content is recognisably the same. |
| know where a box ended up | **Yes, since 1.12.0.** `el.rect()` gives `{ x, y, width, height }` in css pixels from the top left of the screen. That plus `mouseenter` is what a hover tooltip needs. It reflects the last render, so a box you just created reads as zeroes. |
| know the app was opened or closed | **No** from the page. `orientationchange` is the only signal about its own state. Your **mod** can ask with `app.IsOpen` and `app.IsOnScreen`. |
| a key other than Enter | **Ask for it.** A text field names the keys it wants in `data-keys` and they arrive as `keydown`. Enter and Escape are refused - they already arrive as `keydown` and `back`. |
| a key that reaches you with the app CLOSED | **From your mod, not the page.** `app.OnKey(...)`; `data-keys` needs a page on screen and so cannot be the thing that puts one there. |
| typing to land in your box without a click first | **Yes.** `data-typing` on the field. |
| focus a control from script | **A field only.** `el.focus()` puts the caret in an `input` or `textarea`. On anything else it does nothing. |
| the clipboard, a file, a time zone | **No.** There is no `window` and no `navigator`. |

Anything a page cannot do, your **mod** usually can - it is ordinary C# with the whole game in reach. The
question is not "how do I do this in JavaScript" but "does this belong behind an `s1.call`".

The three keyboard mechanisms are covered together on **[Keys and Typing](/mods/sideload/guides/keys-and-typing/)**.

