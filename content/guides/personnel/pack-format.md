---
title: "Pack Format"
description: "An NPC pack is a folder under"
sidebar:
  order: 1
---
An NPC pack is a folder under:

```
…/Schedule I/UserData/Personnel/Packs/<PackName>/
├── manifest.json
└── *.png              (optional custom layers, referenced by the manifest)
```

Since Personnel 2.0 a pack can describe the whole NPC - looks, spawn point, daily schedule, economy
role - and Personnel spawns it as a real world NPC on its own (`autoRegister`). No mod code needed.

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
        "x": -66.4, "y": -2.9, "z": 86.1,
        "rotationY": 145.0,
        "region": "Westville",
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
        { "type": "walkTo", "time": "07:30", "position": [-70.1, -2.9, 80.0] },
        { "type": "stayInBuilding", "time": "09:00", "duration": 240, "building": "Thrifty Threads" },
        { "type": "walkTo", "time": "14:00", "position": [-66.4, -2.9, 86.1] }
      ],
      "extensions": { }
    }
  ]
}
```

Every field is **optional** - omitted keys keep sensible defaults, so a minimal NPC is still just a
`name`. Colours are `#RRGGBB` or `#RRGGBBAA` hex strings. Unknown values are warned about in the log
and skipped; a broken field never takes the whole NPC down.

## Ids and saves

- An authored `id` is respected as-is (normalized to lowercase `a-z0-9_`). Without one, the id is
  derived as `normalize(packId or folder name)_normalize(npcName)`.
- **Never change an id once the pack shipped** - it is the save identity. If you must rename, set
  `saveId` to the OLD id so existing saves keep matching.
- `packId` (top level) pins the derivation prefix so renaming the pack folder does not change ids.
- Two NPCs in the same pack must have different ids. The startup log prints each pack's ids.

## Auto-registration (world NPCs without code)

