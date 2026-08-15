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

- a property with no case at all, which 1.9.0 already reported: `backdrop-filter`, `background-size`, `animation`
- a value the parsers cannot read, which drops that one declaration
- a value they read and the layout then ignores: `display: list-item`, `outline: auto`, `resize: vertical`
- a selector the DOM library rejected, which takes its whole rule with it
- a `@media` block no orientation on this screen can satisfy, and `@keyframes` and `@import`, which are skipped whole

The second and third of those are the ones that used to cost an afternoon, because the property looked
supported and was. Read the log before you read this page - it tells you about your stylesheet, and this page
only tells you about the engine.

Design against **733 x 400 CSS pixels landscape, 400 x 733 portrait**. The short side is always 400 CSS px
whatever the real panel measures, so one stylesheet fits every resolution.

## Supported

**Box:** `display` (`flex`, `inline-flex`, `block`, `inline-block`, `grid`, `list-item`, `none`), `width`, `height`, `min-width`,
`min-height`, `max-width`, `max-height`, `padding`, `margin`, `border`, `border-width`, `border-color`,
`border-radius` and every per-side and per-corner longhand, `position: absolute`/`relative`/`static`, `top`,
`right`, `bottom`, `left`, `inset`, `overflow`, `overflow-x`, `overflow-y`, `opacity`, `z-index`.

`z-index` needs a positioned box, exactly as in CSS: on a `position: static` box it is reported and ignored, and
everything without one paints in document order.

Every box is a flex container underneath - that is the only box this engine has - but since 1.31.0 `block` and
`flex` no longer behave the same: **a box only shrinks its children if it says `display: flex`** (or
`flex-direction`, `flex-wrap`, `flex-flow`). Anything else overflows, the way a block does. That is the one
difference worth knowing before you pick a value.

**Grid:** `grid-template-columns`, `grid-template-rows`, `grid-template-areas`, `grid-template`, `grid-auto-flow`,
`grid-auto-columns`, `grid-auto-rows`, `grid-column`, `grid-row` and their `-start`/`-end` longhands, `grid-area`,
`justify-items`, `justify-self`, `place-items`, `place-self`. `fr`, `repeat()` with `auto-fill` and `auto-fit`,
`minmax()`, `min-content` and `max-content` are read. Grid is real layout here, not a fallback to flex.

`position: fixed` is a **top layer**, added in 1.9.0: the box is measured against the whole phone screen rather
than its parent, drawn over everything else, and takes the clicks and the wheel while it is up. Write it
anywhere in the page - inside a scrolling list is fine, it still covers the screen - which is what makes it the
right tool for a dialog that asks before something you cannot undo.

**Flex:** `flex`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex-direction`, `flex-wrap`, `flex-flow`,
`justify-content`, `align-items` (including `baseline`), `align-self`, `align-content`, `gap`, `row-gap`,
`column-gap`.

**Paint:** `background`, `background-color`, `background-image` **for gradients only**, `linear-gradient()` with
exactly two colour stops and an optional leading angle, `box-shadow` (outer only), `color`, `outline` with
`outline-width`, `outline-color` and `outline-offset`.

`outline` draws a focus ring outside the box without moving it. `outline-style` is read only far enough to turn
the ring off with `none` or `hidden` - there is one outline appearance, so `dashed` and `dotted` are accepted and
draw the same solid ring.

Colours can be written the way a build tool writes them: `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()`, `hsla()`,
`oklch()`, `oklab()`, `lab()`, `lch()`, `color-mix()` and `currentColor` all resolve.

**Text:** `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, the `font` shorthand,
`text-align`, `text-decoration`, `text-transform`, `white-space` (`nowrap`, `pre`, `pre-wrap`),
`text-overflow: ellipsis`, `letter-spacing`, `word-break`, `overflow-wrap`, `word-wrap`, `vertical-align`
(`top`, `middle`, `bottom`, `baseline`), `tab-size`, `-s1-mono-advance`.

**Lists:** `list-style-type` picks between `disc`, `circle`, `square`, `decimal` and `none`, and `start` on an
`<ol>` counts from there.

**Interaction:** `pointer-events: none` takes a box out of hit testing, and `touch-action: none` says a box
handles its own drag so the scroll area above it does not steal the gesture - what a pannable map needs.

`inherit` works on every property the cascade can carry down.

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

**Other:** custom properties and `var()`, `!important`, inline `style` attributes, `calc()`, `min()`, `max()`
and `clamp()` nested in any order.

**Units:** `px`, `%`, `em`, `rem`, `lh`, `rlh`, `ch`, `vh`, `vw`, `vmin`, `vmax` (with the `svh`/`lvh`/`dvh`
family reading as `vh`), and the physical `pt`, `pc`, `cm`, `mm`, `in` at the CSS reference of 96 dpi. A
stylesheet pasted from the web keeps the sizes it names.

**Media queries** are evaluated rather than skipped. A width or height breakpoint resolves to the orientation it
really means on this screen - `(min-width: 640px)` **is** landscape here - and `hover`, `pointer` and the media
types are answered. Only a query no orientation can satisfy is reported and dropped.

## Not supported - say so rather than trying

