---
title: "Multiplayer, Saves and NPCs"
description: "A player's tattoos are stored as a list of resource-path strings in the avatar appearance, which the game"
sidebar:
  order: 5
---
## Saves

A player's tattoos are stored as a list of resource-path strings in the avatar appearance, which the game
serialises to JSON (`…/Saves/.../Players/<code>/Appearance.json`). Custom tattoo paths round-trip through
save/load unchanged. As long as the mod + pack are installed, the tattoo re-renders on load; if they are
missing, the path is simply skipped (no tattoo, no crash).

## Multiplayer

The game networks appearance by sending the whole avatar-settings object - including the tattoo path strings
- over its FishNet RPCs. So a custom tattoo **is** transmitted to other players. Whether they *see* it:

- A client that has **Inkorporated + the same pack/registration at the same path** renders it normally.
- A client **without** it receives the path but cannot resolve it, so that layer is skipped. No desync, no
  crash - they just do not see that one tattoo.

**Takeaway:** for everyone in a co-op session to see each other's custom tattoos, all of them need the mod
and the same content. This is the normal caveat for any custom-content mod.

## Putting a tattoo on an S1API NPC

Because tattoos register through the game's `Resources.Load`, the exact path Inkorporated assigns also works
in an S1API NPC appearance. Two steps:

1. **Register first** (see [API Reference](/mods/inkorporated/api/)). Note the resulting path:
   `Avatar/Layers/Tattoos/custom/<segment>/<Source>_<Id>` (segment = `Face` for face, else the lowercase
   placement).
2. **Use that path** when you build the NPC's appearance, before it is applied:

```csharp
// after API.RegisterTattoo("ring", "Ring", TattooPlacement.Face, tex, source: "MyMod");
appearance.WithFaceLayer<FaceTattoos>("Avatar/Layers/Tattoos/custom/Face/MyMod_ring", Color.white);
// body placements use WithBodyLayer<ChestTattoos>/<LeftArmTattoos>/<RightArmTattoos>(path, color)
```

Timing matters: the layer must be **registered before the NPC's appearance is built/applied**, so do your
`API.RegisterTattoo(...)` call early (e.g. your mod's init), the same as for the player shop.

