---
title: "Share your translation as a mod"
description: "Publish your translation JSON as its own Thunderstore or Nexus package."
sidebar:
  order: 3
---
Publish your translation as a package that players install with their mod manager. The package has no code, only your JSON file.

**You need:** a finished `<code>.json` (see [Translate a DooDesch mod](/mods/l10n/guides/translating-a-doodesch-mod/)). Needs ScheduleOne-L10n v1.1.0+ in the translated mod (RVRepairVan 2.5.0+).

## Steps

1. Create this folder layout. One package can translate several mods: add more folders under `Mods/Localization/`.

   ```
   RVRepairVan_French/
   ├── manifest.json
   ├── icon.png           (256x256, required by Thunderstore)
   ├── README.md          (what you translate, and into which language)
   └── Mods/
       └── Localization/
           └── RVRepairVan/
               └── fr.json
   ```

2. Write `manifest.json`. List the translated mod in `dependencies`, so mod managers install it with your package.

   ```json
   {
     "name": "RVRepairVan_French",
     "version_number": "1.0.0",
     "website_url": "https://github.com/you/your-repo",
     "description": "French translation for RVRepairVan.",
     "dependencies": [
       "DooDesch-RVRepairVan-2.5.0"
     ]
   }
   ```

3. Zip `manifest.json`, `icon.png`, `README.md` and `Mods/` at the top level of the zip.

4. Upload the zip to the Schedule I community on Thunderstore. r2modman and Gale copy `Mods/` into the profile.

5. For Nexus, upload the same zip. Manual users extract it into the game folder, so `Mods/` merges with the existing one.

Name the package `<ModName>_<Language>`, for example `RVRepairVan_French`.

## Check it works

Before you publish, put `Mods/Localization/<ModName>/<code>.json` into your own game folder and restart. Set `Language` under `[DooDesch]` in `UserData/MelonPreferences.cfg` to your code to force it. The mod shows your lines. A `[L10n]` warning in the MelonLoader console means a JSON error, and it names the file.

## Load order

The mod reads three sources. Later sources win per line:

1. the translation built into the mod
2. translation mods: `Mods/Localization/<ModName>/<code>.json` (your package)
3. the player's file: `UserData/DooDesch/Localization/<ModName>/<code>.json`

## Next

- To get your translation shipped inside the mod, send it via [support.doodesch.de](https://support.doodesch.de/l10n). Accepted translations are credited.
