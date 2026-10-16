---
title: Add phone features to your app
description: Add an icon, orientation, badge, notifications and a key shortcut to your app on the in-game phone.
sidebar:
  order: 4
---

Use the phone features around your page: icon, orientation, badge, notifications, key and images. To render a page outside the phone, see [Surfaces](/mods/sideload/guides/surfaces/).

**You need:** a registered app (`AppHandle`). See [Build your first app](/mods/sideload/guides/your-first-app/).

## Set the icon

1. Put `icon.png` in your bundle: square, 256x256, transparent outside the rounded square. Without it the app gets a flat colored square.
2. The caption is `iconLabel` from `Apps.Register`. It defaults to the title.

## Open the app from code, with no icon

Use `.NoIcon()` when the way in is somewhere else, such as a world object. The app still has its panel, page and exit key.

```csharp
Apps.Register("reflash-messages", "Reflash.Assets.reflash-messages", "Messages").NoIcon();
```

Open and close it from code:

```csharp
app.Open();              // same as pressing the icon
app.Close();             // back to the home screen
bool open = app.IsOpen;
```

- `Open()` closes any other open app and turns the phone to this app's orientation. The page is built on the first open.
- It does not take the phone out of the pocket. A phone raised later shows your app. `IsOpen` is true in that state; `IsOnScreen` also requires the phone to be up.
- Before the app is on a phone, `Open()` does nothing. The log says `open: '<id>' is not on a phone`. The home screen is built when the gameplay scene starts.
- Set `NoIcon()` during init. Set later, it applies from the next spawn (a scene change).

Needs Sideload 1.1.0+. On an older host, both calls do nothing and the icon appears anyway. Check first:

```csharp
if (!AppHandle.CanOpenProgrammatically)
{
    LoggerInstance.Error("Sideload 1.1.0 or newer is required - not registering.");
    return;
}
```

## Show the icon only sometimes

Call `Icon(bool)` while the game runs.

```csharp
app.Icon(consoleIsOn);   // show or hide the square
```

- Call it every time you evaluate the condition. The phone is rebuilt on every scene load, so do not cache "already showing".
- It is safe in an update loop.
- The first `Icon(true)` creates the square. Hiding only deactivates it, so it returns to its place.

## Support both orientations

1. Name the orientations in preference order. The first one is the opening orientation.

   ```csharp
   .Orientation("landscape")               // landscape only
   .Orientation("landscape", "portrait")   // both, opens landscape
   .Orientation("portrait", "landscape")   // both, opens portrait
   // no call                              -> landscape only
   ```

2. Style both in one sheet.

   ```css
   @media (orientation: portrait) {
     .app { flex-direction: column; }
     .sidebar { width: 100%; flex: 1; }
     .detail { display: none; }
     .app.on-detail .sidebar { display: none; }
     .app.on-detail .detail { display: flex; }
   }
   ```

- Do not build a turn button. The player turns the phone with the game's rotate keys (Q and E by default, gamepad triggers too). Sideload adds a "Rotate Phone" hint while a turnable app is open.
- Sideload remembers the choice per app. Do not store it.
- A turn lays the page out again. The document, script, scroll positions and field contents stay.
- `s1.setOrientation(v)` turns the phone from the page. It is refused with a log line if the app never declared that orientation. `s1.orientation` reads the current one.
- A two-pane split rarely fits 400 px. In portrait, use push navigation: the script marks the visible pane, the stylesheet hides the other. Use `orientationchange` and `back` (see [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/)).

## Set an unread badge

```csharp
app.Badge(unreadCount);   // zero clears it
```

Counts above 99 show as "99+". Set it when your count changes, not on a timer. The value survives a phone rebuild.

## Send a notification

```csharp
app.Notify("Jessi Waters", "on my way");
```

This raises the game's own slide-in notification with your app icon. It does nothing if the app is not on a phone yet. It interrupts the player, so use `Badge` for anything that can wait.

Skip it when the player already sees your app:

```csharp
if (!app.IsOnScreen) app.Notify(sender, text);
```

`IsOnScreen` is true when your app is the open app and the phone is up.

## Open the app with a key

1. Register the key in your mod. `OnKey` fires with the phone still in the pocket.

   ```csharp
   app.OnKey("Enter", _ => Online && app.Show());
   ```

2. Order the calls inside the handler: `Show()` first, then `Emit()`.

   ```csharp
   internal static bool QuickChat()
   {
       if (!_source.Online) return false;   // let another app have Enter
       if (!_app.Show()) return false;      // the game refused the phone

       _app.Emit("chat.compose", "everyone");
       return true;
   }
   ```

3. In the page, call `focus()` on your field when the event arrives.

- Call `Show()` before `Emit()`. The page is built on first open. Before that, nothing listens, so an early `Emit` is lost. `Show()` builds the page synchronously.
- Use `Show()`, not `Open()`. `Open()` picks the app but leaves the phone down, so the app is open and invisible. `Show()` raises the phone first, so the first layout uses the real viewport.
- Return `false` to decline. The press then goes to the next app that wants the same key. Decline when you cannot help the player.
- A `focus()` before the field is painted is granted when the field is rendered.

Key ownership, where keys are read, and caret rules are on [Keys and typing](/mods/sideload/guides/keys-and-typing/).

## Show images

For a file in your bundle:

```html
<img class="mark" src="glyph.png" alt="">
```

```css
.mark { width: 20px; height: 20px; color: #FFFFFF; }
```

- Set both width and height. Layout cannot read the PNG size, so an image without both is empty.
- The aspect ratio stays inside the box. `color` tints the image.

For a picture your mod makes at runtime, pass PNG bytes and use the `s1://` name:

```csharp
app.Image("avatar/" + steamId, pngBytes);   // null or empty bytes remove it
```

```html
<img class="avatar" src="s1://avatar/76561198000000001">
```

Sprites are cached per app. The same name replaces the picture.

## Look up what a page cannot do

| You want | Result |
|---|---|
| Read or set a scroll offset | No. `scrollToEnd()` is the only scroll member. The host restores offsets after a rebuild when the content looks the same. |
| Know where a box is | Yes, with Sideload 1.12+. `el.rect()` gives `{ x, y, width, height }` in CSS pixels from the screen's top left. It shows the last render, so a new box reads as zeroes. |
| Know the app opened or closed | Not from the page. `orientationchange` is the only state signal. Your mod can use `app.IsOpen` and `app.IsOnScreen`. |
| Get a key other than Enter | Name it in `data-keys` on a text field. It arrives as `keydown`. Enter and Escape are refused: they already arrive as `keydown` and `back`. |
| Get a key while the app is closed | From your mod: `app.OnKey(...)`. |
| Type without a click first | Yes. Set `data-typing` on the field. |
| Focus a control from script | Only `input` and `textarea`, with `el.focus()`. |
| Clipboard, files, time zone | No. There is no `navigator`. |

If the page cannot do it, ask whether your mod can, behind an `s1.call`.

## Check it works

The icon, badge and notification appear on the phone. The log shows a line for each refused call, such as the `open:` message above.

## Next

- [Surfaces](/mods/sideload/guides/surfaces/)
- [Keys and typing](/mods/sideload/guides/keys-and-typing/)
- [The bridge](/mods/sideload/guides/the-bridge/)
- [API reference](/mods/sideload/api/)
