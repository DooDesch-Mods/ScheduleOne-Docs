---
title: "CSS and Layout"
description: "The supported list is finite and comes straight from the engine's own property switch."
sidebar:
  order: 4
---
The supported list is finite and comes straight from the engine's own property switch. **Anything not on it is
parsed and thrown away** - your rule still loads, that one declaration simply does nothing.

Since 1.12.0 none of that happens quietly. The log names every rule the engine could not use, once per app, with
the value that got lost:

- a property with no case at all, which 1.9.0 already reported
- a value the parsers cannot read: `padding: 1rem`, `color: oklch(...)`, `width: calc(100% - 8px)`
- a value they read and the layout then ignores: `align-items: baseline`, `position: relative`, `margin: 0 auto`
- a selector the DOM library rejected, which takes its whole rule with it
- an at-rule block skipped whole: `@media (min-width: ...)`, `@keyframes`, `@layer`, `@import`

The second and third of those are the ones that used to cost an afternoon, because the property looked
supported and was. Read the log before you read this page - it tells you about your stylesheet, and this page
only tells you about the engine.

Design against **733 x 400 CSS pixels landscape, 400 x 733 portrait**. The short side is always 400 CSS px
whatever the real panel measures, so one stylesheet fits every resolution.

## Supported

**Box:** `display` (`flex`/`block`/`inline-block` all mean flex, plus `none`), `width`, `height`, `min-width`,
`min-height`, `max-width`, `max-height`, `padding`, `margin`, `border`, `border-width`, `border-color`,
`border-radius` and every per-side and per-corner longhand, `position: absolute`/`relative`/`static`, `top`,
`right`, `bottom`, `left`, `inset`, `overflow`, `overflow-x`, `overflow-y`, `opacity`.

`position: fixed` is a **top layer**, added in 1.9.0: the box is measured against the whole phone screen rather
than its parent, drawn over everything else, and takes the clicks and the wheel while it is up. Write it
anywhere in the page - inside a scrolling list is fine, it still covers the screen - which is what makes it the
right tool for a dialog that asks before something you cannot undo.

**Flex:** `flex`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex-direction`, `flex-wrap`, `justify-content`,
`align-items`, `align-self`, `gap`, `row-gap`, `column-gap`.

**Paint:** `background`, `background-color`, `linear-gradient()` with exactly two colour stops and an optional
leading angle, `box-shadow` (outer only), `color`.

**Text:** `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `text-align`, `white-space`
(`nowrap`, `pre`, `pre-wrap`), `text-overflow: ellipsis`, `letter-spacing`, `-s1-mono-advance`.

`font-family: monospace` is the one to reach for first: the game ships no monospaced font, so Sideload builds one
from the machine's own file, trying Consolas, Cascadia Mono, Lucida Console, Courier New and DejaVu Sans Mono in
that order and logging which it took. Nothing is redistributed - it is the player's own font. Where none exists it
falls back to the game's pixel face, and the two properties below are what keep the columns straight there.

`pre` and `pre-wrap` keep the runs of spaces you wrote instead of collapsing each to one, which is what a column
padded to a fixed width needs. `-s1-mono-advance: 7px` then gives every glyph that same advance - none of the
game's fonts are monospaced, and this is the only way an aligned table comes out of them.

`pre` carries a second meaning worth knowing. It tells the layout that a block is text, so a block holding
nothing but coloured spans compiles to ONE text object. Without it, a block with no direct text of its own is
not treated as inline, and every span becomes a full-width box: the spans stack down the page instead of
sitting in a row, and each one costs its own rebuild.

**Caret and ghost text:** `caret-color` and `-s1-caret-width` draw the cursor in a text field, so a block cursor
is two lines of CSS. `-s1-ghost-color` styles the ghost written by the `data-ghost` attribute - see
[Phone Integration](/mods/sideload/guides/phone-integration/).

**Motion:** `transform` (translate, scale, rotate), `transition`, `transition-duration`, `transition-delay`,
`transition-timing-function`, `transition-property`. Layout-free properties only - `opacity`, `color`,
`background-color`, `border-color` and the transforms. An interrupted tween continues from the frame on screen
rather than snapping.

**Other:** custom properties and `var()`, `!important`, inline `style` attributes, `@media (orientation:
portrait|landscape)`.

Units are **`px` and `%` only**.

## Not supported - say so rather than trying

`box-sizing` (border-box is always in force), `align-content`, `place-*`, CSS Grid, `float`,
`display: inline`/`table`, `z-index` (paint order is document order), `animation`/`@keyframes`, `cursor`,
`visibility`, `outline`, `text-decoration`, `text-transform`, `background-image: url()`, `background-size`,
`background-position`, `background-repeat`, `filter`, `backdrop-filter`, `inset` box-shadow (the `inset` keyword
makes the whole declaration drop), `hsl()`, `em`, `rem`, `vh`, `vw`, `calc()`, and any media query other than
orientation.

## Selectors

Everything AngleSharp's `querySelectorAll` accepts: type, class, id, descendant, child, attribute, `:not`,
`:nth-child`. Plus the state pseudo-classes `:hover`, `:active`, `:focus`, `:focus-visible`, `:focus-within`,
`:disabled` - **only on the last compound**. `.card:hover .title` matches, but the hover part is ignored, so the
rule applies all the time.

