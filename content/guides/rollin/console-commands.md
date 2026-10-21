---
title: Console commands
description: Look up every rollin console command of the debug build, to sit, push and tune a wheelchair without keys.
sidebar:
  order: 1
---

Look up a `rollin` command here. The commands exist only in the debug build: every GitHub release carries
`Rollin_<version>_debug.zip` next to the normal build. Get it from the
[releases page](https://github.com/DooDesch-Mods/ScheduleOne-Rollin/releases) and replace `Mods/Rollin.dll` with the
DLL from the zip. Players use the normal build. `rollin help` lists the commands of the build you run.

## Sit and push

| Command | What it does |
|---|---|
| `rollin status` | Print swapped props, pushers, the tuning store and the moving parts. |
| `rollin props` | List every wheelchair prop with its index and position. |
| `rollin sit [tp <i>]` | Sit on the nearest wheelchair prop, as the Sit prompt does. `tp` moves you to prop `i` first. |
| `rollin push [off\|fake]` | Push the nearest occupied wheelchair, or let go. `fake` pushes an empty one. |
| `rollin pushin <fwd> <steer> [s]` | Pusher input for `s` seconds (default 3). |
| `rollin spawn` | Spawn a wheelchair vehicle 2 m ahead (host). |
| `rollin despawn` | Remove every wheelchair vehicle. |

Drive, camera, first person and exit come from Chassis: `chassis drive`, `chassis cam`, `chassis view` and
`chassis exit` ([Chassis console commands](/mods/chassis/guides/console-commands/)).

## Tuning

The `tune` commands act on the chair you sit in, or the nearest one.

| Command | What it does |
|---|---|
| `rollin tune <slot> <part id\|label\|n>` | Put a part on the chair. `none` takes it off. |
| `rollin tune set <key> <value>` | Set any tuning key: `paint`, `paint2`, `neon`, `horn` or `part.<slot>`. |
| `rollin tune max` | Put the full build on the chair. |
| `rollin tune clear` | Put the chair back to stock. |
| `rollin tune show` | Print what the chair wears. |
| `rollin parts [slot]` | List every Rollin part with its id. |
| `rollin menu [open\|close\|up\|down\|left\|right]` | Use the T menu without keys. |
| `rollin tune where` | Print the size and position of every part on the chair, in chair space. |
| `rollin tune chair` | Print the shape of the chair itself: seat, backrest and frame. |
| `rollin tune overlap` | List parts that cut into the chair, the rider or each other. |
| `rollin tune nudge <slot> [<name> pos\|rot\|size <x> [<y> <z>]]` | List the pieces of a part, or move, turn or scale one piece live. |
| `rollin meshes` | List the game models the parts are built from. |

Slots: `spoiler`, `booster`, `exhaust`, `rims`, `hat`, `mascot`, `roof`, `lights`, `audio`, `cargo`,
`engine`, `brakes`, `suspension`, `tyres`, `steering` and `weight`.

Examples:

| Command | What it does |
|---|---|
| `rollin tune set paint FF3EA5,metallic` | Paint the chair hot pink with a metallic finish. `paint2` is the trim. |
| `rollin tune set neon 2EF2FF,fblr` | Switch cyan neon on under the front, back, left and right. |
| `rollin tune set horn rollin_cucaracha` | Use the La Cucaracha horn. `rollin parts horn` lists the others. |
