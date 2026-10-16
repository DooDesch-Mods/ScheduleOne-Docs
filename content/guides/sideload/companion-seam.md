---
title: Serve an app to a second screen
description: Bind Sideload's internal bridge to serve the same app to a phone or browser on your network.
sidebar:
  order: 6
---

Read apps, bundle files and events from Sideload so your own server can show the same app on a second screen. Sideload serves nothing over the network itself. [Reflash](https://github.com/DooDesch-Mods/ScheduleOne-Reflash) uses this seam to serve bundles to a phone on the local network.

**You need:** Sideload 1.1.0+. This seam is not the stable API. The members are `internal`, reached by reflection through `Sideload.Bridge.SideloadBridge`. They are not in the shim and a later version can change them.

## Steps

1. Bind the type. Return if Sideload is not installed.

   ```csharp
   Type bridge = Type.GetType("Sideload.Bridge.SideloadBridge, Sideload", false);
   if (bridge == null) return;

   var listApps = bridge.GetField("ListAppsJson", BindingFlags.Public | BindingFlags.Static)
                        ?.GetValue(null) as Func<string>;
   ```

   If `Type.GetType` finds nothing, search `AppDomain.CurrentDomain.GetAssemblies()` for the type.

2. Null-check every field. A null field means an older host. Log the Sideload version you need and do nothing else.

3. Call only from the main thread. Accept connections on any thread, then marshal before you use a field.

4. Register the taps. Queue each event and return at once.

## Fields

| Field | Signature | Gives you |
|---|---|---|
| `ListAppsJson` | `Func<string>` | Every app as JSON: `id`, `title`, `iconLabel`, `portrait`, `declaredPortrait`, `canTurn`, `iconless`, `badge` |
| `ReadBundleFile` | `Func<string, string, byte[]>` | App id and bundle-relative path, or null. A file under `Mods/<appId>/` wins over the embedded copy |
| `ReadFrameworkAsset` | `Func<string, byte[]>` | A file Sideload ships. Only `s1.css` so far |
| `ReadRuntimeImage` | `Func<string, string, byte[]>` | App id and name. Returns the PNG behind `s1://<name>`, or null |
| `Invoke` | `Func<string, string, string, string>` | App id, handler name, argument. Same lookup and answer as `s1.call` |
| `SetCompanionTaps` | `Action<Action<string,string,string>, Action<string,int>, Action<string,string,string>>` | `emit(appId, name, payload)`, `badge(appId, count)`, `notify(appId, title, subtitle)`. Null clears one |

Reject path traversal in a bundle path before you call `ReadBundleFile`. Sideload resolves the path against a fixed root, but a refused request is clearer than a missing file.

## Rules

- `SetCompanionTaps` replaces the previous callbacks. There is one consumer. Pass three nulls when you stop.
- A tap fires inside whatever caused it, such as an update loop or an `s1.call`. Queue the event.
- Emit, badge and notify are tapped before the in-game part runs. They arrive even for an app never opened on the in-game phone.
- The seam grants nothing a page cannot do. `Invoke` is the same call the page makes.

## Limits

- No page runs. `Invoke` reaches the C# handler with no document or script engine. An app whose state lives only in JavaScript has nothing to read.
- No storage. `s1.storage` is not exposed. The companion page needs its own.
- No rendering. Your server draws the bundle with its own engine, so a page can look different. See [CSS and layout](/mods/sideload/guides/css-and-layout/).

## Check it works

`ListAppsJson()` returns the JSON for your registered apps. `Invoke` with a known handler returns the same string `s1.call` returns in game.

## Next

- [The bridge](/mods/sideload/guides/the-bridge/)
- [Surfaces](/mods/sideload/guides/surfaces/)
- [API reference](/mods/sideload/api/)