State rules **repaint, they do not re-lay-out**. `:hover` changing `background`, `border-color` or `color`
works. `:hover` changing `width`, `padding` or `display` does not. A style written from script takes the same
path for a shorter list of properties and rebuilds the page for the rest - see
**[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)**.

Cascade order: `!important` > inline `style` > specificity > document order.

## Four rules that differ from a browser

1. **Border-box everywhere.** `width` includes padding and border. Declaring `box-sizing` does nothing.
2. **Auto margins are zero.** `margin: 0 auto` does not centre. Use `justify-content`, `align-items` or
   `align-self` - the same trade React Native makes.
3. **`align-content` is not implemented.** Wrapped lines stack tightly from the cross start with the cross gap
   between them.
4. **Height never feeds back into width.** Widths resolve first, text is measured against a known width, and
   the resulting height can never change a width. That is what keeps a layout pass finite instead of oscillating.

## The automatic minimum, and why your list will not scroll

A flex item's `min-height: auto` resolves to its **content** height, per Flexbox 4.5. So a `flex: 1` box refuses
to shrink below its contents, and a scrollable list ends up as tall as everything in it - which means it never
scrolls, and it pushes its siblings off screen.

The fix is the same one a browser needs:

```css
.list {
  flex: 1;
  min-height: 0;   /* without this the box is as tall as its content and never scrolls */
  overflow: auto;
}
```

Along the main axis of a row, and inside a scroll container, the automatic minimum is already 0 - so this bites
on columns, which is where lists live.

## overflow: what clips and what scrolls

`hidden` clips. Children are cut off at the box's own edge, and nothing else is built - no scroll area, no wheel
handling. This is what a window onto something bigger than itself wants: a map, a graph, anything panned by a
`transform` on the box inside.

`auto` and `scroll` clip as well, and add a vertical scroll area once the content is taller than the box. Below
that height there is nothing sticking out, so there is nothing to clip.

Either axis counts for clipping. There is no way here to cut one side and not the other, so `overflow-x: hidden`
also stops the contents at the bottom edge.

A clip follows the transforms above it, so a box inside a panned or zoomed window is cut where its pixels
actually are rather than where the layout alone would have put it.

`overflow-x` still never builds a horizontal scroll area. Only `overflow-y: auto|scroll` produces one, and it is
vertical only. `overflow-x` does matter for the automatic minimum above.

Both `hidden` clipping and the transform-aware clip arrived in 1.1.0. Before it, `hidden` was parsed and then
dropped, so a box meant as a window let its contents draw across the phone and off it; and a clip inside a panned
window sat where the boxes would have been rather than where they are, which emptied the window instead.

`clip` is accepted as a spelling of `hidden`. How the clipping is actually done, what a scroll area is built out
of, and the edges that follow from both are in **[Clipping and Scrolling](/mods/sideload/guides/clipping-and-scrolling/)**.

## Quirks inside the supported set

* **`line-height` is measured, not drawn.** Text height comes from TextMeshPro's own metrics, so setting
  `line-height` does not change the gap between rendered lines. Only an empty text leaf falls back to it.
* **`box-shadow` is outer only**, and takes `offset-x offset-y [blur] [colour]`. Fewer than two lengths and the
  declaration is ignored.
* **`linear-gradient` takes exactly two colour stops** plus an optional leading angle. A third is ignored. A
  gradient replaces the flat fill.
* **Symbol characters draw as empty boxes.** The game's TextMeshPro atlases carry Latin text and little else, so
  arrows, checkmarks, dingbats - and `…` (U+2026), which every truncation helper appends by reflex - come out as
  tofu. Write the word, or draw the shape with boxes. Use three full stops.
* **HTML tags with behaviour:** `input` and `textarea` become a real `TMP_InputField`; `button`, `a`, `input`
  and `textarea` always get a hit target. `head`, `script`, `style`, `title`, `meta` and `link` are skipped.

## Text compilation

An element whose children are only text and inline markup compiles to **one** TextMeshPro object, with
`b i strong em span` turned into TMP rich text inside it. So a sentence with inline emphasis is one draw call and
keeps its spaces.

An element with a mix of text and block children does not compile that way, and the text becomes its own leaf.

## Fonts

`font-family` names are the game's own TextMeshPro font assets, scanned at startup. `game-ui` is the safe
default. The full list is written to the log in a development build - see
**[Dev Loop and Testing](/mods/sideload/guides/dev-loop-and-testing/)**.

## How far this is from a browser

Written down rather than guessed at. The
[gap register](https://github.com/DooDesch-Mods/ScheduleOne-Workspace/tree/main/docs/Sideload/gaps) has 282
entries across CSS, layout, paint, HTML, the DOM API and events, each with a file and line in the engine, and
each marked with what it blocks.

The numbers, measured by running real stylesheets through this parser and cascade:

| Stylesheet | Declarations that never arrive |
|---|---|
| The 14 shipped Sideload apps | 2 percent |
| A Tailwind v3 build | 66 percent |
| A Tailwind v4 build | all of it - `@layer` wraps everything, and the block is skipped whole |

Do not point a build tool at this engine yet. Write the CSS by hand against the list above.

