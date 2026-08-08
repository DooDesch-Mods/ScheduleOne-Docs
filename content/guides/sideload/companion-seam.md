---
title: "Companion Seam"
description: "Sideload serves nothing over the network itself."
sidebar:
  order: 13
---
Sideload serves nothing over the network itself. It does hold everything a server would need to put the same app
on a second screen - a phone on the same wifi, a browser on the same machine - and since 1.1.0 that is reachable
from one place: the app list, the bundle files, the framework stylesheet, runtime images, a way to run an
`s1.call` handler with no page involved, and a tap on everything the host pushes at pages.

The mod that uses it is [Reflash](https://github.com/DooDesch-Mods/ScheduleOne-Reflash), which serves the same
bundles to a real phone on the local network.

## Status: not the stable API

The members are `internal` and reached by reflection through `Sideload.Bridge.SideloadBridge`. That is the same
type `Sideload.Api` binds, but none of this is in the shim: there is no single file to compile in, no
compile-time contract, and no promise that a signature survives a later version. `Sideload.Api` is the surface
that will be kept; this is not it.

If you build on it, bind it yourself, null-check every delegate, and say which Sideload version you need when
one is missing.

## Binding it

```csharp
Type bridge = Type.GetType("Sideload.Bridge.SideloadBridge, Sideload", false);
if (bridge == null) return;   // Sideload is not installed

var listApps = bridge.GetField("ListAppsJson", BindingFlags.Public | BindingFlags.Static)
                     ?.GetValue(null) as Func<string>;
```

The cast works because `Func<>` and `Action<>` are BCL types both assemblies share, which is the whole reason
every signature here is plain BCL. `Type.GetType` finds the host once its assembly is loaded under its own name;
walk `AppDomain.CurrentDomain.GetAssemblies()` looking for the type as a fallback.

A field that comes back null is an older host. Report it and stay out of the way - the in-game phone is not
affected by your absence.

## What is there

| Field | Signature | What it gives you |
|---|---|---|
| `ListAppsJson` | `Func<string>` | every registered app as JSON: `id`, `title`, `iconLabel`, `portrait`, `declaredPortrait`, `canTurn`, `iconless`, `badge` |
| `ReadBundleFile` | `Func<string, string, byte[]>` | app id and a bundle-relative path, or null. Resolved exactly as the in-game view resolves it, so a file under `Mods/<appId>/` wins over the embedded copy |
| `ReadFrameworkAsset` | `Func<string, byte[]>` | a file Sideload itself ships. `s1.css`, and nothing else so far |
| `ReadRuntimeImage` | `Func<string, string, byte[]>` | app id and name, giving the PNG behind `s1://<name>`, or null |
| `Invoke` | `Func<string, string, string, string>` | app id, handler name, argument. The same lookup `s1.call` performs, with the same answer |
| `SetCompanionTaps` | `Action<Action<string,string,string>, Action<string,int>, Action<string,string,string>>` | `emit(appId, name, payload)`, `badge(appId, count)`, `notify(appId, title, subtitle)`. Null clears one |

`ReadBundleFile` does not touch the filesystem with the path you hand it - `AppBundle` resolves it against a
fixed root - but reject traversal before you ask anyway, so a request that means nothing is refused rather than
quietly missing.

## Rules

**All of it is main-thread only.** Accept connections on whatever thread you like; marshal before you touch any
of these. `Invoke` runs a mod's handler, and a handler touches game state.

**One consumer for the taps.** `SetCompanionTaps` assigns rather than combines, so a second caller replaces the
first. Clear yours with three nulls when you stop.

**A tap fires inside whatever caused it** - in the middle of a mod's update loop, or inside an `s1.call`. Queue
the event and return. Work done in a tap is work done in someone else's frame.

**Emit, badge and notify are tapped before the in-game half runs**, so they arrive even for an app that was never
opened on the in-game phone. A page only subscribes once it has been built, and an app living on a companion
device may never have been built here at all.

**It grants no capability a page does not have.** Every read is something the app's own page could read, and
`Invoke` is the call the page already makes. A companion is a second way into the same door.

## What it does not give you

**No page runs.** `Invoke` reaches the C# handler with no document and no script engine anywhere near it. An app
whose state lives in its JavaScript rather than behind an `s1.call` has nothing for a companion to read - which
decides, in practice, which apps can have a second screen at all.

**No storage.** `s1.storage` is per app under `UserData/Sideload/`, and nothing here exposes it. A companion's
page needs its own.

**No layout, no rendering.** You get the bundle and the answers. Whatever draws them on the second screen is
yours, and it will not be Sideload's engine, so a page that relies on the differences documented in
**[CSS and Layout](/mods/sideload/guides/css-and-layout/)** will not look the same in a browser.

