---
title: Add host settings
description: Let the host set round time, teams or any other value on the Host form and read it on every player.
sidebar:
  order: 2
---

Give the host a form with your settings. Side Hustle sends the chosen values to every player, so you write no netcode.

**You need:** a registered gamemode with `Support` set to `Multiplayer` or `Hybrid`. See [Add a gamemode](/mods/sidehustle/guides/getting-started/).

## Steps

1. Add `HostSettings` to your descriptor. Each entry is one control on the Host form.

   ```csharp
   HostSettings = new[]
   {
       new SettingDescriptor
       {
           Key = "round_time", Label = "Round time", Category = "Rounds",
           Type = SettingType.Slider, Min = 60, Max = 900, Step = 30, WholeNumbers = true,
           Unit = "s", Default = "300",
       },
       new SettingDescriptor
       {
           Key = "teams", Label = "Teams", Category = "Rounds",
           Type = SettingType.Segmented, Options = new[] { "Two", "Four" }, Values = new[] { "2", "4" },
           Default = "2",
       },
       new SettingDescriptor
       {
           Key = "friendly_fire", Label = "Friendly fire", Hint = "Team mates can hurt each other.",
           Type = SettingType.Toggle, Default = "0",
       },
   },
   ```

   - `Key` is the wire format. Keep it short and never rename it. All values travel in Steam lobby data, which has a size limit.
   - The form shows a section header each time `Category` changes. Sort your settings by category.
   - Every value is a string. A toggle stores `"1"` or `"0"`. A segmented or dropdown control stores the entry of `Values`, or the label when `Values` is null.

2. Optional: add `Presets`. The host picks one, and its values fill the matching controls.

   ```csharp
   Presets = new[]
   {
       new SettingPreset
       {
           Name = "Quick round", Hint = "Short rounds, two teams.", Recommended = "Best for 2-6",
           MinPlayers = 2, MaxPlayers = 6,
           Values = new Dictionary<string, string> { ["round_time"] = "120", ["teams"] = "2" },
       },
   },
   ```

   - A preset whose `MinPlayers` to `MaxPlayers` range fits the lobby size can be selected when the form opens. `DefaultSelected = true` always selects it.
   - When the host changes a value, joiners see the mode as "Custom - Quick round". Set `Mode` to use another name.
   - `Experimental = true` adds a badge and sorts the preset to the end.
   - A key without a matching setting is ignored.

3. Read the values in your launch callbacks. Host and clients get the same values.

   ```csharp
   OnHostMultiplayer = ctx => StartRound(ctx),
   OnJoinMultiplayer = ctx => StartRound(ctx),

   static void StartRound(LaunchContext ctx)
   {
       var mp = ctx.Multiplayer;
       int roundTime = mp.GetInt("round_time", 300);
       int teams = mp.GetInt("teams", 2);
       bool friendlyFire = mp.GetBool("friendly_fire");
       string mode = mp.Mode;   // "Quick round", "Custom - Quick round" or null
   }
   ```

   `GetInt` and `GetFloat` parse with the invariant culture. `GetBool` reads `"1"` and `"true"` as true.

## Check it works

1. Click Host on your row and open the full form.
2. Your settings show under their category headers, with the preset picker above them.
3. Host, then join with a second instance. Log `roundTime` on both: the values are the same.

## Next

- [React to players and send messages](/mods/sidehustle/guides/sessions-and-messages/)
- [`SettingDescriptor` in the API reference](/mods/sidehustle/api/)
