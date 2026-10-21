---
title: Pack format reference
description: Look up every manifest.json field of a Personnel NPC pack, from appearance to schedule and economy roles.
sidebar:
  order: 2
---

Look up the `manifest.json` fields of an NPC pack. A pack is this folder:

```
Schedule I/UserData/Personnel/Packs/<PackName>/
├── manifest.json
└── *.png              (optional custom layers, referenced by the manifest)
```

Needs Personnel 2.0+ for `autoRegister`, `spawn`, `schedule` and economy roles.

## manifest.json

```json
{
  "name": "My Pack",
  "author": "you",
  "schemaVersion": 2,
  "autoRegister": true,
  "npcs": [
    {
      "id": "mypack_pale",
      "name": "Pale",
      "appearance": {
        "gender": 0.5,
        "height": 1.0,
        "weight": 0.4,
        "skinColor": "#8899AA",
        "hairPath": "Avatar/Hair/Spiky/Spiky",
        "hairColor": "#101014",
        "leftEye":  { "top": 0.5, "bottom": 0.5 },
        "rightEye": { "top": 0.5, "bottom": 0.5 },
        "eyeBallTint": "#FFFFFF",
        "faceLayers": [ { "file": "grin.png", "tint": "#FFFFFF" } ],
        "bodyLayers": [ { "path": "Avatar/Layers/Top/T-Shirt", "tint": "#334455" } ],
        "accessories": [ { "path": "Avatar/Accessories/Feet/Sneakers/Sneakers", "color": "#FFFFFF" } ]
      },
      "behavior": { "aggression": 0.2, "maxHealth": 100, "scale": 1.0 },
      "spawn": {
        "x": -64.25, "y": 1.07, "z": 84.49,
        "rotationY": 325.0,
        "region": "Northtown",
        "physical": true
      },
      "contact": { "visible": true, "mapMarker": true },
      "relationships": {
        "delta": 1.5,
        "unlockType": "Recommendation",
        "connections": [ "mypack_other_npc", "jessi_waters" ]
      },
      "customer": {
        "spending": { "min": 300, "max": 900 },
        "ordersPerWeek": { "min": 1, "max": 3 },
        "preferredOrderDay": "Friday",
        "orderTime": "19:30",
        "standards": "Moderate",
        "allowDirectApproach": true,
        "guaranteeFirstSample": false,
        "mutualRelationRequirement": { "min": 1.0, "max": 4.0 },
        "callPoliceChance": 0.05,
        "dependence": { "base": 0.2, "multiplier": 1.0 },
        "affinities": { "marijuana": 0.6, "cocaine": -0.3 },
        "preferredProperties": [ "energizing", "calming" ]
      },
      "inventory": { "cash": { "min": 20, "max": 120 }, "items": [ "baggie" ], "clearEachNight": true },
      "schedule": [
        { "type": "stayInBuilding", "time": "09:00", "duration": 240, "building": "Motel Office" },
        { "type": "walkTo", "time": "14:00", "position": [-64.25, 1.07, 84.49] }
      ],
      "extensions": { }
    }
  ]
}
```

Every field is optional. A minimal NPC only needs a `name`. Colours are `#RRGGBB` or `#RRGGBBAA` hex strings. Personnel logs a warning for an unknown value and skips it. A broken field never removes the whole NPC.

## Ids and saves

- Personnel uses an authored `id` as given, normalized to lowercase `a-z0-9_`.
- Without `id`, Personnel derives `normalize(packId or folder name)_normalize(npc name)`.
- `packId` (top level) fixes the derivation prefix. Renaming the pack folder then keeps the ids.
- Ids must be unique inside a pack. The startup log prints the ids of each pack.
- The id is the save identity. Never change it after you ship the pack.
- To rename, set `saveId` to the OLD id. Existing saves then keep matching.

## Auto-registration

Set `"autoRegister": true` at top level, or `"auto": true` inside one NPC's `spawn`. Personnel then registers the NPC as a real S1API world NPC. It is networked, saved and follows its schedule.

- Everyone in a co-op session needs the same packs.
- If a mod ships a compiled class for the same NPC id, the compiled one wins. The log says so.
- The setting `EnableAutoRegister` turns auto-registration off globally.

## spawn

| Key | Meaning |
|-----|---------|
| `x`, `y`, `z` | Spawn position. |
| `rotationY` | Spawn yaw in degrees. |
| `region` | `Northtown`, `Westville`, `Downtown`, `Docks`, `Suburbia` or `Uptown`. |
| `physical` | `true`: real world body that moves, collides and runs its schedule. `false`: phone contact only, almost no cost. Default: `true` exactly when the NPC has a `schedule`. |
| `auto` | Overrides the pack's `autoRegister` for this NPC. |

