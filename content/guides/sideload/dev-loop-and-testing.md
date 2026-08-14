---
title: "Dev Loop and Testing"
description: "Any file under `Mods/<appId>/` overrides the copy embedded in your DLL."
sidebar:
  order: 10
---
## Hot reload

Any file under `Mods/<appId>/` overrides the copy embedded in your DLL. Save it and the page rebuilds about
250 ms after the last write - no game restart, no rebuild of your mod.

```
Mods/mystash/index.html
Mods/mystash/app.css
Mods/mystash/app.js
```

Hard rules of the loop, each of which has cost someone an hour:

* **The folder must exist when the page first builds**, and this only works in a development build. If the
  overlay says "not watching - create Mods/<appId>/ to edit live", quit, create the folder, relaunch.
* **A leftover override outranks a fresh build.** Once that folder exists it wins over the embedded copy for
  every file it holds, so rebuilding your mod appears to change nothing and you debug a version of the page you
  stopped editing hours ago. Copy the bundle over after every build, or delete the folder when you are done.
* **A reload drops the script engine**, so JS state and every listener start over. That is deliberate - the
  script itself may be what changed.
* C# changes still need a rebuild and a game restart. Only the web files hot reload.
* An editor's UTF-8 BOM is stripped for you.

The same mechanism is what lets players reskin an app, so it is not a development-only hack.

The second rule is the one a build step removes for you: `npm run dev` in a project scaffolded with
`@doodesch/create-sideload-app` writes the bundle straight into `Mods/<appId>/` on every save, so the override
folder is never stale because it is never hand-copied. See
**[Your First App](/mods/sideload/guides/your-first-app/)**.

## The F9 overlay

**F9** shows, per mounted page: fps, the viewport size and scale, box / rule / wired counts, the render count
with the last render time in ms, the reload count, the script status with its last error, and whether the
watcher is running.

The render count is the one to watch. A page that rebuilds once per change is healthy; a page whose render
count climbs every frame is being told to rebuild by something that runs every frame.

It is also how you check that an animation takes the cheap path. A repaint does not count as a render, so a pan
driven by `transform` leaves the number flat while it moves; the same pan written as `left`/`top` adds one per
frame. See **[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)**.

**Ctrl+F10** outlines every box in magenta and every text leaf in cyan.

## Console commands

Debug builds only, and typed into the game's own dev console. They exist because a screenshot cannot tell
scrolling from cropping, and nothing outside the game can press a key or turn a wheel.

| Command | What it does |
|---|---|
| `sideloadkeys` | every key claim, in the order the key would be offered, and whether the gate is open |
| `sideloadkey <key>` | delivers that press down the same path a real one takes, gate and all - `sideloadkey Enter` |
| `sideloadwheel [notches] [appId]` | turns the wheel over the newest page through the real raycast and names what took the notch. Negative scrolls down |
| `sideloadsurface [off\|<width> <height>]` | mounts the selftest bundle in a panel over the middle of the screen, at a size you pick |

The console needs `Settings.ConsoleEnabled` and the host role. It is a live toggle in the settings window, so
there is no save to recreate for it.

`[Sideload/layout]` in the log is a full rect dump after every render - `x y w h right bottom` per node, plus the
compiled text verbatim for leaves. When a box is the wrong size, this says so numerically instead of you
squinting at a screenshot.

The font list is dumped once per session, which is where `font-family` names come from.

## Real Chrome DevTools

Turn on the `DevTools` preference and Sideload speaks the Chrome DevTools Protocol on `127.0.0.1`. Attach the
real inspector to a page running inside the game: console, evaluate, the Elements tree with computed styles, and
`Page.reload` re-reading your files from disk.

| Setting | Default | What it does |
|---|---|---|
| `DevTools` | `false` | The gate. Off means nothing listens and no page can be inspected from outside the game. Anything that can reach the port can run code in your pages, so leave it off unless you are building an app. |
| `DevToolsPort` | `9333` | The loopback port. Change it only on a clash. Clamped 1024-65535. |
| `DevToolsAutoOpen` | `true` | Opens Chrome or Edge at the landing page once the first page mounts. Off writes the address to the log instead. |
| `DevToolsFrontend` | empty | Point it at your own copy of the DevTools frontend to override everything below. |
| `DevToolsFetchFrontend` | `true` | Downloads the frontend once per machine (~4.5 MB) so DevTools works offline afterwards. Never while `DevTools` is off, never blocking the game. |

Nothing about your page leaves the machine either way: the frontend is static JavaScript talking to `127.0.0.1`.

## Browser preview

The same `app.js` and `app.css` run in Chrome against a stand-in bridge, so structure, copy, state and flow cost no
game launch. Your `preview.html` is about twenty lines:

```html
<link rel="stylesheet" href="sideload-preview.css">
<script type="module">
import { mount } from './sideload-preview.js';
import { call, ready, scenarios } from './s1-mock.js';

mount({ title: 'WhatsDab', appId: 'whatsdab', call, ready, scenarios });
</script>
```

Everything else - the stage at the game's own density, the phone-turn, the hot reload, the `back` and
`orientationchange` events, `scrollToEnd` - is shared and lives in `sideload-preview.js`. Copy it in with
`node sync.mjs` from `Workspace/tools/sideload-preview`; the
[reference app](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab/tree/main/Assets/whatsdab) is the finished
example.

**Do not hand-write the compatibility rules.** Five apps did, no two of them agreed, and every difference was a
case where the browser drew something the game does not: two ran their controls as `display: block`, two placed
absolutely positioned children against the wrong ancestor, and none set the engine's 15px base, so every page
previewed about 7% too large. `sideload-preview.css` is the one restatement, and a test reads its numbers back out
and compares them with the engine.

