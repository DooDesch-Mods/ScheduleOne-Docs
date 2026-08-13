---
title: "Translating a DooDesch mod"
description: "You can translate any mod built on ScheduleOne-L10n into your language - or change"
sidebar:
  order: 1
---
You can translate any mod built on ScheduleOne-L10n into your language - or change
lines you don't like - without touching the mod files themselves. All you need is a
text editor (Notepad is fine).

## Step by step

1. **Start the game once** with the mod installed, then quit.

2. **Open the mod's localization folder** in your game directory:

   ```
   <Schedule I>/UserData/DooDesch/Localization/<ModName>/
   ```

   For example: `UserData/DooDesch/Localization/RVRepairVan/`.
   You'll find one **`_template.<code>.json`** per language the mod ships -
   `_template.en.json` always, and e.g. `_template.de.json` with the built-in German.
   They are the always-current list of every text the mod can localize, regenerated on
   every game start - so don't edit them directly; your changes there would just be
   overwritten.

3. **Copy a template** (for a new language start from `_template.en.json`; to tweak a
   shipped translation start from its template, e.g. `_template.de.json`) and rename
   the copy to your language code:

   | Language | File name |
   |---|---|
   | German | `de.json` |
   | French | `fr.json` |
   | Spanish | `es.json` |
   | Italian | `it.json` |
   | Portuguese | `pt.json` |
   | Polish | `pl.json` |
   | Russian | `ru.json` |
   | Turkish | `tr.json` |
   | Japanese | `ja.json` |
   | Korean | `ko.json` |
   | Chinese | `zh.json` |

4. **Translate the values** - the text on the RIGHT side of each `:`. The left side is
   the mod's original English line; it is the lookup key and must stay exactly as it is.

   ```json
   {
     "Can you fix my RV?": "Kannst du mein Wohnmobil reparieren?",
     "Pay ${0}": "{0} $ zahlen"
   }
   ```

   Rules of thumb:
   - Keep placeholders like `{0}` or `{1}` somewhere in your translation - the game
     fills in prices, item names and similar values there.
   - You don't have to translate everything. Delete the lines you don't want to touch;
     they keep the mod's built-in text.
   - Save the file as UTF-8 (Notepad's default). Umlauts, accents and non-Latin
     scripts are fine.

5. **Restart the game.** Your translation is live.

## How the game picks your language

1. If `Language` in `UserData/MelonPreferences.cfg` (under `[DooDesch]`) is set to a
   language code, that wins. `auto` is the default.
2. On `auto`, your Windows/OS language decides.
3. If there is no translation for that language, the mod stays English.

Your file always wins over the mod's built-in translation for the lines it contains -
so you can also just override a couple of built-in lines instead of translating anything.

## Something doesn't work?

- Check the MelonLoader console for a line starting with `[L10n]` - if your file has a
  JSON mistake (a missing quote or comma), it is ignored and the warning names the file.
  Tip: paste your file into an online JSON validator to find the broken line.
- The file must be named exactly `<code>.json` (lowercase, e.g. `fr.json`) and sit in
  the mod's own folder under `UserData/DooDesch/Localization/`.
- Sharing your translation with others is very welcome - it's just that one file. You
  can publish it as its own installable package, see
  [Sharing your translation as a mod](/mods/l10n/guides/sharing-your-translation-as-a-mod/). Or send it
  to me (see [support.doodesch.de](https://support.doodesch.de/l10n)) and I'll consider
  shipping it with the mod so everyone gets it out of the box.