Keep most NPCs of a large pack non-physical. For many physical NPCs, [Siesta](https://github.com/DooDesch-Mods/ScheduleOne-Siesta) lowers the AI cost.

## schedule

An array of actions. `type` decides the other fields. Times are `"HH:MM"` strings, durations are in-game minutes, positions are `[x, y, z]`.

| type | Fields |
|------|--------|
| `walkTo` | `time`, `position`, `faceDestination`, `within`, `warpIfSkipped` |
| `stayInBuilding` | `time`, `duration`, `building` (name), `doorIndex` |
| `sit` | `time`, `duration`, `seatSet` (name) or `seatSetPath`, `includeInactive`, `warpIfSkipped` |
| `useVendingMachine` | `time`, `machineGuid` (optional, nearest otherwise) |
| `useAtm` | `time`, `atmGuid` (optional) |
| `useSlotMachine` | `time`, `position`, `bet`, `mode` (`single`, `spinCount`, `untilTime`, `untilBroke`, `untilTimeOrBroke`), `spins`, `endTime`, `timeBetweenSpins`. Experimental in multiplayer. |
| `locationDialogue` | `time`, `position`, `greetingOverride`, `choice`, plus the `walkTo` fields |
| `locationAction` | `time`, `position`, `duration`, `action` (`smokeBreak`, `graffiti`, `drinking`, `holdItem`), `equippablePath`, `graffitiRegion` |
| `driveToCarPark` | `time`, `parkingLot` (name), `vehicle` (name) or `createVehicle: { "code": "shitbox", "position": [x,y,z], "rotationY": 0 }` |
| `dealSignal` | No fields. Lets a dealer break its schedule for deals. |

- An unknown building or seat name logs a warning. The NPC skips that step.
- `warpIfSkipped: true` places the NPC at the destination when no player was nearby and the step was skipped. Without it the NPC misses the stop and the log says nothing.
- NPCs move only on the navmesh. An unreachable destination leaves the NPC where it was.
- `y` need not be exact. The game samples the navmesh within about 5 units of the destination.

## Console commands for coordinates

Needs Personnel 2.1+. Enable "Console enabled" in Settings and press the backtick key. Each result goes to your clipboard and to `MelonLoader/Latest.log`.

| Command | Result |
|---------|--------|
| `personnel pos` | `[x, y, z]` for any `position` field |
| `personnel pos 07:30` | A finished `walkTo` action for that time |
| `personnel spawn` | A `spawn` block with `x`, `y`, `z`, `rotationY` and `region` filled in |
| `personnel route 07:30` | Appends a `walkTo` step to `UserData/Personnel/route.json` |
| `personnel route show` | Prints the collected steps, ready to paste into `"schedule": [ ... ]` |
| `personnel route clear` | Starts a new route |
| `personnel npcs [filter]` | Loaded definitions, and where the physical ones are now |

Vanilla `teleport <property|npc id>` moves you fast, for example `teleport rv` or `teleport jessi_waters`.

Without Personnel 2.1: run `save` in the console, then read `Position` from `%USERPROFILE%\AppData\LocalLow\TVGS\Schedule I\Saves\<SteamID>\SaveGame_1\Players\Player_0\Player.json`.

## Roles: customer and dealer

A `customer` or `dealer` block gives the NPC that economy role. If both exist, `dealer` wins. Personnel applies only the fields you set. The rest keep the game defaults.

- `customer`: `spending`, `ordersPerWeek`, `preferredOrderDay` (`Monday` to `Sunday`), `orderTime`, `standards` (`VeryLow`, `Low`, `Moderate`, `High`, `VeryHigh`), `allowDirectApproach`, `guaranteeFirstSample`, `mutualRelationRequirement`, `callPoliceChance`, `dependence`, `affinities`, `preferredProperties`.
- `affinities` maps a drug type to a value from -1 to 1. Types: `marijuana`, `methamphetamine`, `cocaine`, `mdma`, `shrooms`, `heroin`.
- `preferredProperties` takes property ids such as `energizing`.
- `dealer`: `type` (`player` or `cartel`), `cut`, `signingFee`, `home` (building name), `completedDealsVariable`, `allowInsufficientQuality`, `allowExcessQuality`.

## contact and relationships

- `contact.mapMarker: false` removes the phone-map marker.
- `contact.visible: false` skips the contact unlock, so the NPC shows as "???". Experimental.
- `relationships.delta` is 0 to 5.
- `relationships.unlocked` is a boolean.
- `relationships.unlockType` is `Recommendation` or `DirectApproach`.
- `relationships.connections` lists NPC ids. Use pack-prefixed ids for pack NPCs and plain ids such as `jessi_waters` for vanilla NPCs.

## Layers

Each entry in `faceLayers`, `bodyLayers` and `accessories` uses one source:

| Key | Meaning |
|-----|---------|
| `path` | A Resources path of an in-game layer or accessory. Personify stores these. |
| `file` | A PNG in the pack folder. Personnel registers it as a custom layer at load. See [Custom PNG layers](/mods/personnel/guides/custom-png-layers/). |
| `tint` (alias `color`) | Hex tint. Default white. |

A `file` in `faceLayers` registers on the face mesh. A `file` in `bodyLayers` registers on the body mesh. Accessories take only `path`. Custom accessory meshes are not supported.

## extensions

Free-form blocks keyed by consumer name, for example `"backrooms": { ... }`. Personnel passes them through untouched. Each consumer reads its own block.

## Publish a pack

1. Export the pack from [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify). It wraps the pack for Thunderstore with `manifest.json`, README and LICENSE, and your pack under `Personnel/Packs/<name>/`.
2. Add a 256x256 `icon.png`.
3. List `DooDesch-Personnel` as a dependency and upload.