### The fence

A browser `Element` has about three hundred members. The engine's wrapper has under seventy, and the gap is all
one bug: `el.append(child)` works perfectly in Chrome and does nothing at all in the game, with no error either
side. So the shell hands your page proxied elements that name the first use of anything the engine lacks, and
shadows the globals it never installs - `navigator`, `location`, `getComputedStyle`, `matchMedia`,
`XMLHttpRequest`, `MutationObserver`. It names rather than throws; findings go to the console and to a panel
under the stage.

The allowlist is generated from `Sideload/Script/DomApi.cs`, so it cannot drift from the engine.

### Does the preview still start

```
cd Workspace/tools/sideload-preview
npm install && npm run smoke
```

A broken import, a renamed export or a handler that throws on the first call is silent until somebody opens the
page - and nobody opens it until they already suspect something. This boots every bundle against a headless DOM in
about a second and applies every named scenario, since a state nobody can reach is not a state.

Chrome lays the page out with its own engine, so the preview proves your **logic** and roughly the look, never
the exact pixels. Layout itself belongs in the headless tests below and, finally, in the game.

## Read the log first

Before any of the tools below. Since 1.12.0 Sideload names every rule it could not use when a page loads, once
per app, with the value that got lost:

```
[Sideload] my-app: 4 Deklaration(en) wirkungslos - der Browser befolgt sie, diese Engine nicht:
    'padding: 1rem' - der Wert ist fuer diese Engine unlesbar, die Deklaration faellt weg.
    'align-items: baseline' wird gelesen und dann ignoriert - es passiert nichts.
    '@media (min-width: 640px)' wird uebersprungen - der ganze Block darin ist wirkungslos.
    Listener auf 'change' - dieses Ereignis stellt Sideload nie zu, der Handler laeuft nie.
```

It reads the whole stylesheet, not only the rules matching something on screen, so one load gives you the full
answer for that sheet. It also stays on after the first build, so a style your script writes at runtime is named
the first time it happens rather than never. Each thing once, for the life of the view.

## Fail the build on a new one

The same reporting runs offline over a folder of stylesheets, so a page you have not launched yet answers
the same question - and a build can refuse to finish when the answer gets worse:

```
dotnet run --project Workspace/Tests/Sideload.Tests -v q --nologo -- \
    --corpus MyMod/Assets/myapp --baseline MyMod/Assets/myapp/css.baseline --fail-on all --quiet
```

It parses and cascades with the engine's own code, so it cannot drift from what the game does. Exit code 0
means nothing new, 2 means it named something and the build should stop.

| Flag | What it does |
|---|---|
| `--corpus <folder>` | Every `.css` under it, recursively. Required. |
| `--baseline <file>` | The losses already accepted. Anything not in it is new. |
| `--update-baseline` | Writes that file from today's run. Do this once, then shrink it. |
| `--fail-on <kind[,kind]>` | `all`, or any of `unknown-property`, `value-rejected`, `value-ignored`, `selector-rejected`, `at-rule-skipped`, `dead-event-listener`. Off by default. |
| `--quiet` | Prints one line per new finding and nothing at all otherwise. |
| `--json <file>` | The same run machine-readable: one record per finding with `kind`, `subject`, `detail`, `file`, `count` and a ready-to-print `message`. |
| `--out <file.md>` | The full table as Markdown instead of stdout. |

Run it once with `--update-baseline` before you turn the gate on, then delete lines from that file. The fourteen
shipped bundles report four findings between them today, so the gate is cheap to hold once you are there - it is
the first run on an app written against a browser that produces a list nobody wants to read.

Piping it into a Vite build needs no formatting of its own:

```js
for (const d of JSON.parse(report).diagnostics)
  if (d.new) this.warn(`${d.file}: ${d.message} (${d.count}x)`);
```

If you build with **[`@doodesch/sideload-vite`](https://www.npmjs.com/package/@doodesch/sideload-vite)**, most
of what this gate would have caught never reaches it: the plugin rewrites logical properties to physical,
flattens nesting, and collapses Tailwind's five-slot shadow chain to the layer that gets drawn. The gate is then
about what is left, which is a much shorter list.

## Headless tests

Your page's JavaScript can run against your real C# handlers, with no Unity and no game, in about a second.
One second against a game launch is why this is the first thing to set up.

The pattern: a `net8.0` console project that links your mod's logic files, embeds `app.js` as a resource, and
runs it on the same Jint version with a stand-in `document`, `s1` and `console`.

```csharp
var app = new AppHarness();                       // runs app.js against the real handlers
app.Click(app.El("add"));
app.Input(app.El("entry"), "wire up the phone");
Check.Eq("1", app.El("count").TextContent);
```

Structure your mod so this is possible: keep the MelonMod entry point free of logic and put the handlers and
data in their own files. **Keep those files free of any engine reference** - that is what lets the suite compile
them without Unity and catch an accidental dependency in a second rather than in a game launch. Anything that
does need the game goes in a separate folder behind an interface.

Two things to know about such a harness:

* **Adding an `s1.call` name means adding a case to the fake bridge's switch.** Miss it and the call returns
  `""` with no warning: your page renders an empty state and the test asserts happily on the wrong thing.
* **Assert on behaviour, then break it on purpose.** A test that stays green after you delete the line it covers
  is not testing that line.

What headless tests cannot cover: layout, text measurement, painting, anything touching TextMeshPro. A suite of
green tests still shipped a text box one line too short. Verify visuals in the game.

The reference app's suite is a working example, at
[Workspace/Tests/WhatsDab.Tests](https://github.com/DooDesch-Mods/ScheduleOne-WhatsDab) in the development
monorepo.

