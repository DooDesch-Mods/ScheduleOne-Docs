---
title: Install and troubleshoot
description: How to install a Schedule I mod with a manager or by hand, how to update it, and what to check first when the game stops loading.
sidebar:
  order: 1
---

Every mod on this site is a MelonLoader mod for **Schedule I on the IL2CPP branch** - the normal Steam build.
None of them need the Mono branch.

## With a mod manager

Use [r2modman](https://thunderstore.io/c/schedule-i/p/ebkr/r2modman/) or
[Gale](https://thunderstore.io/c/schedule-i/p/Kesomannen/GaleModManager/). Install the mod from Thunderstore
and the manager pulls in MelonLoader, S1API and any other dependency, in the right place. Each mod page here
links straight to its Thunderstore package.

This is the recommended route. If you are reading this because something broke, the manager also gives you the
one thing manual installs do not: a profile you can disable mods in, one at a time.

## By hand

1. Install **MelonLoader 0.7.3 or newer** for Schedule I from
   [github.com/LavaGang/MelonLoader](https://github.com/LavaGang/MelonLoader/releases). That repository is the
   only official source; sites that look like a MelonLoader homepage are not run by its authors.
2. Run the game once so MelonLoader creates its folders.
3. Drop the mod's `.dll` into `Schedule I/Mods/`.
4. Install whatever the mod's page lists under **Requires**, the same way.

The mod's page names its dependencies with versions. A missing dependency is the most common reason a mod does
nothing after installing.

## Updating

Update the mod and its dependencies together. A mod built against a newer dependency will usually load and then
fail at the point it calls something that is not there yet - so a mod that worked yesterday and misbehaves today
is often a half-finished update rather than a broken mod.

After a **game** update, expect a lag: the game moves, and mods follow. Check the mod's changelog on this site
before filing anything.

## When something is wrong

**Read the log first.** MelonLoader writes `Schedule I/MelonLoader/Latest.log`. It records every mod that
loaded, every one that failed, and the exception if one threw. Almost every question is answered in it.

**Find the culprit by halving.** Disable half your mods, start the game, and see whether the problem is still
there. Repeat with the half that still misbehaves. Four or five restarts identify one mod out of thirty; guessing
does not.

**Check the obvious three.** MelonLoader version, the mod's listed dependencies, and whether you are on the
IL2CPP (normal Steam) build.

## Asking someone

The **[DooDesch Mods Discord](https://mods.doodesch.de)** is the fastest route when the log has not told
you enough, or when you are not sure whether what you are seeing is a bug at all. Bring the log.

## Reporting it

Every mod has a support link on its page, and a bug with a log attached belongs there rather than in chat -
an issue survives, a message scrolls away. What makes a report actionable:

- `MelonLoader/Latest.log` attached, not pasted in pieces
- the mod version and the game version
- whether it happens in single player, as host, or as a client
- what you did immediately before

Screenshots of a crash help far less than the log does.
