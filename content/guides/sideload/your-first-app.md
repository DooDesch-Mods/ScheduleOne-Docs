---
title: "Your First App"
description: "Six steps, about twenty minutes to an icon on the in-game phone."
sidebar:
  order: 2
---
Six steps, about twenty minutes to an icon on the in-game phone. Follow them in order - step 6 only works if you
do it before you launch the game.

## 1. Project layout

```
MyMod/
  MyMod.csproj
  Core.cs
  Assets/mystash/index.html
  Assets/mystash/app.css
  Assets/mystash/app.js
  Assets/mystash/icon.png     optional, but ship one
```

`icon.png` is a square PNG - 256x256 is plenty - with transparency outside the rounded square, drawn the way the
vanilla app icons are. Without it your app gets a flat coloured square derived from its id: legible, but it says
nothing about what the app is.

## 2. MyMod.csproj

No Unity reference, no IL2CPP interop, no reference to Sideload. Only MelonLoader plus the shim as source.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <LangVersion>latest</LangVersion>
    <RootNamespace>MyMod</RootNamespace>
    <AssemblyName>MyMod</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <Reference Include="MelonLoader">
      <HintPath>path\to\MelonLoader.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>

  <!-- The shim as source: one file, one DLL to ship, no hard dependency on Sideload. -->
  <ItemGroup>
    <Compile Include="path\to\Sideload.cs" Link="Sideload.Api.cs" />
  </ItemGroup>

  <!-- The web bundle. This LogicalName prefix IS the bundlePrefix you pass to Apps.Register. -->
  <ItemGroup>
    <EmbeddedResource Include="Assets/mystash/*">
      <LogicalName>MyMod.Assets.mystash.%(Filename)%(Extension)</LogicalName>
    </EmbeddedResource>
  </ItemGroup>

</Project>
```

Do not drop the `LogicalName`. Without it MSBuild mangles the folder names into the resource name,
`Apps.Register` finds nothing, and what you get is a blank app rather than an error.

## 3. Core.cs

```csharp
using MelonLoader;
using Sideload.Api;

[assembly: MelonInfo(typeof(MyMod.Core), "MyMod", "1.0.0", "You")]
[assembly: MelonGame("TVGS", "Schedule I")]

namespace MyMod
{
    public class Core : MelonMod
    {
        private static readonly List<string> Items = new List<string>();
        private static AppHandle _app;
        private static int _revision;
        private static int _pushed = -1;

        public override void OnInitializeMelon()
        {
            _app = Apps.Register(
                id: "mystash",                          // also the folder under Mods/ that overrides the bundle
                bundlePrefix: "MyMod.Assets.mystash",   // the LogicalName prefix from the csproj
                title: "Stash",
                iconLabel: "Stash");

            _app.OnCall("items.list", _ => string.Join("\n", Items))
                .OnCall("items.add", text =>
                {
                    if (string.IsNullOrWhiteSpace(text) || text.IndexOf('\n') >= 0) return "error";
                    Items.Add(text.Trim());
                    _revision++;
                    return "ok";
                });
        }

        // Push, do not poll: one event when something actually changed.
        public override void OnUpdate()
        {
            if (_revision == _pushed) return;
            _pushed = _revision;
            _app?.Emit("items.changed", Items.Count.ToString());
        }
    }
}
```

Register early and unconditionally. `Apps.Register` is load-order proof: called before Sideload has loaded, the
call is queued and replayed once the host appears. Every call is a no-op when Sideload is absent, so ship this
with a soft dependency and only check `Apps.Available` if you want a fallback UI of your own.

**Do not `Emit` from inside an `OnCall` handler.** That re-enters the script engine while it is still on the
stack. Emit from your update loop, as above.

## 4. index.html

No `<html>`, `<head>` or `<body>` boilerplate - the parser supplies them.

```html
<link rel="stylesheet" href="app.css">

<div class="screen">
  <header class="bar">
    <span class="title">Stash</span>
    <span class="badge" id="count">0</span>
  </header>

  <div class="list" id="items"></div>

  <div class="row">
    <input class="field" id="entry" placeholder="Add an item" maxlength="60">
    <button class="btn" id="add">Add</button>
  </div>
</div>

<script src="app.js"></script>
```

## 5. app.css

```css
body {
  /* Required. The root is auto height, so a percentage below has no basis without it. */
  height: 100%;
  font-family: game-ui;
  font-size: 14px;
  color: #ECEDF1;
}

.screen { height: 100%; padding: 16px; gap: 12px; background: #14161C; }

.bar { flex-direction: row; align-items: center; justify-content: space-between; }

.list { flex: 1; min-height: 0; overflow: auto; gap: 6px; }

.row { flex-direction: row; gap: 8px; }

.field { flex: 1; height: 40px; padding: 0 12px; border-radius: 8px; background: #1D2029; align-items: center; }

.btn { padding: 0 18px; height: 40px; border-radius: 8px; background: #5E6AD2; text-align: center; align-items: center; }
.btn:hover { background: #6E7AE2; }
```

Two things bite everyone once. **Every box is a flex column by default**, so a row needs
`flex-direction: row` explicitly. And **a scrollable box needs `min-height: 0`** next to its `flex: 1`, or the
automatic minimum keeps it as tall as its content and it never scrolls.

## 6. app.js and the dev folder

```js
const $ = (id) => document.getElementById(id);

function render() {
  const items = s1.call('items.list').split('\n').filter(Boolean);
  const box = $('items');
  box.replaceChildren();

  for (const text of items) {
    const row = document.createElement('div');
    row.className = 'item';
    row.textContent = text;
    box.appendChild(row);
  }

  $('count').textContent = String(items.length);
}

$('add').addEventListener('click', () => {
  const text = $('entry').value.trim();
  if (!text || s1.call('items.add', text) !== 'ok') return;
  $('entry').value = '';
  render();
});

s1.on('items.changed', render);
render();
```

Then, **in this order, because the second step only works before the first launch**:

1. `dotnet build` your mod.
2. Create `Schedule I/Mods/mystash/` and copy `index.html`, `app.css` and `app.js` into it.
3. Start the game.

The file watcher only starts if that folder exists when the page first builds. Launch first and you get no hot
reload for the whole session. See **[Dev Loop and Testing](/mods/sideload/guides/dev-loop-and-testing/)**.

Open the phone. Your app is on the home screen.

## Next

- **[The Bridge](/mods/sideload/guides/the-bridge/)** for anything structured crossing between C# and the page.
- **[CSS and Layout](/mods/sideload/guides/css-and-layout/)** before you design a real screen.
- **[Troubleshooting](/mods/sideload/guides/troubleshooting/)** the moment something looks wrong.

