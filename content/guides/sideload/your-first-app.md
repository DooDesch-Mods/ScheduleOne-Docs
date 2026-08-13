---
title: "Your First App"
description: "One command, or six steps by hand, to an icon on the in-game phone."
sidebar:
  order: 2
---
Two routes to the same icon on the in-game phone. Take the first if you have Node; the second is the same thing
written out, and it is worth reading either way because it is what the scaffolder generates.

## One command

```
npx @doodesch/create-sideload-app my-app --template preact
cd my-app
npm install
npm run dev
```

`dev` rebuilds on save and copies the bundle into `Mods/<appId>/`, where Sideload picks it up without a game
restart. Point it at your install once with `--deploy "D:/.../Schedule I/Mods"` and it stays pointed.

It writes the web bundle, the C# mod that registers it, a Vite build that produces exactly the three files the
engine reads, and TypeScript types generated from the engine's own source - so the editor knows this `document`
has six members and an element is not a browser `Element`.

`--template react` and `--template vanilla` are the other two. **Preact is the default because of load time,
not render time:** the script engine parses your framework every time a page opens, so its size is a load-time
cost here rather than a download cost, which is the opposite of the web.

| | bundle | load | mount 100 rows |
|---|---|---|---|
| `preact` (default) | 14 kB | 37 ms | 53 ms |
| `react` | 139 kB | 113 ms | 54 ms |
| `vanilla` | 0 | 0 | - |

React is fully supported and 113 ms is affordable. It just buys nothing the 37 ms does not.

The mod half is a starting point rather than a finished build: fill in the two `PATH\TO` hints in the csproj
(MelonLoader, and `Sideload.cs`) and it compiles to one DLL with the bundle embedded.

The two packages are [`@doodesch/create-sideload-app`](https://www.npmjs.com/package/@doodesch/create-sideload-app)
and [`@doodesch/sideload-vite`](https://www.npmjs.com/package/@doodesch/sideload-vite), both MIT, both in the
Sideload repo under `tools/`. `@doodesch/sideload-vite` is also the way into an existing Vite project:

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

Want to read a real one before writing your own? `examples/showcase` in the Sideload repo is React 19, Tailwind
v4, Vite and TypeScript in a folder you can copy.

## By hand

Six steps, about twenty minutes. Follow them in order - step 6 only works if you do it before you launch the
game.

### 1. Project layout

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

### 2. MyMod.csproj

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

### 3. Core.cs

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

### 4. index.html

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

### 5. app.css

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

### 6. app.js and the dev folder

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

