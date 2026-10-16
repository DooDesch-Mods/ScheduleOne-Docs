---
title: "Translate a DooDesch mod"
description: "Translate any L10n-based DooDesch mod into your language with a text editor."
sidebar:
  order: 2
---
Translate a mod into your language, or change lines you dislike, without touching the mod files. You need a text editor.

**You need:** a DooDesch mod built on ScheduleOne-L10n, installed.

## Steps

1. Start the game once with the mod installed, then quit.

2. Open `<Schedule I>/UserData/DooDesch/Localization/<ModName>/`, for example `.../RVRepairVan/`. It holds one `_template.<code>.json` per shipped language. `_template.en.json` is always there. The game rewrites the templates at every start, so do not edit them.

3. Copy a template. For a new language, copy `_template.en.json`. To change a shipped translation, copy its template, for example `_template.de.json`.

4. Rename the copy to your language code.

   | Language | File |
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

5. Translate the values, the text on the right of each `:`. The left side is the key and must stay exactly as it is.

   ```json
   {
     "Can you fix my RV?": "Kannst du mein Wohnmobil reparieren?",
     "Pay ${0}": "{0} $ zahlen"
   }
   ```

   - Keep placeholders like `{0}` and `{1}` in your text. The game puts prices and names there.
   - Delete lines you do not translate. They keep the mod's built-in text.
   - Save as UTF-8, the Notepad default. Accents and non-Latin scripts work.

6. Restart the game.

## Check it works

The mod shows your lines in game. Your file wins over the built-in translation for every line it contains.

The language comes from `Language` under `[DooDesch]` in `UserData/MelonPreferences.cfg`. The default `auto` follows your OS language. If no translation exists for that language, the mod stays English.

## If it fails

- Look for `[L10n]` in the MelonLoader console. That warning names a file with a JSON error, such as a missing quote or comma. The game ignores that file. Check it in an online JSON validator.
- The file name must be exactly `<code>.json` in lowercase, in the mod's own folder under `UserData/DooDesch/Localization/`.

## Next

- [Share your translation as a mod](/mods/l10n/guides/sharing-your-translation-as-a-mod/)
- To get your translation shipped inside the mod, send it via [support.doodesch.de](https://support.doodesch.de/l10n).
