---
title: Console commands
description: Look up every chassis console command, in the release build and in the debug build.
sidebar:
  order: 2
---

Look up a `chassis` command here. Open the in-game console and type it. `chassis help` lists the commands of the
build you run.

## Release build

These work in the normal build that players install.

| Command | What it does |
|---|---|
| `chassis help` | List the commands of this build. |
| `chassis telemetry [net id]` | Print every instrument source with its validity flag, and the bound gauges and switches of your car. Without a net id it reads the car you sit in, or the nearest car. |
| `chassis zones [off]` | Show the hit zones of the dash switches (green) and the reach (yellow rings). `off` hides them. |

## Debug build

Every GitHub release carries `Chassis_<version>_debug.zip` next to the normal build. It is the same version with
the developer commands below. Get it from the [releases page](https://github.com/DooDesch-Mods/ScheduleOne-Chassis/releases)
and replace `Mods/Chassis.dll` with the DLL from the zip. Players use the normal build.

Many commands act on the host only. They say so when a client runs them.

### Dash switches

| Command | What it does |
|---|---|
| `chassis aim <switch>` | Turn the first person view to a switch of your car, for example `chassis aim hazard`. |
| `chassis click` | Click the switch in view, as the left mouse button does. |
| `chassis scroll <n>` | Turn the switch in view by `n` steps, as the mouse wheel does. |
| `chassis outline` | Print where the highlight copies of the switch in view sit. |
| `chassis ctl <switch> [value]` | Use a switch of your car through the API. |
| `chassis coast [km/h] [s]` | Hold your car at a speed along its facing. Default 40 km/h for 5 s. |

### Vehicle

| Command | What it does |
|---|---|
| `chassis car` | Print the vehicle: code, profile, owner, indicator state, parts. |
| `chassis car help` | List the `car` subcommands. |
| `chassis car enter [code] [seat]` | Get into the nearest vehicle, or the nearest one of this code. The lock is checked. Seat 1 and up is a passenger seat. |
| `chassis car put <code> <x> <y> <z> [yaw]` | Spawn a car at this pose and stand beside it (host). |
| `chassis car bones` | Print head, hips, knees and feet of your avatar in the vehicle's space. |
| `chassis car remove` | Despawn the vehicle you sit in, or the nearest one (host). |
| `chassis car honk [flash]` | Sound the horn, as the G key does. |
| `chassis car blink l\|r\|off` | Set the indicator, as the arrow keys do. |
| `chassis car lock on\|off` | Lock or unlock the vehicle (owner only). |
| `chassis car part <name> open\|close` | Open or close a lid from the profile. |
| `chassis car side front\|rear` | Set which end the storage opens from. |
| `chassis car rain on\|off\|auto` | Force rain for the wipers. |
| `chassis car assign <code>\|off` | Give the vehicle another profile. |
| `chassis car owners` | Print every owner record this peer knows. |
| `chassis exit` | Leave the vehicle, as the interact key does. |
| `chassis view [pitch]` | Switch first person on or off while seated, as the V key does. A pitch turns it on and looks down that far. |
| `chassis drive <fwd> <steer> [s]` | Driver input for `s` seconds (default 3). |
| `chassis cam <dist> <yaw> <height>` | Orbit camera around your vehicle, or the nearest wheelchair. `chassis cam off` ends it. |
| `chassis lights [net id]` | Print the lamp meshes of a car and every renderer with its materials. |
| `chassis crouch [on\|off]` | Crouch or stand, as the crouch key does. |
| `chassis crouch keep\|fix` | `keep`: a body that gets in crouched stays crouched, as in vanilla. `fix`: it sits upright, the default. |
| `chassis hints [format]` | Print the vehicle key hints. A format with `{0}` relabels the arrow keys. |
| `chassis status` | Print seated bodies, swapped props, pushers, the view and the current vehicle. |
| `chassis feet` | Print the ankle axes of every seated body. |

### Interior

| Command | What it does |
|---|---|
| `chassis interior on\|off\|rebuild` | Switch the base interior and the tinted glass of the vanilla cars on or off, or build it again. |
| `chassis interior lift <m>` | Set the lowest cushion top above the car's underside and fit the vanilla cars again. |
| `chassis interior glass [r g b a] [smooth] [metal] [premul 0\|1] [inside]` | Tint the glass live. |

### Seat profiles

| Command | What it does |
|---|---|
| `chassis profile list` | List the vehicle codes that have a profile. |
| `chassis profile show [code]` | Print the profile as JSON. Without a code it shows the vehicle you sit in. |
| `chassis profile set <field> <values> [code] [seat]` | Move a value and write the JSON. Fields: `root`, `eyes`, `gripstart`, `gripend`, `elbow`, `foot`, `footrot`, `knee`, `stand`, `handle`, `pushelbow` take `<x> <y> <z>`. `leanstart`, `leanend` take `<x> <y> <z> <w>`. `yaw`, `recovery`, `handrotw`, `footrotw`, `followmax`, `reach` take one value. `handmode` takes `rim`, `fixed` or `wheel`. |
| `chassis profile save [code]` | Write the profile to `UserData/Chassis/<code>.json`. A file there wins over a profile from code. |
| `chassis profile reload` | Read the defaults and the files again. |

### Shots into cars

| Command | What it does |
|---|---|
| `chassis target seat` | Put the nearest NPC on foot within 30 m into the driver's seat of the nearest car (host). |
| `chassis target patrol` | Put the nearest officer on foot into the nearest car and drive the closest patrol route (host). |
| `chassis target near [m]` | Put you `m` metres (default 6) off the left side of the car with the nearest seated NPC, facing it. |
| `chassis target gun` | Equip the first ranged weapon in the hotbar. Run `give revolver` first. |
| `chassis target shoot [head\|body] [n]` | Fire the equipped gun `n` times at the nearest seated NPC, without spread. |
| `chassis target keep on\|off` | Register a `RegisterOccupantDown` handler that keeps every downed NPC in its seat, or remove it. |
| `chassis target list` | List the seated NPCs. |
| `chassis target slump [h f w]` | Print or set the height, forward offset and weight of the slumped pose. |

### Wheelchairs

| Command | What it does |
|---|---|
| `chassis chairs` | List every wheelchair in the scene with its position. |
| `chassis sit [tp <i>]` | Sit on the nearest wheelchair prop, as the Sit prompt does. `tp` moves you to prop `i` first. |
| `chassis push [off [net]\|fake]` | Push the nearest occupied wheelchair, or let go. `fake` pushes an empty one. |
| `chassis pushin <fwd> <steer> [s]` | Pusher input for `s` seconds (default 3). |
| `chassis move <yaw> [m]` | Turn the nearest wheelchair by `yaw`, then shift it `m` along its facing. |
| `chassis wheels` | Print the physics state of the nearest wheelchair: body and every wheel collider. |
| `chassis spawn` | Spawn a wheelchair 2 m ahead (host). |
| `chassis despawn` | Remove every wheelchair vehicle. `chassis despawn car` removes the nearest car within 30 m instead. |
| `chassis tree [i]` | Print the hierarchy of wheelchair prop `i`. |

### Sit demo

The `demo` commands put you in a wheelchair and tune the seated pose in the chair's space.

| Command | What it does |
|---|---|
| `chassis demo [tp [n]]` | Sit in the nearest wheelchair. `tp` works at any distance, `n` is the index from `chassis chairs`. |
| `chassis demo off` | Stand up again. |
| `chassis demo state` | Print seat, grip and IK state. |
| `chassis demo seat <x> <y> <z> [yaw]` | Set the avatar root in the chair's space. |
| `chassis demo fit [gap]` | Put the hip joints `gap` metres above the seat top (default 0.09). |
| `chassis demo foot <x> <y> <z> [rotW]` | Set the right foot in the chair's space. The left one is mirrored. |
| `chassis demo footrot <x> <y> <z>` | Set the right foot rotation against the chair in degrees. |
| `chassis demo knee\|elbow <x> <y> <z>` | Set a bend goal in the chair's space. The left one is mirrored. |
| `chassis demo lean <x> <y> <z> [w]` | Set the spine reach point and its weight. |
| `chassis demo grip <x> <y> <z> [rotW]` | Set the right-hand grip from the wheel centre. The left one is mirrored. |
| `chassis demo scale <s>` | Scale the chair against the original. |
| `chassis demo parts` | Print every chair mesh with centre and size. |
| `chassis demo feet` | Print the solved ankles and toes in the chair's space. |
| `chassis demo probe [frames]` | Print the range of root, ankle, player and chair over a number of frames, to find shake. |
| `chassis demo mark <x> <y> <z> [size]` | Put a red sphere at a chair-space point and a blue one at its mirror. `mark bones [size]` marks the bones, `mark clear` removes the spheres. |
| `chassis demo cam out [dist] [yaw] [height]` | Camera that looks at the chair from outside. `cam fp [pitch] [forward]` looks from the seat, `cam off` ends it. |

### Test clients

| Command | What it does |
|---|---|
| `chassis creator` | Finish an open character creator with the default looks. |
| `chassis notice` | Close the offense notice after an arrest. |
