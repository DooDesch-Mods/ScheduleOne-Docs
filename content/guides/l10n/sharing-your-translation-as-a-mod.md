---
title: "Sharing your translation as a mod"
description: "Finished a translation you're proud of?"
sidebar:
  order: 2
---
Finished a translation you're proud of? You can publish it as its own mod on
Thunderstore (and Nexus), so others just install "RVRepairVan French" with their mod
manager and are done. A translation mod contains **no code** - it is only your JSON
file in the right folder.

Requires the translated mod to be built on ScheduleOne-L10n v1.1.0 or newer
(RVRepairVan 2.5.0+).

## How it works

Mods look for translations in three places; later sources win per line:

1. the translations built into the mod itself,
2. installed translation mods: `Mods/Localization/<ModName>/<code>.json`  <- yours
3. the player's own file in `UserData/DooDesch/Localization/<ModName>/<code>.json`

So your package simply ships the file at position 2. Players who dislike single lines
of your translation can still override them with their own file - nobody gets locked in.

## Package layout

Write your translation as described in [Translating a DooDesch mod](/mods/l10n/guides/translating-a-doodesch-mod/),
then put it into this structure:

```
RVRepairVan_French/
├── manifest.json      (Thunderstore metadata, see below)
├── icon.png           (256x256 - required by Thunderstore)
├── README.md          (what your package translates, and to which language)
└── Mods/
    └── Localization/
        └── RVRepairVan/
            └── fr.json
```

One package may translate several mods at once - just add more folders under
`Mods/Localization/` (e.g. `RVRepairVan/fr.json` and `SideHustle/fr.json`).

`manifest.json` example:

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

Put the mod you are translating into `dependencies` so mod managers install it
alongside your translation and show the relationship on the package page.

## Publishing

- **Thunderstore**: zip the contents (manifest.json, icon.png, README.md and the
  `Mods/` folder at the top level of the zip) and upload it to the Schedule I
  community. Mod managers (r2modman / Gale) copy the `Mods/` folder into the profile
  automatically.
- **Nexus**: upload the same zip; manual users extract it into their game folder so
  the `Mods/` folder merges with the existing one.
- Name suggestion: `<ModName>_<Language>`, e.g. `RVRepairVan_French` - easy to find,
  easy to relate.

## Testing before you publish

Drop your `Mods/Localization/<ModName>/<code>.json` into your own game folder,
restart, and check the mod shows your lines (set `Language` under `[DooDesch]` in
`UserData/MelonPreferences.cfg` to your language code to force it). Watch the
MelonLoader console for `[L10n]` warnings - they mean the JSON has a syntax error and
names the file.

And if you'd rather have the translation shipped inside the mod itself: send it to me
via [support.doodesch.de](https://support.doodesch.de/l10n) - full translations are very
welcome and get credited.

