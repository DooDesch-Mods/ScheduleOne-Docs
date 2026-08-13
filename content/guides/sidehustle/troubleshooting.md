---
title: "Troubleshooting"
description: "Always check the MelonLoader log first: `…/Schedule I/MelonLoader/Logs/` (newest file)."
sidebar:
  order: 4
---
Always check the MelonLoader log first: `…/Schedule I/MelonLoader/Logs/` (newest file). Side Hustle logs when
it initializes, every gamemode that registers, and any problem with a warning.

## The "Side Hustle" entry is missing from the main menu

- **Mod not loaded?** The log should show `Side Hustle <version> ready - N gamemode(s) registered so far.` If
  not, `SideHustle.dll` is not in `…/Schedule I/Mods/`, or MelonLoader/S1API are not installed.
- **Hidden by the toggle.** Check `Enabled` in
  `UserData/MelonPreferences.cfg` under `[SideHustle_01_Main]`. Return to the main menu after changing it.
- **Menu not laid out yet.** The button is injected when the menu scene loads (with a short retry). Backing
  out to the main menu again re-injects it.

## My gamemode does not appear in the list

- **Registered too late or not at all?** The log should show `Gamemode registered: '<Name>' (<id>).` Register
  in your `OnInitializeMelon` - see [API Reference](/mods/sidehustle/api/).
- **Side Hustle absent at load.** Add `[assembly: MelonOptionalDependencies("SideHustle")]` so the hub loads
  first, and make sure `SideHustle.dll` is installed.
- **Duplicate id.** Registering reuses the row for an existing `Id`; give each gamemode a unique `Id`.

## Selecting my gamemode does nothing

- Your launch callback is null or throws - `OnLaunchSingleplayer` for Singleplayer / Hybrid, or
  `OnHostMultiplayer` / `OnJoinMultiplayer` for a Multiplayer gamemode. Check the log for an exception from
  your callback.
- A `Multiplayer`-only gamemode shows a Host / Join choice instead of launching directly; pick Host or Join.

## The menu does not come back after my gamemode

Call `ctx.ReturnToHub()` from your gamemode when it finishes (e.g. on a Back button). If your overlay covered
the menu, make sure you also tear it down. `OnExitToHub` is invoked when Side Hustle initiates the teardown.

## A non-friend can't join my public lobby (they drop after a few seconds)

Schedule I itself kicks any joining player who is not on the host's Steam friends list - the connection
establishes, world data even starts loading, then the host drops them about ten seconds in (the host log shows
`Player <name> is not friends with the host. Kicking from game.`). Side Hustle lifts that kick **while you host a
Side Hustle gamemode**, so anyone can join your public or password-protected lobbies.

- **Make sure the host is on Side Hustle 1.5.1 or newer.** The fix runs on the host, so only the host needs the
  up-to-date build - a joiner can be on any version. When hosting, the log shows
  `[mp] public-lobby access installed (non-friends may join a hosted lobby)`.
- **It only applies to Side Hustle-hosted sessions.** Normal co-op started outside Side Hustle keeps the vanilla
  friends-only behaviour.

## The join times out at "LoadingData" / "join did not complete"

- **Different builds.** Everyone in a session should run the same version of the gamemode. Side Hustle warns on the
  browser card and in the log when your build differs from the host's - update to match.
- **Different mod sets.** If the host runs mods that add networked objects the joiner doesn't have, the world sync
  can stall. Host with **"Required mods only"** (if the gamemode declares a mod policy) so both sides run the same
  curated set.

Still stuck? 🛟 [support.doodesch.de](https://support.doodesch.de/sidehustle).

