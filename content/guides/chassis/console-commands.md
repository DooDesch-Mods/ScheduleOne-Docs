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
| `chassis car go [throttle] [steer] [s]` | Drive through the game's own control override, each value from -1 to 1. Sit in the driver seat first. |
| `chassis car slide [km/h] [deg] [s]` | Hold the car at a speed, turned off its facing, to test tyre slip and drift smoke. |
| `chassis car wheels` | Print drift state, smoke and smoke colour per wheel. |
| `chassis car honk [flash]` | Sound the horn, as the G key does. |
| `chassis car blink l\|r\|off` | Set the indicator, as the arrow keys do. |
| `chassis car lock on\|off` | Lock or unlock the vehicle (owner only). |
| `chassis car part <name> open\|close` | Open or close a lid from the profile. |
| `chassis car side front\|rear` | Set which end the storage opens from. |
| `chassis car rain on\|off\|auto` | Force rain for the wipers. |
| `chassis car assign <code>\|off` | Give the vehicle another profile. |
| `chassis car owners` | Print every owner record this peer knows. |
| `chassis car owner <player code>` | Give the vehicle to another player (host). |
| `chassis exit` | Leave the vehicle, as the interact key does. |
| `chassis view [pitch]` | Switch first person on or off while seated, as the V key does. A pitch turns it on and looks down that far. |
| `chassis drive <fwd> <steer> [s]` | Driver input for `s` seconds (default 3). |
| `chassis cam <dist> <yaw> <height>` | Orbit camera around your vehicle, or the nearest seated body. `chassis cam off` ends it. |
| `chassis lights [net id]` | Print the lamp meshes of a car and every renderer with its materials. |
| `chassis crouch [on\|off]` | Crouch or stand, as the crouch key does. |
| `chassis crouch keep\|fix` | `keep`: a body that gets in crouched stays crouched, as in vanilla. `fix`: it sits upright, the default. |
| `chassis hints [format]` | Print the vehicle key hints. A format with `{0}` relabels the arrow keys. |
| `chassis status` | Print seated bodies, pushers, the view, the key hints and the current vehicle. |
| `chassis despawn car` | Remove the nearest car within 30 m. |
| `chassis feet` | Print the ankle axes of every seated body. |

### Tuning

The `tune` commands act on the car you sit in, the nearest car within 15 m, or a car by net id: `chassis tune #<net id> ...`.

| Command | What it does |
|---|---|
| `chassis tune` | Print the car's tuning keys and driving factors. |
| `chassis tune help` | List the `tune` subcommands. |
| `chassis tune parts [slot]` | List the parts that fit the car. |
| `chassis tune part <id>` | Install a part. It replaces the part in that slot. |
| `chassis tune remove <slot>` | Put the stock part back in that slot. |
| `chassis tune set <key> <value>` | Set any key, for example `paint C81E1E,metallic`, `rims 202020,chrome`, `xenon 9FB8FF`, `neon 00FFAA,lr`, `tint 10121480`, `smoke FF2080` or `horn <sound>`. |
| `chassis tune unset <key>` | Remove one key. |
| `chassis tune clear` | Put everything back to stock. |
| `chassis tune stats` | Print the stock and the current driving values. |
| `chassis tune demo` | Register demo parts (wing, bumper, exhaust, rims) that fit this car's code. |
| `chassis tune marco open\|<colour>\|close` | Open Marco's repaint menu for the car, pick and buy a colour through the menu's own buttons, or close it. |

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

The wheelchair commands moved to [Rollin](/mods/rollin/guides/console-commands/) as `rollin` commands.

### Test clients

| Command | What it does |
|---|---|
| `chassis creator` | Finish an open character creator with the default looks. |
| `chassis notice` | Close the offense notice after an arrest. |
