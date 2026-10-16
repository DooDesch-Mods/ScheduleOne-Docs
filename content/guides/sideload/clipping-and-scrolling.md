---
title: "Clip and scroll content"
description: "Cut a box's contents at its edge, pan a map inside a window, and scroll a list."
sidebar:
  order: 12
---
Use `overflow: hidden` to cut a box's contents off at its edge. Use `overflow-y: auto` to scroll a list. For the CSS properties, see [CSS and layout reference](/mods/sideload/guides/css-and-layout/).

## Pan a map inside a window

1. Make the viewport clip and the inner box absolute:

   ```css
   .viewport { flex: 1; min-height: 0; overflow: hidden; position: relative; }
   .world    { position: absolute; width: 2000px; height: 2000px; }
   ```

2. Move the inner box with `transform`:

   ```js
   world.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + zoom + ')';
   ```

The viewport clips at every point of the gesture. `transform` repaints one box instead of rebuilding the page - see [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/).

## Scroll a list

```css
.list { flex: 1; min-height: 0; overflow-y: auto; }
```

`overflow-y: auto` or `scroll` builds a scroll area once the content is taller than the box. `visible` is the default and clips nothing. `clip` is accepted as `hidden`.

A wheel notch glides to its target in about 0.17 s. The wheel also works over the empty parts of a list. For a map or anything that follows the pointer, turn the easing off:

```css
.map { overflow: auto; -s1-scroll: instant; }
```

## How clipping works

- A Sideload box is a bare `CanvasRenderer`, not a `Graphic`. `RectMask2D` cannot clip it, so the engine uses `CanvasRenderer.EnableRectClipping(Rect)` in root canvas space. Every box keeps the one shared material, so batching survives.
- One ambient clip rectangle (`BoxRenderer.ActiveClip`) is carried down the paint. A clipping box pushes its own rectangle intersected with the active one, paints its children, then restores the outer one. An inner window is never larger than the one around it.
- A clipping box draws its own background and border with the outer rectangle. A box clips what is inside it, not itself.
- `position: fixed` leaves the clip stack. The box is measured against the phone screen and drawn last, so a dialog inside a scrolling list still covers the screen.
- A scrolling box takes its rectangle from the layout. An `overflow: hidden` box takes it from its own world corners, so it follows a CSS `transform` on any ancestor.
- Text, images and input fields take the same rectangle and set `maskable = false`. This stops the phone container's own mask from culling them when a list moves. An `<input>` or `<textarea>` clips text and placeholder to its content box and to the scroll area around it.
- A scroll area is a `ScrollRect` with its viewport and content as child nodes of the box. It has no `RectMask2D`, because a portrait phone rotates the panel by 90 degrees and that mask then culls all children. The engine reapplies the clip to the subtree on every scroll event.

## Cost

- A clipping box costs one rectangle, computed during the normal paint.
- A scroll area costs two nodes (a transparent `Image` and a `ScrollRect`) plus a subtree walk per scroll event.

## Limits

- **No horizontal scroll area.** `overflow-x: auto|scroll` builds nothing. Move a sideways strip with a `transform` inside an `overflow: hidden` box.
- **The clip is an axis-aligned rectangle.** A rounded box does not clip children to its radius. Give the child the same radius, or inset it.
- **A scroll area's clip ignores transforms.** A scrolling list inside a panned or zoomed box clips where the layout put it. Keep the list outside the transformed box.
- **A clip hides pixels, not hit targets.** A row scrolled out of sight keeps its clickable quad. "Clipped away" does not mean "out of reach".
- **No scroll offset.** `scrollToEnd()` is the only scroll member. You cannot read or set the offset, or test for the bottom. The host restores offsets across a rebuild. See [Phone integration](/mods/sideload/guides/phone-integration/).

## Next

- [CSS and layout reference](/mods/sideload/guides/css-and-layout/)
- [Troubleshooting](/mods/sideload/guides/troubleshooting/)
