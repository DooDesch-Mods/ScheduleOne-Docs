---
title: "Hot reload and test your app"
description: "Edit a page live in the game, inspect it, preview it in Chrome and test it headless."
sidebar:
  order: 14
---
Edit your page while the game runs, and test it without launching the game. Hot reload needs a development build.

## Hot reload

1. Create the folder `Mods/<appId>/` before the page first builds.
2. Put your web files in it:

   ```
   Mods/mystash/index.html
   Mods/mystash/app.css
   Mods/mystash/app.js
   ```

3. Save a file. The page rebuilds about 250 ms after the last write.

Rules:

- **The folder must exist at first build.** If the F9 overlay says "not watching - create Mods/<appId>/ to edit live", quit, create the folder and relaunch.
- **A leftover folder outranks a fresh build.** Every file in it wins over the embedded copy, so rebuilding your mod changes nothing. Copy the bundle in after every build, or delete the folder.
- **A reload drops the script engine.** JS state and listeners start over.
- C# changes need a rebuild and a game restart. An editor's UTF-8 BOM is stripped.

`npm run dev` in a project from `@doodesch/create-sideload-app` writes the bundle into `Mods/<appId>/` on every save, so the folder is never stale. See [Build your first app](/mods/sideload/guides/your-first-app/).

## Check it works

Press **F9**. For each mounted page it shows fps, viewport size and scale, box / rule / wired counts, render count with the last render time, reload count, the script status with its last error, and whether the watcher runs.

The render count should rise once per change. A count that climbs every frame means something rebuilds the page every frame. A repaint is not a render, so a pan driven by `transform` keeps the count flat. A pan written as `left`/`top` adds one per frame. See [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/).

**Ctrl+F10** outlines every box in magenta and every text leaf in cyan.

`[Sideload/layout]` in the log is a rect dump after every render: `x y w h right bottom` per node, plus the compiled text of leaves. Use it when a box has the wrong size. The font list is dumped once per session; it shows valid `font-family` names.

## Console commands

Debug builds only, typed into the game's dev console. The console needs `Settings.ConsoleEnabled` and the host role. Both are a live toggle in the settings window.

| Command | What it does |
|---|---|
| `sideloadkeys` | lists every key claim in offer order, and whether the gate is open |
| `sideloadkey <key>` | delivers that press down the real path, gate included - `sideloadkey Enter` |
| `sideloadwheel [notches] [appId]` | turns the wheel over the newest page through the real raycast and names what took the notch. Negative scrolls down |
| `sideloadsurface [off\|<width> <height>]` | mounts the selftest bundle in a panel at the middle of the screen, at the size you pick |

## Read the log first

When a page loads, Sideload names every rule it could not use, once per app, with the lost value (needs 1.12+):

```
[Sideload] my-app: 4 Deklaration(en) wirkungslos - der Browser befolgt sie, diese Engine nicht:
    'padding: 1rem' - der Wert ist fuer diese Engine unlesbar, die Deklaration faellt weg.
    'align-items: baseline' wird gelesen und dann ignoriert - es passiert nichts.
    '@media (min-width: 640px)' wird uebersprungen - der ganze Block darin ist wirkungslos.
    Listener auf 'change' - dieses Ereignis stellt Sideload nie zu, der Handler laeuft nie.
```

It reads the whole stylesheet. It stays on after the first build, so a style your script writes at runtime is named the first time it happens.

## Chrome DevTools

Set the `DevTools` preference to attach the real Chrome inspector to a page in the game. You get the console, evaluate, the Elements tree with computed styles, and `Page.reload`, which re-reads your files. Sideload speaks the DevTools protocol on `127.0.0.1`.

| Setting | Default | What it does |
|---|---|---|
| `DevTools` | `false` | The gate. Off means nothing listens. Anything that reaches the port can run code in your pages, so leave it off unless you build an app. |
| `DevToolsPort` | `9333` | The loopback port. Change it only on a clash. Clamped 1024-65535. |
| `DevToolsAutoOpen` | `true` | Opens Chrome or Edge at the landing page once the first page mounts. Off writes the address to the log. |
| `DevToolsFrontend` | empty | Path to your own DevTools frontend. Overrides the settings below. |
| `DevToolsFetchFrontend` | `true` | Downloads the frontend once per machine (about 4.5 MB) for offline use. Never runs while `DevTools` is off. |

## Browser preview

The same `app.js` and `app.css` run in Chrome against a stand-in bridge. This tests structure, copy, state and flow without a game launch. Write `preview.html`:

