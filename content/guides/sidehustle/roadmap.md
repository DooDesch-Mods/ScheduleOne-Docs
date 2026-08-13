---
title: "Roadmap"
description: "Where Side Hustle is and where it is going."
sidebar:
  order: 3
---
Where Side Hustle is and where it is going. Items below "Planned" are intentions, not promises.

## Shipped - 2.4.0

- **Your mods can wait for a lobby instead of loading at startup**, so joining somebody's session stops meaning
  quit first. Switch it on with `DeferModsUntilLobby`, and name what has to be there regardless - a bridge, an
  overlay, a profiler - with `AlwaysLoadMods`.
- **Joining a synced lobby skips the restart.** The host's mods load out of the package cache while you stay on
  the screen you were on. A mod already running at a different version than the session wants still costs one
  restart, and the log names the mod and both versions.
- **The gamemode list shows installed gamemodes that have not loaded yet**, with the name, version and author
  their own file declares. One click loads and starts it.

## Shipped - 2.3.0

- **A Lobby app on your phone** changes what used to need a new session: name, join password, public or friends
  only, seats, mod requirement, publishing. Host only, and it applies to the next person who joins.
- **Chat before you join.** Lobby cards get a Chat button next to Join, and the join screens carry that
  conversation down the right, so a mod you cannot download becomes a question instead of a dead end. Switch
  yours off with `AcceptStrangerMessages`, mute one person from the app, or hide the column with
  `JoinChatPanel`.
- **A status column in the main menu**: sessions listed, how many take players, the mod profile you booted into,
  and whether anyone messaged you. Switch it off with `MenuStatePanel`.
- **Lobby cards say which branch the host plays on**, IL2CPP in green or Mono in red. The two cannot play
  together, and nothing on the card used to tell you before you tried.

## Shipped - 2.1.0

- **The messenger left home.** Lobby chat was a phone app Side Hustle carried itself; it is a separate mod now,
  and 1270 lines of transport, store, contacts and screens left with it.

## Shipped - 2.0.0

- **Join a gamemode you do not have installed.** A public gamemode lobby advertises the exact mod files a joiner
  needs, and Side Hustle fetches them from Thunderstore's official CDN or the mod's own GitHub releases. For
  anything that still needs a browser (Nexus), the checklist opens the mod's own page and picks the file up from
  your downloads folder.
- **Mod Profiles - an in-game mod manager.** Keep separate mod sets and switch between them from the main menu,
  without touching what your real mod manager sees.
- **Vanilla co-op with mod sync.** Host your normal savegame as a public lobby and everyone who joins gets your
  mod set. Optionally your mod *settings* as well, per mod, your choice.
- **Gamemode sessions list themselves** on the public lobby list, and a gamemode can declare a `DownloadUrl` for
  players who do not have it.

## Shipped - 1.8.0

- **Discover what's being played.** The menu also lists gamemodes you don't have installed that have live public
  lobbies right now, with a "Download Mod" button (opened in the Steam overlay). Toggleable, and gamemode authors
  can opt out (`Advertise = false`) so a work-in-progress mode stays hidden.

## Shipped - 1.7.0

- **Custom display name.** Each gamemode's Host / Join screen has a "Your name" field. Set one and other
  players see that name (nametag, scoreboard, server browser) instead of your Steam name, for that session
  only. Stored per gamemode and never saved.

## Shipped - 1.6.0

- **Bigger lobbies, built in.** Side Hustle raises the co-op player cap past the vanilla 4 on its own
  (default up to 32), with the host player-count slider opening to match - no separate lobby mod needed.

## Shipped - 1.3.0

- **Conflict-free mod sets.** A gamemode can declare which other mods it works with (`ModPolicy` with
  `AllowedMods` / `RequiredMods`). Side Hustle launches it in a temporary, isolated profile that loads only
  those mods - after a confirmation listing exactly what changes - and switches back to your full set when you
  leave. Your installed mods are never disabled, renamed or moved, so your mod manager stays in sync and a
  normal launch always loads everything. The relaunch, in and out, is automatic.

## Shipped - 1.1.0

- **Multiplayer launch.** Multiplayer and Hybrid gamemodes show a Singleplayer / Host / Join choice,
  rendered in the native menu style. Hosting opens a public lobby with a player-count picker.
- **Public server browser.** Find and join open sessions, filtered by gamemode id so each gamemode only
  lists its own lobbies. Bigger lobbies (past the vanilla 4) are built in as of 1.6.0.
- **World gamemodes.** For `GamemodeSurface.World` gamemodes, Side Hustle boots a throwaway session
  outside your save slots so a gamemode can use the actual game world without touching a real save.
- **Richer launch context.** Gamemodes receive the host/client role, lobby id, player count, host name
  and the host's settings.
- **List polish.** A Singleplayer / Multiplayer / SP + MP badge per gamemode, optional per-gamemode
  icons, and a recently-played ordering.

## Shipped - 1.0.0

- **Main-menu hub.** A single "Side Hustle" entry lists every installed gamemode mod (name, description,
  author) and launches the selected one.
- **No savegame.** Gamemodes run in their own self-contained session and never load or alter your saves.
- **Singleplayer launch + clean return.** `OnLaunchSingleplayer` starts a mode; `LaunchContext.ReturnToHub`
  brings the player back to the menu.
- **Public, load-order-independent API.** `SideHustle.API.Register(GamemodeDescriptor)` works whether your
  mod loads before or after the hub.
- **Hide toggle.** Turn the menu entry off without uninstalling.

## Under consideration

- Grouping / categories in the hub list as the number of gamemodes grows.

Got a request? 🛟 [support.doodesch.de](https://support.doodesch.de/sidehustle).

