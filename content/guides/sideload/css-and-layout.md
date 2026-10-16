---
title: "CSS and layout reference"
description: "Look up which CSS properties, units, selectors and layout rules the Sideload engine supports."
sidebar:
  order: 10
---
Look up what CSS works in a Sideload page. A declaration the engine cannot use is parsed and dropped. Your rule still loads and that one declaration does nothing.

Read the log first. Sideload names every rule it could not use, once per app, with the lost value:

- a property with no case at all: `backdrop-filter`, `background-size`, `animation`
- a value the parsers cannot read (the declaration is dropped)
- a value they read and the layout ignores: `display: list-item`, `outline: auto`, `resize: vertical`
- a selector the DOM library rejected (the whole rule is dropped)
- a `@media` block no orientation can satisfy, and `@keyframes` and `@import` (skipped whole)

Design for **733 x 400 CSS pixels landscape** and **400 x 733 portrait**. The short side is always 400 CSS px.

## Supported

**Box:** `display` (`flex`, `inline-flex`, `block`, `inline-block`, `grid`, `list-item`, `none`), `width`, `height`, `min-width`,
`min-height`, `max-width`, `max-height`, `padding`, `margin`, `border`, `border-width`, `border-color`,
`border-radius` and every per-side and per-corner longhand, `position: absolute`/`relative`/`static`, `top`,
`right`, `bottom`, `left`, `inset`, `overflow`, `overflow-x`, `overflow-y`, `opacity`, `z-index`.

- Every box is a flex container underneath. A box shrinks its children only if it says `display: flex` (or `flex-direction`, `flex-wrap`, `flex-flow`). Anything else overflows like a block.
- `z-index` needs a positioned box. On `position: static` it is reported and ignored. Boxes without it paint in document order.
- `position: fixed` is a top layer. The box is measured against the whole phone screen, drawn over everything and takes clicks and the wheel. Write it anywhere in the page, even inside a scrolling list. Use it for confirm dialogs.

**Grid:** `grid-template-columns`, `grid-template-rows`, `grid-template-areas`, `grid-template`, `grid-auto-flow`,
`grid-auto-columns`, `grid-auto-rows`, `grid-column`, `grid-row` and their `-start`/`-end` longhands, `grid-area`,
`justify-items`, `justify-self`, `place-items`, `place-self`. `fr`, `repeat()` with `auto-fill` and `auto-fit`,
`minmax()`, `min-content` and `max-content` are read.

**Flex:** `flex`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex-direction`, `flex-wrap`, `flex-flow`,
`justify-content`, `align-items` (including `baseline`), `align-self`, `align-content`, `gap`, `row-gap`,
`column-gap`.

**Paint:** `background`, `background-color`, `background-image` **for gradients only**, `linear-gradient()` with
exactly two colour stops and an optional leading angle, `box-shadow` (outer only), `color`, `outline` with
`outline-width`, `outline-color` and `outline-offset`.

- `outline` draws a ring outside the box without moving it. `outline-style: none` or `hidden` turns it off. Any other style draws the same solid ring.
- Colours: `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `oklab()`, `lab()`, `lch()`, `color-mix()` and `currentColor`.

