---
title: "Adopting L10n in your mod"
description: "ScheduleOne-L10n is a single-file library: copy"
sidebar:
  order: 3
---
ScheduleOne-L10n is a single-file library: copy
[`L10n.cs`](https://github.com/DooDesch-Mods/ScheduleOne-L10n/blob/main/L10n.cs) into
your project and you're set. No DLL to ship, no dependency for your users, and because
the class is `internal`, ten mods can each carry their own copy without ever colliding.

It needs only `MelonLoader` and `UnityEngine.CoreModule` - references every Schedule I
mod already has - and compiles unchanged on the IL2CPP (net6) and Mono (netstandard2.1)
backends.

## 1. Wrap your player-facing strings

The English literal IS the key - there are no invented key names to keep in sync:

```csharp
using DooDesch.Localization;

entry.Title = L10n.T("Ask the motel manager about the RV");
npc.SendWorldSpaceDialogue(L10n.T("Yeah, I can fix it. Fifty grand."), 5f);
```

Lines with runtime values become format strings:

```csharp
// before: "Pay $" + fee          after:
choice.Text = L10n.T("Pay ${0}", fee);
```

Wrap only what players see: dialogue, quest titles and objectives, item names and
descriptions, HUD text. Log lines stay English.

## 2. Ship built-in translations (optional)

Register one table per language in `OnInitializeMelon`, before anything calls `T()`:

```csharp
L10n.Register("de", new Dictionary<string, string>
{
    ["Ask the motel manager about the RV"] = "Frag die Motel-Managerin nach dem Wohnmobil",
    ["Pay ${0}"] = "{0} $ zahlen",
});
```

Without any table your mod simply stays English - `T()` returns unknown keys unchanged,
so partially wrapped or completely untranslated mods never break.

## 3. That's everything - what you get

- **Language pick**: the shared `[DooDesch] Language` preference (all L10n mods read the
  same one), else the OS language, else English. Resolved once per session.
- **Player translations**: your mod overlays translation-mod packs
  (`Mods/Localization/<YourModAssembly>/<code>.json` - anyone can publish one, see
  [Sharing your translation as a mod](/mods/l10n/guides/sharing-your-translation-as-a-mod/)) and the
  player's own `UserData/DooDesch/Localization/<YourModAssembly>/<code>.json` over the
  built-in table - players can fix lines or add whole languages you never shipped.
- **Template export**: on startup the mod writes `_template.en.json` with every key from
  your registered tables, so translators always have a current, valid starting file.

## Things worth knowing

- **The English literal is the contract.** If you reword an English string in code, the
  matching key in your tables (and in players' files) no longer matches and that line
  falls back to English until the key is updated. Treat English copy changes like small
  breaking changes and grep your tables for the old text.
- **Language changes need a restart.** Strings are resolved when your UI/dialogue is
  built; L10n resolves the language once per session, which keeps lookups consistent
  (important if you use a translated string as a lookup name, e.g. a quest title).
- **Quest-name lookups**: if you find a quest by its title, route every lookup through
  ONE localized field so create and find always agree:

  ```csharp
  internal static readonly string Title = L10n.T("Back on the Road");
  ```

- **The template only contains keys from registered tables.** Ship at least one full
  table (any language) if you want translators to get the complete key list for free.
- **Keys starting with `_`** (like the template's `_readme`) are ordinary entries that
  simply never match a source string - handy for comments in JSON, which has none.

## Reference adopter

[RVRepairVan](https://github.com/DooDesch-Mods/RVRepairVan) ships English + German with
~60 strings: dialogue, objectives, quest items, format strings - see
`Localization/German.cs` for the table and any wrapped call site for the pattern.