`box-sizing: content-box` (border-box is always in force), `align-content: stretch`, `float`,
`display: inline`/`table`, `animation`/`@keyframes`, `visibility`, `background-image: url()`, `background-size`,
`background-position`, `background-repeat`, `filter`, `backdrop-filter`, `text-indent`, `resize`,
`font-variant-numeric`, and `subgrid`.

`inset` box-shadow layers are skipped, but only that layer - the rest of the declaration still draws. A handful
of properties are **accepted and deliberately do nothing** because there is nothing here to do: `cursor`,
`user-select`, `will-change`, `scrollbar-width`, `-webkit-font-smoothing` and the other compositor and
touch-scroll hints. Those are not reported as lost, because nothing was lost.

## Selectors

Everything AngleSharp's `querySelectorAll` accepts: type, class, id, descendant, child, attribute, `:not`,
`:nth-child`. Plus the state pseudo-classes `:hover`, `:active`, `:focus`, `:focus-visible`, `:focus-within`,
`:disabled` - **only on the last compound**. `.card:hover .title` matches, but the hover part is ignored, so the
rule applies all the time.

Pseudo-elements: `::before` and `::after` with `content`, and `::placeholder` (also spelled
`::-webkit-input-placeholder`) for the hint text in a field. Without a `::placeholder` rule the hint stays the
field's own type, faded, as it always was.

State rules **repaint, they do not re-lay-out**. `:hover` changing `background`, `border-color` or `color`
works. `:hover` changing `width`, `padding` or `display` does not. A style written from script takes the same
path for a shorter list of properties and rebuilds the page for the rest - see
**[JavaScript, DOM and Events](/mods/sideload/guides/javascript-dom-and-events/)**.

Cascade order: `!important` > inline `style` > specificity > document order.

## Three rules that differ from a browser

1. **Border-box everywhere.** `width` includes padding and border. Declaring `box-sizing: content-box` does
   nothing.
2. **A box is a flex container unless it says otherwise.** The default direction is a column, not a row, so a
   row needs `flex-direction: row` written out. There is no block flow, no line boxes and no margin collapsing.
3. **Height never feeds back into width.** Widths resolve first, text is measured against a known width, and
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
* **An input's `type` is read.** A checkbox and a radio are a box with a state that flips on click, clears its
  radio group and raises `input` and `change` - which is what a controlled React component listens for. Clicking
  the label works too. `hidden` is no box at all, and `button` draws its `value` as a label.

## Text compilation

An element whose children are only text and inline markup compiles to **one** TextMeshPro object, with
`b i strong em span` turned into TMP rich text inside it. So a sentence with inline emphasis is one draw call and
keeps its spaces.

An element with a mix of text and block children does not compile that way, and the text becomes its own leaf.

## Fonts

`font-family` names are the game's own TextMeshPro font assets, scanned at startup. `game-ui` is the safe
default. The full list is written to the log in a development build - see
**[Dev Loop and Testing](/mods/sideload/guides/dev-loop-and-testing/)**.

A stack is read the way a browser reads it: `Inter, game-comic` reaches the comic face instead of giving up on
the first name the machine does not have.

## Browser defaults, if you ask for them

An `<h1>` here is not big and a `<p>` has no spacing, because there is no user-agent stylesheet in the cascade.
Since 1.30.0 there is one, behind a meta tag:

```html
<meta name="sideload" content="web-defaults">
```

That turns on heading sizes, paragraph spacing, list indent, bold, italic and monospace for `code` and `pre`,
on the lowest cascade layer there is - **every rule you write beats it**. It is opt-in rather than on because
the shipped apps were written against a renderer without it, and a margin appearing around every paragraph in
all of them at once is not an improvement.

## How far this is from a browser

Written down rather than guessed at. The gap register holds 292 entries across CSS, layout, paint, HTML, the DOM
API and events, 214 of them still open, each anchored to a file and line in the engine and each marked with what
it blocks. It is kept in a private working repository, so what follows is the part of it worth publishing.

The numbers, measured by running real stylesheets through this parser and cascade:

| Stylesheet | Declarations that never arrive |
|---|---|
| The 14 shipped Sideload apps | 0.1 percent |
| Showcase: React 19 + Tailwind v4, through the Vite plugin | 2.3 percent |
| A Tailwind v3 build, raw | 8.4 percent |
| A Tailwind v4 build, raw | 13.2 percent |

**Point a build tool at it.** This page said the opposite for most of 1.x, and the reason it changed is the
same table read backwards: at 1.13.1 a Tailwind v4 build lost *everything*, because `@layer` wrapped the whole
sheet and the block was skipped whole. Then `@layer`, `rem`, `calc()`, `oklch()` and media queries each landed,
and each of them was most of a Tailwind sheet on its own.

`@doodesch/sideload-vite` closes most of the rest by rewriting what a web toolchain says into the spelling this
engine reads - logical properties to physical, nesting flattened, Tailwind's five-slot shadow chain down to the
layer that gets drawn. The two Tailwind v4 rows in the table are the same framework with and without it: 13.2
percent lost raw, 2.3 percent through the plugin. See **[Dev Loop and Testing](/mods/sideload/guides/dev-loop-and-testing/)** for the build, and
**[Your First App](/mods/sideload/guides/your-first-app/)** for the one command that sets it up.

Hand-written CSS against the list above is still the smallest thing that works, and the shipped apps are written
that way. It is no longer the only thing that works.