Set `"autoRegister": true` at the top level (or `"auto": true` inside a single NPC's `spawn`) and
Personnel registers those NPCs as real S1API world NPCs - networked, saved, walking their schedules.
Notes:

- Everyone in a co-op session needs the same packs installed (same rule as mods).
- Pack changes need a game restart.
- If a consumer mod already ships a compiled class for the same NPC id, the compiled one wins and
  the log says so - remove the old DLL once a pack is fully migrated.
- The `EnableAutoRegister` setting is a global kill switch.

## spawn

| Key | Meaning |
|-----|---------|
| `x`, `y`, `z` | Spawn position. |
| `rotationY` | Spawn yaw in degrees. |
| `region` | Map region: `Northtown`, `Westville`, `Downtown`, `Docks`, `Suburbia`, `Uptown`. |
| `physical` | `true` = real world body (moves, collides, runs schedules). `false` = phone contact only - costs next to nothing. Default: physical exactly when the NPC has a `schedule`. |
| `auto` | Per-NPC override of the pack's `autoRegister`. |

Keep most roster NPCs non-physical - that is what keeps big packs fast, also on Steam Deck. For many
physical NPCs, [Siesta](https://github.com/DooDesch-Mods/ScheduleOne-Siesta) throttles the AI cost.

Stand where the NPC should spawn and run `personnel spawn` in the dev console to get this whole block
with the numbers filled in - see [Finding coordinates](#finding-coordinates).

## schedule

An array of actions; `type` decides the other fields. Times are `"HH:MM"` strings, durations are
in-game minutes, positions are `[x, y, z]`.

| type | Fields |
|------|--------|
| `walkTo` | `time`, `position`, `faceDestination`, `within`, `warpIfSkipped` |
| `stayInBuilding` | `time`, `duration`, `building` (name), `doorIndex` |
| `sit` | `time`, `duration`, `seatSet` (name) or `seatSetPath`, `includeInactive`, `warpIfSkipped` |
| `useVendingMachine` | `time`, `machineGuid` (optional - nearest otherwise) |
| `useAtm` | `time`, `atmGuid` (optional) |
| `useSlotMachine` | `time`, `position`, `bet`, `mode` (`single`, `spinCount`, `untilTime`, `untilBroke`, `untilTimeOrBroke`), `spins`, `endTime`, `timeBetweenSpins` - experimental in multiplayer |
| `locationDialogue` | `time`, `position`, `greetingOverride`, `choice`, plus the walkTo fields |
| `locationAction` | `time`, `position`, `duration`, `action` (`smokeBreak`, `graffiti`, `drinking`, `holdItem`), `equippablePath`, `graffitiRegion` |
| `driveToCarPark` | `time`, `parkingLot` (name), `vehicle` (name) or `createVehicle: { "code": "shitbox", "position": [x,y,z], "rotationY": 0 }` |
| `dealSignal` | no fields - lets a dealer break its schedule for deals |

Unknown building/seat names log a warning and the NPC skips that step - schedules keep working when
a target is missing.

## Finding coordinates

The game has no coordinate display, so Personnel ships console commands that hand you the spot you
are standing on. Turn the console on in Settings ("Console enabled"), press the backtick key, and:

| Command | What you get |
|---------|--------------|
| `personnel pos` | `[x, y, z]` for any field that takes a `position` |
| `personnel pos 07:30` | a finished `walkTo` action for that time |
| `personnel spawn` | a `spawn` block with `x`/`y`/`z`/`rotationY`/`region` filled in |
| `personnel route 07:30` | appends a `walkTo` step to `UserData/Personnel/route.json` |
| `personnel route show` | prints the collected steps, ready to paste into `"schedule": [ ... ]` |
| `personnel route clear` | starts a new route |
| `personnel npcs [filter]` | loaded definitions, and where the physical ones are right now |

Every result is copied to your clipboard and written to the MelonLoader log. The game's console has
no output pane, so the log (`MelonLoader/Latest.log`) is where the full text lives; in-game you get a
notification confirming the command ran.

Mapping a route is three steps: walk to the first stop, `personnel route 07:00`, repeat for each
stop, then `personnel route show` and paste the block into the NPC's `schedule`.

Two things to watch:

- NPCs only move on the navmesh. Pick a spot you would walk over yourself - next to a vehicle rather
  than inside it. Unreachable destinations leave the NPC standing where it was.
- `y` does not have to be exact. The game samples the navmesh within about 5 units of the
  destination, so `x` and `z` do the work.

`warpIfSkipped: true` (added by the commands above) places the NPC at the destination when the step
was skipped because no player was nearby at that time. Without it the NPC misses the stop and nothing
in the log says so.

Vanilla `teleport <property|npc id>` gets you to a spot fast - `teleport rv`, `teleport barn`,
`teleport jessi_waters` - and then the commands above read that position off.

**Without Personnel 2.1.0**, the save file has the same numbers: stand on the spot, run `save` in
the console, and read `Position` from
`%USERPROFILE%\AppData\LocalLow\TVGS\Schedule I\Saves\<SteamID>\SaveGame_1\Players\Player_0\Player.json`.

## Roles: customer / dealer

Presence of a `customer` or `dealer` block gives the NPC that economy role (a `dealer` block wins if
both exist; the old `behavior.conversation` shorthand still works). Only the fields you set are
applied - everything else keeps the game's defaults.

- `customer`: `spending`, `ordersPerWeek`, `preferredOrderDay` (`Monday`..`Sunday`), `orderTime`,
  `standards` (`VeryLow`, `Low`, `Moderate`, `High`, `VeryHigh`), `allowDirectApproach`,
  `guaranteeFirstSample`, `mutualRelationRequirement`, `callPoliceChance`, `dependence`,
  `affinities` (drug type -> -1..1: `marijuana`, `methamphetamine`, `cocaine`, `mdma`, `shrooms`,
  `heroin`), `preferredProperties` (property ids like `energizing`).
- `dealer`: `type` (`player` or `cartel`), `cut`, `signingFee`, `home` (building name),
  `completedDealsVariable`, `allowInsufficientQuality`, `allowExcessQuality`.

## contact / relationships

- `contact.mapMarker: false` removes the phone-map marker. `contact.visible: false` (experimental)
  skips the contact unlock, so the NPC shows as "???".
- `relationships`: `delta` (0-5), `unlocked`, `unlockType` (`Recommendation` or `DirectApproach`),
  `connections` (NPC ids - pack-prefixed for pack NPCs, plain vanilla ids like `jessi_waters` work
  too).

## Layers

Each entry in `faceLayers` / `bodyLayers` / `accessories` uses **one** source:

| Key | Meaning |
|-----|---------|
| `path` | An existing in-game layer / accessory Resources path (what Personify's pickers store). |
| `file` | A pack-relative PNG registered as a custom layer at load time - see [Custom PNG Layers](/mods/personnel/guides/custom-png-layers/). |
| `tint` (alias `color`) | Hex tint applied to the layer. Default white. |

Face layers render on the face mesh, body layers on the body mesh - a custom `file` in `faceLayers` is
registered as a face layer, in `bodyLayers` as a body layer. Accessories are attached meshes and only take
`path` (custom accessory meshes are not supported).

## extensions

Free-form blocks keyed by consumer name (e.g. `"backrooms": { ... }`). Personnel passes them through
untouched; each consumer parses its own block and ignores the rest.

## Publishing a pack

A pack is just files, so ship it any way you like. [Personify](https://github.com/DooDesch-Mods/ScheduleOne-Personify)
exports the pack already wrapped Thunderstore-style (manifest.json/README/LICENSE + your pack under
`Personnel/Packs/<name>/`); add a 256x256 `icon.png` and upload. List `DooDesch-Personnel` as a dependency.