**Text:** `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, the `font` shorthand,
`text-align`, `text-decoration`, `text-transform`, `white-space` (`nowrap`, `pre`, `pre-wrap`),
`text-overflow: ellipsis`, `letter-spacing`, `word-break`, `overflow-wrap`, `word-wrap`, `vertical-align`
(`top`, `middle`, `bottom`, `baseline`), `tab-size`, `-s1-mono-advance`.

- `font-family: monospace` builds a monospaced face from the player's own font. It tries Consolas, Cascadia Mono, Lucida Console, Courier New and DejaVu Sans Mono in that order and logs the pick. If none exists, it falls back to the game's pixel face.
- `pre` and `pre-wrap` keep runs of spaces. `-s1-mono-advance: 7px` gives every glyph the same advance. Use both for aligned columns.
- `pre` also marks a block as text. A block holding only coloured spans then compiles to one text object. Without it the spans become full-width boxes that stack down the page.

**Lists:** `list-style-type` takes `disc`, `circle`, `square`, `decimal` and `none`. `start` on an `<ol>` sets the first number.

**Interaction:** `pointer-events: none` removes a box from hit testing. `touch-action: none` stops the scroll area above from stealing a drag, which a pannable map needs.

**Caret and ghost text:** `caret-color` and `-s1-caret-width` style the cursor in a text field. `-s1-ghost-color` styles the `data-ghost` text. See [Phone Integration](/mods/sideload/guides/phone-integration/).

**Motion:** `transform` (translate, scale, rotate), `transition`, `transition-duration`, `transition-delay`,
`transition-timing-function`, `transition-property`. Transitions run on `opacity`, `color`,
`background-color`, `border-color` and the transforms only. An interrupted tween continues from the frame on screen.

**Other:** custom properties and `var()`, `!important`, inline `style` attributes, `inherit`, and `calc()`, `min()`, `max()`
and `clamp()` nested in any order.

**Units:** `px`, `%`, `em`, `rem`, `lh`, `rlh`, `ch`, `vh`, `vw`, `vmin`, `vmax` (`svh`/`lvh`/`dvh` read as `vh`), and `pt`, `pc`, `cm`, `mm`, `in` at 96 dpi.

**Media queries** are evaluated. A width or height breakpoint resolves to the orientation it means on this screen: `(min-width: 640px)` **is** landscape. `hover`, `pointer` and the media types are answered. A query no orientation can satisfy is reported and dropped.

## Not supported - say so rather than trying

`box-sizing: content-box` (border-box is always in force), `align-content: stretch`, `float`,
`display: inline`/`table`, `animation`/`@keyframes`, `visibility`, `background-image: url()`, `background-size`,
`background-position`, `background-repeat`, `filter`, `backdrop-filter`, `text-indent`, `resize`,
`font-variant-numeric`, and `subgrid`.

`inset` box-shadow layers are skipped. The rest of the declaration still draws. These properties are accepted and do nothing, and the log does not report them: `cursor`,
`user-select`, `will-change`, `scrollbar-width`, `-webkit-font-smoothing` and other compositor and
touch-scroll hints.

## Selectors

Everything AngleSharp's `querySelectorAll` accepts: type, class, id, descendant, child, attribute, `:not`,
`:nth-child`. The state pseudo-classes `:hover`, `:active`, `:focus`, `:focus-visible`, `:focus-within` and
`:disabled` work **only on the last compound**. In `.card:hover .title` the hover part is ignored and the rule always applies.

Pseudo-elements: `::before` and `::after` with `content`, and `::placeholder` (also `::-webkit-input-placeholder`).

State rules **repaint, they do not re-lay-out**. `:hover` changing `background`, `border-color` or `color` works. `:hover` changing `width`, `padding` or `display` does not. Styles written from script follow the same split - see [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/).

Cascade order: `!important` > inline `style` > specificity > document order.

## Rules that differ from a browser

1. **Border-box everywhere.** `width` includes padding and border.
2. **A box is a flex container with a column direction.** Write `flex-direction: row` for a row. There is no block flow, no line boxes and no margin collapsing. Auto margins are zero, so `margin: 0 auto` does not centre. Use `justify-content` or `align-self`.
3. **Height never feeds back into width.** Widths resolve first, then text is measured against that width.

## A list that will not scroll

A flex item's `min-height: auto` resolves to its content height. A `flex: 1` list then grows to fit all its rows and never scrolls. Add `min-height: 0`:

```css
.list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
```

Along a row's main axis and inside a scroll container the automatic minimum is already 0. The problem is columns.

## overflow

- `hidden` clips children at the box's edge and builds nothing else. Use it for a map or graph panned by a `transform` on an inner box.
- `auto` and `scroll` clip too, and add a vertical scroll area once the content is taller than the box.
- Either axis clips both. `overflow-x: hidden` also cuts the contents at the bottom edge.
- Only `overflow-y: auto|scroll` scrolls, and only vertically. `overflow-x` never builds a horizontal scroll area.
- A clip follows the transforms above it.
- `clip` is accepted as `hidden`.

More in [Clipping and scrolling](/mods/sideload/guides/clipping-and-scrolling/).

## Quirks inside the supported set

- **`line-height` is measured, not drawn.** Text height comes from TextMeshPro metrics, so `line-height` does not change the gap between rendered lines. Only an empty text leaf uses it.
- **`box-shadow` is outer only** and takes `offset-x offset-y [blur] [colour]`. With fewer than two lengths the declaration is ignored.
- **`linear-gradient` takes exactly two colour stops** and an optional leading angle. A third stop is ignored. A gradient replaces the flat fill.
- **Symbol characters draw as empty boxes.** The game's atlases carry Latin text only. Arrows, checkmarks, dingbats and `…` (U+2026) come out as tofu. Write the word, or use three full stops.
- **HTML tags with behaviour:** `input` and `textarea` become a real `TMP_InputField`. `button`, `a`, `input` and `textarea` always get a hit target. `head`, `script`, `style`, `title`, `meta` and `link` are skipped.
- **An input's `type` is read.** A checkbox or radio flips on click, clears its radio group and raises `input` and `change`. Clicking the label works. `hidden` is no box, and `button` draws its `value` as the label.

## Text compilation

An element whose children are only text and inline markup compiles to one TextMeshPro object. `b i strong em span` become TMP rich text inside it. An element that mixes text and block children does not compile that way, and its text becomes its own leaf.

## Fonts

`font-family` names are the game's TextMeshPro font assets, scanned at startup. `game-ui` is the safe default. A stack is read like a browser reads it: `Inter, game-comic` reaches the comic face. A development build writes the font list to the log - see [Dev loop and testing](/mods/sideload/guides/dev-loop-and-testing/).

## Browser defaults

There is no user-agent stylesheet, so an `<h1>` is not big and a `<p>` has no spacing. Needs Sideload 1.30+ to opt in:

```html
<meta name="sideload" content="web-defaults">
```

This turns on heading sizes, paragraph spacing, list indent, bold, italic and monospace for `code` and `pre`. It sits on the lowest cascade layer, so every rule you write beats it.

## Using a build tool

Measured by running real stylesheets through this parser and cascade:

| Stylesheet | Declarations that never arrive |
|---|---|
| The 14 shipped Sideload apps | 0.1 percent |
| Showcase: React 19 + Tailwind v4, through the Vite plugin | 1.9 percent |
| A Tailwind v3 build, raw | 8.2 percent |
| A Tailwind v4 build, raw | 12.7 percent |

`@doodesch/sideload-vite` rewrites web CSS into the spelling this engine reads: logical properties to physical, nesting flattened, Tailwind's five-slot shadow chain reduced to the layer that gets drawn. It takes Tailwind v4 from 12.7 to 1.9 percent lost. See [Dev loop and testing](/mods/sideload/guides/dev-loop-and-testing/) and [Build your first app](/mods/sideload/guides/your-first-app/).

## Next

- [JavaScript, DOM and events](/mods/sideload/guides/javascript-dom-and-events/)
- [Clipping and scrolling](/mods/sideload/guides/clipping-and-scrolling/)
- [Troubleshooting](/mods/sideload/guides/troubleshooting/)
