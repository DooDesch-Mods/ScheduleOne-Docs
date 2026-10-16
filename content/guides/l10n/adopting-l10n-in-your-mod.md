---
title: "Translate your mod"
description: "Wrap your mod's player-facing strings with L10n so players can translate them."
sidebar:
  order: 1
---
Copy one file into your mod and wrap your player-facing strings. Players can then translate every line.

**You need:** a MelonLoader mod project (IL2CPP net6 or Mono netstandard2.1).

## Steps

1. Copy [`L10n.cs`](https://github.com/DooDesch-Mods/ScheduleOne-L10n/blob/main/L10n.cs) into your project. It needs only `MelonLoader` and `UnityEngine.CoreModule`. The class is `internal`, so several mods can each carry a copy without a clash.

2. Wrap each player-facing string in `L10n.T`. The English text is the key.

   ```csharp
   using DooDesch.Localization;

   entry.Title = L10n.T("Ask the motel manager about the RV");
   npc.SendWorldSpaceDialogue(L10n.T("Yeah, I can fix it. Fifty grand."), 5f);
   ```

3. Turn strings with runtime values into format strings.

   ```csharp
   choice.Text = L10n.T("Pay ${0}", fee);   // was: "Pay $" + fee
   ```

   Wrap only what players see: dialogue, quest titles and objectives, item names and descriptions, HUD text. Keep log lines in English.

4. Optional: register a built-in table per language in `OnInitializeMelon`, before anything calls `T()`.

   ```csharp
   L10n.Register("de", new Dictionary<string, string>
   {
       ["Ask the motel manager about the RV"] = "Frag die Motel-Managerin nach dem Wohnmobil",
       ["Pay ${0}"] = "{0} $ zahlen",
   });
   ```

5. If you find a quest by its title, keep the title in ONE field and use it for both create and find.

   ```csharp
   internal static readonly string Title = L10n.T("Back on the Road");
   ```

`T()` returns an unknown key unchanged. A mod without tables stays English.

## Check it works

Start the game once. The file `UserData/DooDesch/Localization/<YourModAssembly>/_template.en.json` appears with every key from your registered tables. Register at least one full table, or the template stays incomplete.

## What L10n does for you

- Language: the shared `[DooDesch] Language` preference, else the OS language, else English. It is resolved once per session, so a language change needs a restart.
- Overlay order, later wins per line: your built-in table, then translation mods in `Mods/Localization/<YourModAssembly>/<code>.json`, then the player's file in `UserData/DooDesch/Localization/<YourModAssembly>/<code>.json`.
- Keys that start with `_` (like `_readme` in the template) never match a source string. Use them for comments in JSON.

## Rules

- If you reword an English string in code, its key in your tables and in players' files no longer matches. That line falls back to English. Search your tables for the old text.

## Next

- [Translate a DooDesch mod](/mods/l10n/guides/translating-a-doodesch-mod/)
- [Share your translation as a mod](/mods/l10n/guides/sharing-your-translation-as-a-mod/)
- Example: [RVRepairVan](https://github.com/DooDesch-Mods/RVRepairVan) ships English and German. See `Localization/German.cs`.
