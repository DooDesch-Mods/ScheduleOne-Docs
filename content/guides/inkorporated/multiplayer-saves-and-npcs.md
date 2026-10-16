---
title: Use tattoos in multiplayer, saves and on NPCs
description: Make custom tattoos sync between co-op players, survive save and load, and appear on S1API NPCs.
sidebar:
  order: 4
---

Make custom tattoos work in co-op, in saves and on S1API NPCs.

## Multiplayer and saves

1. Install Inkorporated and the same pack on every player's machine.
2. Do nothing else. The game sends the tattoo path strings with the avatar settings over its FishNet RPCs.
3. Expect the save to store the paths in `Saves/.../Players/<code>/Appearance.json`. They survive save and load unchanged.

A client without the mod or the pack gets the path but cannot resolve it. That client skips the layer. There is no desync and no crash. If you remove the pack, the tattoo is skipped on load.

## Put a tattoo on an S1API NPC

**You need:** a registered tattoo. See the [API reference](/mods/inkorporated/api/).

1. Register the tattoo in your mod init, before the NPC appearance is built.
2. Build the path: `Avatar/Layers/Tattoos/custom/<segment>/<Source>_<Id>`. The segment is `Face` for face tattoos, otherwise the lowercase placement.
3. Use the path in the NPC appearance:

```csharp
// after API.RegisterTattoo("ring", "Ring", TattooPlacement.Face, tex, source: "MyMod");
appearance.WithFaceLayer<FaceTattoos>("Avatar/Layers/Tattoos/custom/Face/MyMod_ring", Color.white);
// body placements use WithBodyLayer<ChestTattoos>/<LeftArmTattoos>/<RightArmTattoos>(path, color)
```

## Check it works

The NPC shows the tattoo when spawned. If the layer is missing, you registered after the appearance was applied. Move `API.RegisterTattoo` earlier.

## Next

- [Troubleshooting](/mods/inkorporated/guides/troubleshooting/)
- [API reference](/mods/inkorporated/api/)
