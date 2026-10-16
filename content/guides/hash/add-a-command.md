---
title: List your console command
description: List your mod's console command in the game's command list, so hash suggests it while the player types.
sidebar:
  order: 1
---

Make the command word of your mod visible in hash, the vanilla command list and autocomplete. One call does it.

**You need:** a MelonLoader mod project. Hash is optional for your players.

The call lists the word only. Your own handler, for example a Harmony prefix on `SubmitCommand`, still runs the command. The listing never dispatches, so a line cannot run twice.

## Steps
1. Copy `HashCommands.cs` from the Hash repository into your project and compile it.

   ```xml
   <Compile Include="path\to\HashCommands.cs" />
   ```

2. Declare Hash as an optional dependency.

   ```csharp
   [assembly: MelonOptionalDependencies("Hash")]
   ```

3. Add `using Hash.Api;` at the top of your file. Do not write `Hash.Api.HashCommands` in full inside a `MelonMod`: `MelonBase` has a property named `Hash`, and the code does not compile.

4. Call `HashCommands.Add` once in `OnInitializeMelon`.

   ```csharp
   public override void OnInitializeMelon()
   {
       HashCommands.Add("snitch", "profiler: start, stop, top, report", "snitch start");
   }
   ```

   - `word` is the first token only, without arguments. Case does not matter.
   - `description` is one line, lowercase, no trailing period.
   - `example` is a line that works, for example `snitch top 10`. Hash shows it as the argument shape while the player types. This parameter is optional.

5. Optional: check `HashCommands.Available` if you want to tell the player that Hash is missing. The `Add` call is safe without this check.

Calls are no-ops while Hash is absent. Calls made before Hash loads are replayed when it loads, so load order does not matter.

## Check it works
Open the console with Hash installed and type the first letters of your word. Hash suggests the word and shows the example as the argument shape. The word is also in the game's own command list.

![The Hash terminal on the phone with mymod typed at the prompt, its argument shape and its description from DocsShots above it](/img/guides/hash/suggestion.webp)

Without Hash, nothing changes for the player. No error appears.

## Next
- [API reference](/mods/hash/api/)
