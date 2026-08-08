---
title: "Clipping and Scrolling"
description: "`overflow: hidden` cuts a box's contents off at its own edge."
sidebar:
  order: 6
---
`overflow: hidden` cuts a box's contents off at its own edge. `overflow-y: auto` does the same and adds a
vertical scroll area once the content is taller than the box. **[CSS and Layout](/mods/sideload/guides/css-and-layout/)** has the CSS;
this page is what happens underneath, because none of it uses the mechanism a Unity UI normally uses, and that
difference is where every edge on this page comes from.

Worth reading if you are writing a map, a graph or anything panned by a transform - and worth reading if you are
building your own uGUI renderer in an IL2CPP game, because the same three dead ends are waiting there.

## What you write

A window onto something bigger than itself:

```css
.viewport { flex: 1; min-height: 0; overflow: hidden; position: relative; }
.world    { position: absolute; width: 2000px; height: 2000px; }
```

```js
world.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + zoom + ')';
```

The viewport clips, the world moves inside it by `transform`, and nothing draws outside `.viewport` at any point
in the gesture. Moving by `transform` also repaints one box instead of rebuilding the page, which is the other
half of making a pan smooth - see **[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)**.

A list:

```css
.list { flex: 1; min-height: 0; overflow-y: auto; }
```

`clip` is accepted as a spelling of `hidden`. `visible` is the default and clips nothing.

## Why not the usual Unity way

A Sideload box is a bare `CanvasRenderer` with a mesh written straight into it. It is deliberately not a
`Graphic` subclass, and that decision is what removes the two obvious options:

* **`RectMask2D` only drives `Graphic` components.** It never looks at a box mesh, so it could clip the text and
  the images on a page and nothing else.
* **A `_ClipRect` material property never reaches the draw call.** `CanvasRenderer` has no
  `MaterialPropertyBlock`, and every box on a page shares one material on purpose. Per-box material values would
  mean per-box materials, and per-box materials mean a draw call each.

Deriving from `MaskableGraphic` after all does not rescue it. A managed type registered with
`ClassInjector.RegisterTypeInIl2Cpp` **can** inherit an IL2CPP class and its `OnPopulateMesh` override **is**
called - that part of the folklore is wrong, and it was measured in the game. What does not arrive are the
inherited Unity messages: `MaskableGraphic.OnEnable` is what registers a graphic with the `RectMask2D` above it,
it never runs for an injected type, and the quad drew unclipped. Deriving from `Graphic` buys rendering, not
masking.

That leaves `CanvasRenderer.EnableRectClipping(Rect)`, which is the supported API for exactly this case: a
rectangle per renderer, in **root canvas space**, with the shared material untouched so the batching survives.

## One rectangle, carried down the paint

There is a single ambient clip rectangle for the paint pass, `BoxRenderer.ActiveClip`. Every box is drawn with
whatever it holds at that moment.

A box that clips pushes its own rectangle, **intersected** with the one already active, paints its children, and
restores the outer rectangle on the way out. So clips nest correctly, an inner window can only ever be smaller
than the one around it, and nothing on the page can escape a clip above it by accident - there is no `z-index` to
climb out with.

The one deliberate way out is `position: fixed`, which is a **top layer** rather than an offset: the box leaves
the clip stack entirely, is measured against the phone screen and is drawn last. A dialog written inside a
scrolling list still covers the screen instead of being cut to the list.

A clipping box's own background and border are drawn with the OUTER rectangle, not its own. A box does not clip
itself, only what is inside it, which is what a browser does too.

## Where the rectangle comes from

Two sources, because the two cases genuinely differ.

**A scrolling box** takes its rectangle from the layout: the box's position in CSS pixels, mapped through the
page root into root-canvas space. That mapping carries the canvas scale and the 90 degree rotation a portrait
panel has, which is why the numbers are not simply the layout's own.

**A box with `overflow: hidden`** takes its rectangle from the box's own world corners instead. Those carry the
whole ancestor chain, including a CSS `transform` on some box above - which the layout by design knows nothing
about, since a transform is applied after layout and changes nothing about it. Before 1.1.0 the rectangle always
came from the layout, so inside a panned or zoomed window the clip sat where the boxes would have been rather
than where they are, and everything in the window vanished.

