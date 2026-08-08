---
title: Using a mod API
description: How the DooDesch mod APIs are shipped, why calling one does not make it a hard dependency, and what to do when the host mod is not installed.
---

Every API on this site follows the same shape, so learning one teaches you all of them.

## Two ways to take the dependency

**Reference the DLL.** `Snitch.Api.dll`, `Hotline.Api.dll` and the rest are tiny assemblies with no
dependencies of their own. Add a `Reference` with a `HintPath` and you get compile-time checking.

**Or drop in the single file.** Each API is one `.cs` file. Copy it into your project and it compiles as part
of your assembly, which means no extra file to ship and no version to keep in step.

Both give the same surface. The file is the same one this site's reference is generated from.

## Calling an API you do not require

The APIs bind to their host over reflection at first use. When the host mod is not installed, every call is a
no-op that returns a default value instead of throwing. That is what lets you write:

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

## Load order is already handled

Registrations made before the host has loaded are queued and replayed when it binds. You do not need to delay
your setup or poll for the host.

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

## What the coverage number means

Each API index page states how many of its public members carry a documentation comment. A member without one
still exists and still works; it just has nothing to say here beyond its signature.
