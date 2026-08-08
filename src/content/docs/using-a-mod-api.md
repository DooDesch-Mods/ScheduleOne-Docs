---
title: Using a mod API
description: How the DooDesch mod APIs are shipped, why calling one does not make it a hard dependency, and what to do when the host mod is not installed.
---

The APIs are not all shaped the same way, so the page that matters most is the **Consume this API** block at
the top of each mod's reference. It names the exact file or assembly for that mod, the csproj lines, and what
happens when the host is absent. This page covers what they do have in common.

## Two kinds of API

**Six are a single file you copy in.** Snitch, Hotline, Sideload, TightBeam, Clipwise and Hash keep their API
in one `.cs` file with no dependencies of its own. You copy that file into your project; it compiles as part
of your assembly, so there is nothing extra to ship. Five of them also have a small `.Api` project you could
build into an assembly instead - but no release publishes that DLL, so you would be building it yourself.

**Three expose their API from the mod's own assembly.** SideHustle, Personnel and Inkorporated have no
separate API package. You reference the mod's DLL directly, and there is nothing to copy.

That difference decides what happens when the host mod is missing, which is the next section.

## Calling an API you do not require

**With a copied file**, the shim binds to its host over reflection at first use. When the host mod is not
installed, every call is a no-op that returns a default instead of throwing. That is what lets you write:

```csharp
using Snitch.Api;

using (Profiler.Sample("MyMod.Pathfinding"))
{
    // runs the same whether or not Snitch is installed
}
```

and ship it unconditionally. Declare the host as optional so load order cannot bite you:

```csharp
[assembly: MelonOptionalDependencies("Snitch")]
```

**With a referenced mod assembly**, there is no shim to absorb the absence. If SideHustle is not installed,
`SideHustle.API` is not there either, and touching it throws. Mark the dependency optional the same way, but
keep your calls behind a check that runs only once you know the host loaded.

## Load order is already handled, for the copied-file APIs

Registrations made before the host has loaded are queued and replayed when it binds. You do not need to delay
your setup or poll for the host. This is a property of the shims, not of the referenced-assembly APIs.

## Gating hot paths

The no-op still costs a call. Where that matters, the APIs expose a `bool` that is false until the host is
both present and active:

```csharp
if (Profiler.Enabled)
{
    using (Profiler.Sample("MyMod.Inner")) { }
}
```

## The main thread rule

Callbacks you register are invoked by the host on Unity's main thread, so they may touch game objects. Your
own calls into an API must come from the main thread too.

## Which version added what

The reference documents the mod's latest release. Where a member arrived later than the mod's first
API release, its entry says **Added in `x.y.z`** - so you can tell whether you may call it while
supporting an older host. Members without that line have been there since the API existed.

Each mod whose API has changed also has a **Changes by version** page: everything added and everything
removed, per release. Removals are the ones worth reading. They are derived by comparing the API surface
between release tags, not from a hand-kept list.

## What the coverage number means

Each API index page states how many of its public members carry a documentation comment. A member without one
still exists and still works; it just has nothing to say here beyond its signature.
