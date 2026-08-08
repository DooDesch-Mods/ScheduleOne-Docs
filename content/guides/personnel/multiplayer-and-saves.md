---
title: "Multiplayer and Saves"
description: "NPCs spawned via [API Reference](/mods/personnel/api/) are S1API NPCs, so multiplayer and persistence follow"
sidebar:
  order: 5
---
## Spawned NPCs

NPCs spawned via [API Reference](/mods/personnel/api/) are S1API NPCs, so multiplayer and persistence follow
S1API's machinery:

- **Networking:** the host spawns the NPC as a FishNet network object; clients receive it like any S1API
  NPC. Spawn on the host/server side.
- **Saves:** S1API persists its NPCs through the game's save system. Identity comes from the definition, so
  keep ids stable across versions of your pack (ids are derived from pack + NPC name - renaming an NPC
  changes its id; see [Pack Format](/mods/personnel/guides/pack-format/)).

## Custom PNG layers

Custom layers are referenced **by resource-path string**, not by shipping texture bytes over the network:

- Every player who should SEE the layer needs **Personnel + the same pack** installed. The layer then
  registers locally under the same path on each client and renders identically.
- Players without the pack simply do not render that layer - **no desync, no crash**; the NPC just appears
  without the custom art for them.
- The same applies to save/load: the path is what persists; the texture is re-registered from the pack on
  startup. If the pack is removed, the layer silently disappears from the look.

## Appearance-only consumers

`BuildAvatarSettings` / `ApplyAppearance` write plain vanilla `AvatarSettings` onto an avatar. Whether that
look syncs or persists is up to the consumer's own system (vanilla `AvatarSettings` behaves as it always
does); Personnel adds no extra networking of its own.

