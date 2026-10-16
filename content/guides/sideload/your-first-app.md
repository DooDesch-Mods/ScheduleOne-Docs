---
title: Build your first app
description: Build a small app with HTML, CSS and JavaScript and see its icon on the in-game phone.
sidebar:
  order: 1
---

Build a phone app from a web page and a few lines of C#. Its icon appears on the in-game phone.

**You need:** Schedule I with MelonLoader 0.7.3, Sideload installed, and the .NET SDK. Node.js is needed only for the scaffolder.

## Fast route: the scaffolder

1. Create the project.

   ```
   npx @doodesch/create-sideload-app my-app --template preact
   cd my-app
   npm install
   ```

2. Start the dev build. It rebuilds on save and copies the bundle to `Mods/<appId>/`, so no game restart is needed.

   ```
   npm run dev
   ```

3. Point it at your game once with `--deploy "D:/.../Schedule I/Mods"`. It remembers the path.
4. Fill in the two `PATH\TO` hints in the csproj (MelonLoader and `Sideload.cs`). The mod compiles to one DLL with the bundle embedded.

Templates: `preact` (default), `react`, `vanilla`. The script engine parses your framework each time a page opens, so bundle size is a load-time cost.

| Template | Bundle | Load | Mount 100 rows |
|---|---|---|---|
| `preact` | 14 kB | 37 ms | 53 ms |
| `react` | 139 kB | 113 ms | 54 ms |
| `vanilla` | 0 | 0 | - |

To add Sideload to an existing Vite project:

```
npm install -D @doodesch/sideload-vite
```

```js
import { defineConfig } from 'vite';
import { sideload } from '@doodesch/sideload-vite';

export default defineConfig({
  plugins: [sideload({ appId: 'myapp', deploy: 'D:/games/Schedule I/Mods' })],
});
```

Both packages are MIT and live under `tools/` in the Sideload repo. `examples/showcase` there is a full React 19, Tailwind v4 and TypeScript app.

## Steps: by hand

### 1. Lay out the project

```
MyMod/
  MyMod.csproj
  Core.cs
  Assets/mystash/index.html
  Assets/mystash/app.css
  Assets/mystash/app.js
  Assets/mystash/icon.png     optional
```

`icon.png` is a square PNG, 256x256, transparent outside the rounded square. Without it the app gets a flat colored square derived from its id.

### 2. Write MyMod.csproj

The project needs MelonLoader and the shim as source. It needs no Unity reference and no Sideload reference.

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

  <ItemGroup>
    <Compile Include="path\to\Sideload.cs" Link="Sideload.Api.cs" />
  </ItemGroup>

  <!-- The LogicalName prefix is the bundlePrefix you pass to Apps.Register. -->
  <ItemGroup>
    <EmbeddedResource Include="Assets/mystash/*">
      <LogicalName>MyMod.Assets.mystash.%(Filename)%(Extension)</LogicalName>
    </EmbeddedResource>
  </ItemGroup>

</Project>
```

Keep the `LogicalName`. Without it MSBuild mangles the resource names, `Apps.Register` finds no files, and the app is blank with no error.

### 3. Register the app in Core.cs

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

        public override void OnUpdate()
        {
            if (_revision == _pushed) return;
            _pushed = _revision;
            _app?.Emit("items.changed", Items.Count.ToString());
        }
    }
}
```

Register in `OnInitializeMelon`, without checks. A call made before Sideload loads is queued and replayed when the host appears. Every call is a no-op when Sideload is absent.

Do not call `Emit` inside an `OnCall` handler. Emit from your update loop, as above.

### 4. Write index.html

Leave out `<html>`, `<head>` and `<body>`. The parser adds them.

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

### 5. Write app.css

```css
body {
  /* Required. The root has auto height, so percentage heights below need this. */
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

- Every box is a flex column. Add `flex-direction: row` for a row.
- A scrollable box needs `min-height: 0` next to `flex: 1`. Without it the box grows to its content and never scrolls.

### 6. Write app.js

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

### 7. Build and create the dev folder before the first launch

1. Run `dotnet build` on your mod.
2. Create `Schedule I/Mods/mystash/` and copy `index.html`, `app.css` and `app.js` into it.
3. Start the game.

The file watcher starts only if that folder exists when the page first builds. If you launch first, you get no hot reload for the whole session.

## Check it works

Open the phone. The Stash icon is on the home screen. Open it, type an item, and press Add. The list and the counter update.

## Next

- [The bridge](/mods/sideload/guides/the-bridge/)
- [CSS and layout](/mods/sideload/guides/css-and-layout/)
- [Dev loop and testing](/mods/sideload/guides/dev-loop-and-testing/)
- [Troubleshooting](/mods/sideload/guides/troubleshooting/)
- [API reference](/mods/sideload/api/)