```html
<link rel="stylesheet" href="sideload-preview.css">
<script type="module">
import { mount } from './sideload-preview.js';
import { call, ready, scenarios } from './s1-mock.js';

mount({ title: 'WhatsDab', appId: 'whatsdab', call, ready, scenarios });
</script>
```

Copy the shared files in with `node sync.mjs` from `Workspace/tools/sideload-preview`. The [reference app](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab/tree/main/Assets/whatsdab) is a finished example.

Do not hand-write the compatibility rules. `sideload-preview.css` holds the engine's numbers, such as the 15px base, and a test compares them with the engine.

**The fence.** A browser `Element` has about three hundred members. The engine's wrapper has under seventy. `el.append(child)` works in Chrome and does nothing in the game, with no error. The shell proxies your elements and names the first use of anything the engine lacks. It also shadows globals the engine never installs: `navigator`, `location`, `getComputedStyle`, `matchMedia`, `XMLHttpRequest`, `MutationObserver`. Findings go to the console and to a panel under the stage. The allowlist is generated from `Sideload/Script/DomApi.cs`.

Check the preview still starts:

```
cd Workspace/tools/sideload-preview
npm install && npm run smoke
```

This boots every bundle against a headless DOM in about a second and applies every named scenario.

Chrome lays out with its own engine. The preview proves your logic and roughly the look, not exact pixels. Check layout in the headless tests below and in the game.

## Fail the build on a new CSS loss

The loss report also runs offline over a folder of stylesheets. A build can refuse to finish when the result gets worse:

```
dotnet run --project Workspace/Tests/Sideload.Tests -v q --nologo -- \
    --corpus MyMod/Assets/myapp --baseline MyMod/Assets/myapp/css.baseline --fail-on all --quiet
```

It parses and cascades with the engine's own code. Exit code 0 means nothing new. Exit code 2 means it named something and the build should stop.

| Flag | What it does |
|---|---|
| `--corpus <folder>` | Every `.css` under it, recursively. Required. |
| `--baseline <file>` | The losses already accepted. Anything not in it is new. |
| `--update-baseline` | Writes that file from today's run. Do this once, then shrink it. |
| `--fail-on <kind[,kind]>` | `all`, or any of `unknown-property`, `value-rejected`, `value-ignored`, `selector-rejected`, `at-rule-skipped`, `dead-event-listener`. Off by default. |
| `--quiet` | Prints one line per new finding and nothing otherwise. |
| `--json <file>` | Machine-readable run: one record per finding with `kind`, `subject`, `detail`, `file`, `count` and a `message`. |
| `--out <file.md>` | The full table as Markdown instead of stdout. |

Run `--update-baseline` once before you turn the gate on. Feed the JSON into a Vite build like this:

```js
for (const d of JSON.parse(report).diagnostics)
  if (d.new) this.warn(`${d.file}: ${d.message} (${d.count}x)`);
```

With **[`@doodesch/sideload-vite`](https://www.npmjs.com/package/@doodesch/sideload-vite)** most losses never reach the gate. The plugin rewrites logical properties to physical, flattens nesting and collapses Tailwind's five-slot shadow chain.

## Headless tests

Run your page's JavaScript against your real C# handlers with no Unity, in about a second. Create a `net8.0` console project that links your mod's logic files, embeds `app.js` as a resource, and runs it on the same Jint version with a stand-in `document`, `s1` and `console`.

```csharp
var app = new AppHarness();                       // runs app.js against the real handlers
app.Click(app.El("add"));
app.Input(app.El("entry"), "wire up the phone");
Check.Eq("1", app.El("count").TextContent);
```

- Keep the MelonMod entry point free of logic. Put handlers and data in their own files with **no engine reference**, so the suite compiles them without Unity. Put game-dependent code in a separate folder behind an interface.
- **A new `s1.call` name needs a case in the fake bridge's switch.** Otherwise the call returns `""` with no warning and the test passes on the wrong state.
- Assert on behaviour, then break the code on purpose. A test that stays green after you delete its line tests nothing.
- Headless tests cannot cover layout, text measurement, painting or TextMeshPro. Check visuals in the game.

A working suite is `Workspace/Tests/WhatsDab.Tests` in the [development monorepo](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab).

## Next

- [Troubleshooting](/mods/sideload/guides/troubleshooting/)
- [CSS and layout reference](/mods/sideload/guides/css-and-layout/)
