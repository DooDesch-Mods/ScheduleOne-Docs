---
title: "The Bridge"
description: "Everything between your C# and your page crosses here."
sidebar:
  order: 3
---
Everything between your C# and your page crosses here. Strings both ways, JSON for anything structured. No CLR
object ever reaches the script and no script object ever reaches your mod.

| Direction | C# | JS |
|---|---|---|
| page asks the mod | `app.OnCall("name", arg => answer)` | `const s = s1.call('name', 'arg')` |
| mod tells the page | `app.Emit("name", payload)` | `s1.on('name', payload => ...)` |
| page keeps its own state | - | `s1.storage.get/set/remove/clear` |
| page reaches the network | `app.AllowHost("api.example.com")` | `fetch(url, init).then(...)` |
| which way the phone is held | `app.Orientation("landscape", "portrait")` | `s1.orientation`, `s1.setOrientation(v)` |
| the player pressed back | - | `document.addEventListener('back', ...)` |

## s1.call is synchronous

`s1.call(name, arg)` runs your C# handler **on the Unity main thread, in the same frame**, and returns its
string. There is nothing to await. It may touch game state directly.

```js
const raw = s1.call('chat.threads');
```

```csharp
app.OnCall("chat.threads", _ => Json.Of(Chat.Threads));
```

Do not write `await s1.call(...)` and do not expect a Promise. You get the string back on the same line.

A call with no handler returns `""` and logs a warning; a handler that throws returns `""` and logs the
exception. Both are silent from the page's side, so **treat an empty string as a real answer** and say so on
screen rather than rendering nothing.

## Handlers are scoped to your app

Handlers are keyed by app id, so two mods may both own a call named `list` without colliding. Register them in
one chain:

```csharp
app.OnCall("items.list", _ => string.Join("\n", Items))
   .OnCall("items.add", Add)
   .OnCall("items.clear", _ => { Items.Clear(); return "ok"; });
```

## Emit pushes, it does not poll

`app.Emit("name", payload)` reaches every `s1.on("name", fn)` in your page. Send an event when something
**actually changed**, not on a timer - an idle app should cost one integer comparison per frame:

```csharp
public override void OnUpdate()
{
    if (_revision == _pushed) return;
    _pushed = _revision;
    _app?.Emit("items.changed", Items.Count.ToString());
}
```

The payload is deliberately thin. Send "something changed" and let the page ask for what it needs; pushing whole
state means serialising everything on every keystroke-sized change.

**Never `Emit` from inside an `OnCall` handler.** That re-enters the script engine while it is still on the
stack. Emit from your update loop.

## JSON for anything structured

There is no JSON writer in `Sideload.Api` - it is a zero-reference file and stays that way. Write one, or copy
the ~60-line one from the [reference app](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab/blob/main/Chat/Json.cs).
The page has `JSON.parse` already.

```csharp
app.OnCall("chat.threads", _ =>
    Json.Array()
        .Item(Json.Object().Add("id", t.Id).Add("name", t.Name).Add("unread", t.Unread))
        .Close());
```

```js
const threads = JSON.parse(s1.call('chat.threads') || '[]');
```

For simple lists a newline-separated string is fine and cheaper. For inbound arguments, one separator character
you forbid in the payload is often enough - but only if you **reject** a second one rather than folding it in:

```csharp
int split = raw.IndexOf('\n');
if (split <= 0) return "error";
string id = raw.Substring(0, split), text = raw.Substring(split + 1);
if (text.IndexOf('\n') >= 0) return "error";   // the wire format cannot carry it
```

## s1.storage

Strings keyed by name, one JSON file per app under `UserData/Sideload/<appId>.json`.

```js
const tab = s1.storage.get('tab', 'players');
s1.storage.set('tab', 'items');
s1.storage.remove('tab');
```

Deliberately **not** the game save. UI state - the last tab, a sort order, a draft - should survive a reload but
must never travel with a save file or diverge between co-op peers. Anything that belongs to the world belongs in
your mod, behind an `s1.call`.

Do not store the phone orientation here. Sideload remembers the player's choice per app already - see
**[Phone Integration](/mods/sideload/guides/phone-integration/)**.

## fetch, default deny

A page reaches no host until **your mod** names it. The page cannot add to that list, because the page is data a
player can edit.

```csharp
Apps.Register("mystash", "MyMod.Assets.mystash")
    .AllowHost("api.example.com")
    .AllowHost("*.cdn.example.com");
```

`*.example.com` covers one label under it, not `example.com` itself. Ports are ignored. The scheme must be
https unless the host is `127.0.0.1` or `localhost`. Every redirect hop is rechecked, there is a 10 s timeout, a
4 MB response cap and a limit of 8 requests in flight. A blocked request rejects with the exact `AllowHost` call
that is missing.

**Never `await` a fetch.** Jint's `await` blocks the very thread that would deliver the answer, so the game
freezes hard and only Task Manager gets you out. Use `.then()` / `.catch()`:

```js
fetch('https://api.example.com/status')
  .then(r => r.json())
  .then(data => render(data))
  .catch(e => console.error('status failed:', e));
```

## What a page cannot reach

The page is sandboxed to this list. There is no `navigator`, no file access, no clipboard, and no timers beyond
the four standard ones plus `requestAnimationFrame`. `window` exists as an alias for the global object, and
`localStorage` and `sessionStorage` write into the same per-app store as `s1.storage` - neither reaches the
machine. If your app needs something else, the answer is almost always "put it behind an `s1.call`" - your
**mod** is ordinary C# with the whole game in reach.

The exceptions, which no `s1.call` can fix, are in **[Phone Integration](/mods/sideload/guides/phone-integration/)** under what the
phone does not give a page.

## Reaching the same app from outside the game

There is a second, internal seam on the bridge for a server putting the same bundle on a phone or a browser: the
app list, the bundle files, `s1.css`, runtime images, an `s1.call` with no page behind it, and a tap on emit,
badge and notify. It is not part of `Sideload.Api` and it is not stable. See
**[Companion Seam](/mods/sideload/guides/companion-seam/)** before you build on it.

