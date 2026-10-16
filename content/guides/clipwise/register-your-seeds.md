---
title: Register your seeds
description: Put your mod's seeds and other items in their own tab of the Clipwise clipboard picker.
sidebar:
  order: 1
---

Give your items their own tab in the management clipboard picker. Without a registration, Clipwise groups them by item ID prefix.

**You need:** Clipwise 1.0+ for testing, and a MelonLoader mod project. Clipwise is optional for your players.

## Steps
1. Copy `Clipwise.cs` into your project and compile it.

   ```xml
   <Compile Include="path\to\Clipwise.cs" />
   ```

2. Declare Clipwise as an optional dependency.

   ```csharp
   [assembly: MelonOptionalDependencies("Clipwise")]
   ```

3. Declare a category. This creates one tab.

   ```csharp
   using Clipwise.Api;

   var tab = Clipboard.Category("yourname.yourmod", "exotics", "Exotics", sortOrder: 500);
   ```

   - `source` is the reverse-DNS ID of your mod. The tab key is `source:id`.
   - `sortOrder` orders the tabs. Lower values come first. Vanilla is 0.
   - `iconItemId` is optional. It names an item whose icon represents the tab.

4. Add items to the tab. `Item` returns the tab, so you can chain calls.

   ```csharp
   tab.Item("purple-haze", "yourmod_purple_haze_seed", sortKey: "Purple Haze",
            tags: new[] { "yourname.yourmod:tier/1" });
   ```

   - `id` is your own stable key. It must be unique inside `source`. A second call with the same `source` and `id` replaces the first.
   - `itemId` is the game's `ItemDefinition.ID`.
   - `sortKey` orders items inside the tab. The default is the display name.
   - `description` appears in the tooltip.
   - `precedence` decides which source wins when several claim the same item. The higher value wins.

5. Optional: name your tags. A tag without a label shows its last path segment on the filter chip.

   ```csharp
   Clipboard.RegisterTagLabel("yourname.yourmod:tier/1", "Tier 1");
   ```

Follow these rules:
- Tags must start with your source, as in `yourname.yourmod:tier/1`. The host rejects bare tags. The `clipwise:` prefix is reserved.
- Call the API from the Unity main thread only.
- Every call is a no-op while Clipwise is absent. Calls made before Clipwise loads are replayed when it loads.

## Register without wiring a Core
Add a static class named `ClipwiseProbe` with a static `Register()` method in the global namespace. Clipwise finds it and calls it once. Call `Clipboard.AutoRegister()` from a `[ModuleInitializer]` in the same file if you want the call at bind time.

```csharp
internal static class ClipwiseProbe
{
    internal static void Register()
    {
        Clipboard.Category("yourname.yourmod", "exotics", "Exotics", sortOrder: 500)
                 .Item("purple-haze", "yourmod_purple_haze_seed");
    }
}
```

Keep this type name even when you register nothing. Clipwise finds it by name. Without it, Clipwise scans all types of your assembly, and that scan can crash a mod with many IL2CPP references.

## Check it works
Start the game and open the log. Clipwise writes `Clipwise: picked up N mod probe(s).` when it finds a `ClipwiseProbe`. Then pick up the management clipboard and click a pot's seed field. The picker shows a section named after your category label, with your items in it. A seed the game itself ships stays under "Vanilla seeds", and your tags show in its details.

![The seed picker with Green Crack selected, its details showing Tier 2 from yourname.yourmod](/img/guides/clipwise/seed-picker.webp)

If a registration is rejected, the log shows `Clipwise: RegisterItem failed: ...` or `Clipwise: RegisterCategory failed: ...`.

## Next
- [API reference](/mods/clipwise/api/)
