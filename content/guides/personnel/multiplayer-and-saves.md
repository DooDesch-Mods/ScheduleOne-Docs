---
title: Keep NPCs working in multiplayer and saves
description: Make Personnel NPCs and custom layers stay in sync across co-op players and across save and load.
sidebar:
  order: 4
---

Follow these rules so Personnel NPCs spawn, sync and save correctly.

**You need:** an NPC pack. See [Make an NPC pack](/mods/personnel/guides/getting-started/).

## Steps

1. Install the same packs on every player's machine. This is the same rule as for mods.
2. Spawn NPCs on the host. The host spawns the NPC as a FishNet network object. Clients receive it like any S1API NPC.
3. Keep ids stable. S1API saves NPCs through the game save system, and the definition id is the identity. Never change an id after release. See [Pack format](/mods/personnel/guides/pack-format/#ids-and-saves).
4. Use custom PNG layers only with the pack on every client. The game syncs layers as resource-path strings, not texture bytes. Each client registers the texture from its own copy of the pack.

## Check it works

- A player without the pack sees the NPC without the custom art. No desync and no crash.
- After save and load, Personnel registers the texture again from the pack at startup.
- If you remove the pack, the layer disappears from the look without an error.

## Appearance-only mods

`BuildAvatarSettings` and `ApplyAppearance` write plain vanilla `AvatarSettings` onto an avatar. Your mod's own system decides whether that look syncs or saves. Personnel adds no networking.

## Next

- [Custom PNG layers](/mods/personnel/guides/custom-png-layers/)
- [Troubleshooting](/mods/personnel/guides/troubleshooting/)
- [API reference](/mods/personnel/api/)
