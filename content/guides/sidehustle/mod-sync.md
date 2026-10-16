---
title: Make your mod sync to other players
description: Publish your mod so Side Hustle can install it on a joining player automatically and find it from a lobby.
sidebar:
  order: 5
---

Give your mod a download source Side Hustle can use. A player who joins a lobby without your mod then gets it installed, or gets a direct link.

**You need:** a released mod. For the gamemode fields, a registered gamemode.

## How Side Hustle finds your mod

The host lists every loaded mod with its version and SHA256 hash. For each mod it picks one source:

| Source | What the joining player gets |
|---|---|
| Thunderstore has a package with the installed version | Automatic install |
| `downloadLink` points at a GitHub repository | Automatic download from its releases |
| `downloadLink` points at Nexus, Thunderstore or doodesch.de | A checklist entry with that link |
| No usable source | Nothing. The player joins without your mod. |

Every download is checked against the host's hash. A file with a different hash is never installed.
The Thunderstore build of Side Hustle downloads no code. There, every mod is a checklist entry.

## Steps

1. Set `downloadLink`, the fifth argument of `MelonInfo`. Use an `https` link.

   ```csharp
   [assembly: MelonInfo(typeof(Core), "Your Mod", "1.2.0", "You", "https://github.com/you/YourMod")]
   ```

2. Tag each GitHub release with the version from `MelonInfo`. `v1.2.0`, `1.2.0` and `1.2.0.0` all match.

3. Attach the DLL, or a zip with the DLL, as a release asset. Side Hustle reads up to 3 `.dll` or `.zip` assets of up to 50 MB.

4. Upload the same DLL file to every store. A rebuild has a different hash, and the download fails the check.

5. Keep secrets out of setting names you want synced. The host can sync mod settings to the session. A category with an entry name that contains `token`, `secret`, `password`, `webhook`, `apikey` or `api_key` is off by default, because lobby data is public.

## For a gamemode

Set these on your `GamemodeDescriptor`:

```csharp
DownloadUrl = "https://thunderstore.io/c/schedule-i/p/You/YourMode/",
Advertise = true,
```

- Players without your gamemode see its public lobbies with a "Download the mod" button. The button opens `DownloadUrl`.
- Only links to Thunderstore, Nexus, GitHub and doodesch.de open. Other links show but do not open.
- `Advertise = false` hides your lobbies from players without your gamemode. Use it while your gamemode is in development.

## Check it works

1. Open the classic host form for a vanilla co-op lobby with your mod loaded.
2. The "Mod sync" note counts your mod: "install automatically", "need a download link" or "cannot sync".

   ![The Mod sync note on the host form: "Joiners get your mod set: 9 of 11 install automatically, 2 cannot sync."](/img/guides/sidehustle/mod-sync-note.webp)

3. For a gamemode lobby, the host log shows `[mp] join mod set published: N file(s) (A auto, G github, L link, U unsourced).`
4. Join from a second instance without your mod. Your mod shows as an automatic install or as a checklist entry with your link.

   ![The Manual installs checklist: one row per mod with its version, the reason it needs a manual install, and an Open Nexus or Find online button](/img/guides/sidehustle/manual-checklist.webp)

## Next

- [Troubleshoot Side Hustle](/mods/sidehustle/guides/troubleshooting/)
