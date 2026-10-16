---
title: Open the web dashboard
description: Watch live Snitch data in a browser, or read it from your own tool over JSON.
sidebar:
  order: 3
---

Open the Snitch dashboard in your browser. It shows a live frame chart, section costs, state bars, counters and your mod panels.

Snitch runs a loopback server at `127.0.0.1:6140` and streams data over WebSocket. The data never leaves your machine. The hosted site serves only the static app.

## Steps

1. Start the game and load a save.
2. Open the dashboard in one of three ways:
   - Press **Open dashboard** in the Snitch panel, or run `snitch dashboard`. Snitch picks the bundled copy (`Mods/Snitch/wwwroot`) if present, and the hosted site otherwise.
   - Open [snitch.doodesch.de](https://snitch.doodesch.de). It finds your game on its own.
   - Open `http://localhost:6140/`. This copy works offline.
3. If Chrome asks to "allow access to your local network", allow it. The hosted page needs it.
4. Press **Start**, or run `snitch start`. The dashboard stays idle until sampling is armed.

If the local data server is off, `snitch dashboard` opens nothing. Set `ServerEnabled` in MelonPreferences and restart.

## Check it works

The page shows a moving frame-time chart. If it says "Searching...", see [Troubleshooting](/mods/snitch/guides/troubleshooting/).

## What the page shows

- **Frame chart:** mean frame time in ms, newest sample on the right. Lower is better. Hover a point for its value.
- **Sections:** ms/frame per section, grouped by mod. Click a group header to collapse it. Hover a row for worst-frame ms and calls/frame.
- **State distributions:** hover a bar for its count and share.
- **Controls:** Start, Stop, Reset and report export.
- **Mod panels:** one card per mod with text, buttons, toggles and [sliders](/mods/snitch/guides/sliders/). The host clamps and snaps slider values.

## Read the data in your own tool

The data is JSON.

| Endpoint | Use |
|---|---|
| `GET /snapshot` | Full state. |
| `ws://127.0.0.1:6140/stream` | Live push of the state. |
| `GET /health`, `GET /caps` | Describe the instance. |
| `POST /control` | Write a command. |

The wire format is in [`Server/WireProtocol.cs`](https://github.com/DooDesch-Mods/ScheduleOne-Snitch/blob/main/Server/WireProtocol.cs). The dashboard source is [ScheduleOne-SnitchWeb](https://github.com/DooDesch-Mods/ScheduleOne-SnitchWeb).

Each entry of `panels[]` has `actions`, `toggles` and `sliders`:

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

`step` `0` means continuous. Read the array as `panel.sliders ?? []`: an older Snitch omits it.

Write a slider through `/control`:

```
POST /control?cmd=slider&id=Yoink:pull-force&value=12500
```

- `cmd`, `id` and `value` may also be JSON fields in the body.
- Send any number. The game clamps it and snaps it to the step.
- A good write returns `{"ok":true,"cmd":"slider"}`. A missing `id` or a bad `value` returns `{"ok":false,"error":"..."}`.
- The game applies the write on its next frame. Read the result from the next snapshot.

## Next

- [Console commands](/mods/snitch/guides/console-commands/)
- [Troubleshooting](/mods/snitch/guides/troubleshooting/)
