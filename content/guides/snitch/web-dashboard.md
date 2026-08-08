---
title: "Web Dashboard"
description: "Snitch runs a tiny loopback server inside the game (`127.0.0.1:6140`) and streams live profiler data over"
sidebar:
  order: 3
---
Snitch runs a tiny loopback server inside the game (`127.0.0.1:6140`) and streams live profiler data over
WebSocket. A browser dashboard renders it in real time: a streaming frame-time chart, per-section costs,
entity-state distributions, counters, and a capability/honesty panel.

**Your telemetry never leaves your machine** - the page connects straight to `ws://127.0.0.1:6140`. The
hosted site only serves the static app.

## Three ways to open it

- **From the game.** The Snitch panel in the overlay has an **Open dashboard** button, and the console has
  `snitch dashboard`. Both pick the right address for you: the bundled copy at `http://127.0.0.1:<port>/` when
  one is installed beside the DLL in `Mods/Snitch/wwwroot`, and the hosted site otherwise. If the local data
  server is switched off, neither opens anything - a dashboard would have nothing to connect to, so it says so
  instead. Turn the server back on with `ServerEnabled` in MelonPreferences and restart.
- **Hosted:** open **[snitch.doodesch.de](https://snitch.doodesch.de)** in your browser. It auto-discovers
  your local game and connects.
- **Offline / bundled:** the exact same dashboard is bundled inside the mod and served at
  **`http://localhost:6140/`** - works with no internet.

## Auto-connect

The dashboard scans the loopback port, opens the WebSocket, and reconnects if the game restarts. When you open
the hosted (HTTPS) page, Chrome may show a one-time **"allow access to your local network"** prompt - allow it
(the server already sends the Private-Network-Access header).

## Reading it

- **Frame chart** - hover any point to read its value. X = recent samples (newest at the right), Y = mean
  frame time in ms (lower is better).
- **Sections** - per-section ms/frame, grouped by mod. Click a group header to collapse it; hover a row for
  the worst-frame ms and calls/frame.
- **State distributions** - hover a bar for the exact count and its share of the total.
- **Controls** - Start / Stop / Reset sampling and Export a report, straight from the page.
- **Mod panels** - each mod's own card, with its text readout, action buttons, toggles and
  [sliders](/mods/snitch/guides/sliders/). Drag a slider here and the game applies it live, clamped and snapped by the host.

## Connecting your own dashboard

The data is plain JSON. `GET /snapshot` returns the full state; `ws://127.0.0.1:6140/stream` pushes it live;
`GET /health` and `GET /caps` describe the instance; `POST /control` writes. See the wire format in the mod's
[`Server/WireProtocol.cs`](https://github.com/DooDesch-Mods/ScheduleOne-Snitch/blob/main/Server/WireProtocol.cs),
and the dashboard's own source at
[ScheduleOne-SnitchWeb](https://github.com/DooDesch-Mods/ScheduleOne-SnitchWeb).

### Sliders on the wire

Each entry of `panels[]` carries a `sliders` array beside `actions` and `toggles`:

```json
{
  "id": "Yoink",
  "title": "Yoink (Winch)",
  "actions": [ { "id": "Yoink:give-winch", "label": "give winch" } ],
  "toggles": [ { "id": "Yoink:arms-visible", "label": "arms visible", "value": true } ],
  "sliders": [
    { "id": "Yoink:pull-force", "label": "pull force", "unit": "N",
      "min": 0, "max": 60000, "step": 500, "value": 12000 }
  ]
}
```

`step` of `0` means continuous. **Treat the array as optional** - a game running an older Snitch omits it
entirely, so read it as `panel.sliders ?? []` rather than assuming it is there.

Write a slider through the control endpoint, the same one that carries `action` and `toggle`:

```
POST /control?cmd=slider&id=Yoink:pull-force&value=12500
```

`cmd`, `id` and `value` may also be sent as JSON fields in the body. The value goes over the wire as a plain
number and the game clamps it to the slider's range and snaps it to its step, so a client may send anything
without validating first. A missing `id` or an unparseable `value` comes back as
`{"ok":false,"error":"..."}`; a good one as `{"ok":true,"cmd":"slider"}`. The write itself is applied on the
game's main thread on its next frame, so read the value back from the following snapshot rather than assuming
it took effect immediately.

