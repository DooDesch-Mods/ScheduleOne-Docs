---
title: Run your gamemode in the game world
description: Start your gamemode in a clean scratch world, block vanilla quests and saves, and choose which mods stay loaded.
sidebar:
  order: 4
---

Set `Surface = GamemodeSurface.World`. Side Hustle then boots a scratch world before it calls your launch callback.

**You need:** a registered gamemode. See [Add a gamemode](/mods/sidehustle/guides/getting-started/).

The scratch world is a fresh copy of the default save on every launch. Side Hustle never touches a real save slot.

## Steps

1. Set the surface:

   ```csharp
   Surface = GamemodeSurface.World,
   ```

2. Turn on the world rules you need with a preset. Each preset only switches flags on.

   ```csharp
   WorldHygiene.CleanWorld(descriptor, "My Guide Quest");   // quests blocked except the named ones, no intro, no saving
   WorldHygiene.Arena(descriptor);                         // CleanWorld, plus no NPC reaction to gunfire and no player death
   ```

   Or set the flags yourself:

   | Flag | Effect for the session |
   |---|---|
   | `BlockVanillaQuests` | No vanilla quest starts. `AllowedQuestTitles` lists the exceptions. Matters on the host. |
   | `SkipIntro` | No intro cutscene and no character creator. |
   | `BlockSaveDuringSession` | Every vanilla save does nothing. The Save button stays visible. |
   | `SuppressNpcCombatReactions` | NPCs ignore gunfire: no panic, no police call, no wanted level. |
   | `DisableVanillaPlayerDeath` | Players cannot die from weapon damage. Damage to NPCs is unchanged. |

3. Optional: limit which other mods stay loaded with a `ModPolicy`.

   ```csharp
   Policy = new ModPolicy
   {
       RequiredMods = new[] { "S1API" },
       AllowedMods = new[] { "Hotline" },
   },
   DefaultRequiredModsOnly = true,
   ```

   - With a policy, Side Hustle restarts the game into a temporary profile that loads only the kept mods. Leaving the gamemode restarts into the full mod set.
   - The player confirms the change first. Installed mod files are never moved or deleted.
   - Names match the MelonLoader name or the DLL file name, case-insensitive.
   - Always kept: MelonLoader, S1API, Side Hustle, your own mod, the multiplayer libraries, and every dependency of a kept mod.
   - A required mod that is not installed blocks the launch with a message to install it.
   - `DefaultRequiredModsOnly` preselects "Required mods only" on the Host form. The host can change it.

## Check it works

1. Start your gamemode. The loading screen shows, then your launch callback runs in the world.
2. With `BlockSaveDuringSession`, press Save. Nothing is written.
3. End the session with `ctx.ReturnToHub()`. The menu and the hub come back.

## Next

- [Make your mod sync to other players](/mods/sidehustle/guides/mod-sync/)
- [`WorldHygiene` and `ModPolicy` in the API reference](/mods/sidehustle/api/)