Two details in that computation are not optional. The corners are **sorted** into a min and a max rather than
taken in order, because a rotated ancestor hands them back in whatever order the rotation produced and assuming
corner zero is the bottom-left yields a negative size. And a rectangle that comes back degenerate, under half a
pixel on either axis, is **discarded in favour of the layout figure**: a node the canvas has not measured yet
reports 0x0, and a degenerate clip does not clip a little, it culls everything.

## Text, images and input fields

Those are real `Graphic` components, so they take the same rectangle through `CanvasRenderer` as well, with one
line in front of it that is load-bearing: `maskable = false`.

A `MaskableGraphic` recomputes which mask it belongs to whenever the hierarchy moves, and it looks for a
`RectMask2D` to obey. Sideload creates none - but the phone's own app container has one, and scrolled content
deliberately sits outside it. Without opting out, the vanilla mask culled every image and every line of text the
moment a list moved: the pictures disappeared and the rows went blank, while the boxes carried on drawing past
the edge of the screen because they are not `Graphic` components and were never re-examined.

An `<input>` or `<textarea>` clips its text and its placeholder to the control's own content box, intersected
with whatever scroll area the control sits in. That is what stops overtyping from drawing past the field, and
what makes a field in a scrolled list disappear with the row it belongs to.

## Scrolling

`overflow-y: auto` or `scroll` builds a `ScrollRect` once the content is taller than the box. The viewport and
the content are their own nodes under the box, never the box itself: a `Graphic` takes over the
`CanvasRenderer` it sits on, and the transparent one the wheel needs to hit would erase the box's mesh.

There is deliberately no `RectMask2D` on that viewport. It derives its clip from world corners taken in fixed
order, a phone in portrait rotates the whole panel by 90 degrees, and the rectangle then comes out with negative
width and height - the intersection is empty and every masked child is culled, so an app with a scrolling list
simply lost its text in portrait.

A wheel notch **glides** rather than jumping: the scroll position eases towards its target, closing about 18
times the remaining distance per second, which lands a notch in roughly a sixth of a second. Slow enough that
the eye can follow the content instead of re-finding it, quick enough that it never feels like waiting. The
wheel also works over the empty parts of a list, not only over its rows.

Opt out per box with `-s1-scroll: instant`. That is what a map or anything that follows the pointer wants -
there, easing is lag.

```css
.map { overflow: auto; -s1-scroll: instant; }
```

The clip is reapplied to the whole subtree on **every scroll event**. This is not tidiness: moving the content
makes every `MaskableGraphic` under it recompute its masking, so whatever was set at paint time is not what
survives the first wheel notch. The scroll event is the only point at which both the boxes and the graphics can
be put right again. It walks the components once and writes two fields per graphic, which is affordable at that
rate and is the reason it is not done per frame.

## What it costs

* A clipping box adds nothing. It is one rectangle, computed during the paint the page was doing anyway.
* A scroll area adds two nodes, a transparent `Image` and a `ScrollRect` per scrolling box, plus the subtree walk
  per scroll event.
* Clipping does not break batching. Every box stays on the one shared material.

## Edges

**No horizontal scroll area.** `overflow-x: auto|scroll` never builds one. Only `overflow-y` scrolls, and only
vertically. A sideways strip has to be moved by a `transform` inside an `overflow: hidden` box, which is the
pattern at the top of this page.

**The clip is an axis-aligned rectangle.** A rounded box does not clip its children to the radius, so a child's
square corner will draw over the parent's rounded one. Give the child the same radius, or inset it.

**A scroll area's clip is layout-derived**, so it is not transform-aware the way `overflow: hidden` is. A
scrolling list inside a box that is itself being panned or zoomed will clip where the layout put it. Keep the
scrolling list outside the transformed box.

**A clip hides pixels, not hit targets.** `RectMask2D` is also a raycast filter and marks fully clipped children
as culled; `EnableRectClipping` does neither, and Sideload sets no cull flag. A row that has scrolled out of
sight keeps the transparent quad that makes it clickable, wherever that quad has moved to. Do not read "clipped
away" as "out of reach".

**No scroll offset, in either direction.** `scrollToEnd()` is the only scroll member a page has: you cannot read
the offset, set it, or ask whether the reader is at the bottom. The host does restore offsets across a rebuild
by itself, which is the case that would otherwise hurt most. The full list of what the phone does not give a page
is in **[Phone Integration](/mods/sideload/guides/phone-integration/)**.

