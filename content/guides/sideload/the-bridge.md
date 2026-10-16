---
title: Call C# from the page and back
description: Send strings between your page and your mod with s1.call, Emit, storage and fetch.
sidebar:
  order: 3
---

Move data between your page and your C# mod. Strings cross in both directions. Use JSON for structured data. No CLR object reaches the script and no script object reaches your mod.

**You need:** a registered app. See [Build your first app](/mods/sideload/guides/your-first-app/).

| Direction | C# | JS |
|---|---|---|
| page asks the mod | `app.OnCall("name", arg => answer)` | `const s = s1.call('name', 'arg')` |
| mod tells the page | `app.Emit("name", payload)` | `s1.on('name', payload => ...)` |
| page keeps its own state | - | `s1.storage.get/set/remove/clear` |
| page reaches the network | `app.AllowHost("api.example.com")` | `fetch(url, init).then(...)` |
| phone orientation | `app.Orientation("landscape", "portrait")` | `s1.orientation`, `s1.setOrientation(v)` |
| player pressed back | - | `document.addEventListener('back', ...)` |

## Steps

### 1. Answer a call from the page

1. Register handlers on the app. Handlers are scoped to your app id, so two mods can both own `list`.

   ```csharp
   app.OnCall("items.list", _ => string.Join("\n", Items))
      .OnCall("items.add", Add)
      .OnCall("items.clear", _ => { Items.Clear(); return "ok"; });
   ```

2. Call it from the page. `s1.call` is synchronous. It runs your handler on the Unity main thread in the same frame, so it can touch game state. Do not `await` it.

   ```js
   const raw = s1.call('items.list');
   ```

A call with no handler returns `""` and logs a warning. A handler that throws returns `""` and logs the exception. The page sees only the empty string, so show a message for it.

### 2. Push an event to the page

1. Emit from `OnUpdate`, when something changed. Do not emit on a timer.

   ```csharp
   public override void OnUpdate()
   {
       if (_revision == _pushed) return;
       _pushed = _revision;
       _app?.Emit("items.changed", Items.Count.ToString());
   }
   ```

2. Subscribe in the page.

   ```js
   s1.on('items.changed', render);
   ```

Keep the payload small. Send "something changed" and let the page ask for the data.

Never call `Emit` inside an `OnCall` handler. It re-enters the script engine while the engine is still on the stack.

### 3. Send structured data

`Sideload.Api` has no JSON writer. Write one, or copy the 60-line [`Json.cs`](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab/blob/main/Chat/Json.cs) from WhatsDab. The page has `JSON.parse`.

```csharp
app.OnCall("chat.threads", _ =>
    Json.Array()
        .Item(Json.Object().Add("id", t.Id).Add("name", t.Name).Add("unread", t.Unread))
        .Close());
```

```js
const threads = JSON.parse(s1.call('chat.threads') || '[]');
```

For a simple list, use a newline-separated string. For several inbound arguments, use one separator character. Reject a payload that contains a second one:

```csharp
int split = raw.IndexOf('\n');
if (split <= 0) return "error";
string id = raw.Substring(0, split), text = raw.Substring(split + 1);
if (text.IndexOf('\n') >= 0) return "error";
```

### 4. Keep page state in s1.storage

`s1.storage` holds strings by name. It writes one JSON file per app at `UserData/Sideload/<appId>.json`.

```js
const tab = s1.storage.get('tab', 'players');
s1.storage.set('tab', 'items');
s1.storage.remove('tab');
```

It is not the game save. Use it for UI state such as the last tab or a draft. Keep world data in your mod behind an `s1.call`.

Do not store the phone orientation here. Sideload remembers it per app.

`localStorage` and `sessionStorage` write to the same store.

### 5. Allow a network host and fetch

A page reaches no host until your mod allows it.

```csharp
Apps.Register("mystash", "MyMod.Assets.mystash")
    .AllowHost("api.example.com")
    .AllowHost("*.cdn.example.com");
```

- `*.example.com` covers one label under it, not `example.com` itself.
- Ports are ignored.
- The scheme must be https, except for `127.0.0.1` and `localhost`.
- Every redirect hop is checked again.
- Limits: 10 s timeout, 4 MB response, 8 requests in flight.
- A blocked request rejects with the exact `AllowHost` call that is missing.

Never `await` a fetch. It blocks the thread that delivers the answer and freezes the game. Use `.then()` and `.catch()`:

```js
fetch('https://api.example.com/status')
  .then(r => r.json())
  .then(data => render(data))
  .catch(e => console.error('status failed:', e));
```

## What a page cannot reach

There is no `navigator`, no file access and no clipboard. Timers are the four standard ones plus `requestAnimationFrame`. `window` is an alias for the global object. For anything else, put it behind an `s1.call`. Your mod is ordinary C# with the whole game in reach.

For limits that `s1.call` cannot fix, see [Phone integration](/mods/sideload/guides/phone-integration/).

## Check it works

The page shows the string your handler returned. When an event is emitted, the `s1.on` callback runs. Failures appear in `MelonLoader/Latest.log`.

## Next

- [Phone integration](/mods/sideload/guides/phone-integration/)
- [Companion seam](/mods/sideload/guides/companion-seam/)
- [API reference](/mods/sideload/api/)
