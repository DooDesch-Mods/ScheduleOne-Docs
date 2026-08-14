---
title: "JavaScript, DOM and Events"
description: "Jint with every experimental feature on: **ES2015 through ES2024**."
sidebar:
  order: 5
---
## The language

Jint with every experimental feature on: **ES2015 through ES2024**. Classes with `#private` fields, optional
chaining, nullish coalescing, destructuring, template literals, generators, `async`/`await` syntax, spread,
`replaceChildren`, `at(-1)`. Nothing is transpiled or polyfilled - write modern JavaScript.

## Globals

`document`, `s1`, `console`, `fetch`, `Promise`, `FormData`, `setTimeout`, `setInterval`, `clearTimeout`,
`clearInterval`, `requestAnimationFrame`, `cancelAnimationFrame`, `devicePixelRatio`, `addEventListener`,
`removeEventListener`, `localStorage`, `sessionStorage`, and `window`, `self` and `globalThis`, which are all
three the global object itself.

`localStorage` and `sessionStorage` reach the same store as `s1.storage`, so a library that calls `getItem`
works without knowing where it is.

There is still no `navigator`, no file access, and no DOM beyond what this page lists - the element wrapper has
under seventy members against a browser's three hundred, and `dataset`, `scrollTop`, `offsetWidth`,
`insertAdjacentHTML`, `append` and `prepend` are among the ones missing. A missing member returns nothing rather than throwing, which
is why the preview shell exists. Timers are driven by the mod's update loop rather than by threads, so they fire on the Unity main
thread and never race with your C#.

## Engine limits

- **250 ms budget per handler.** A runaway loop is one hitched frame, not a hung game; the handler is aborted
  and the error is logged with `file:line`.
- **A page is refused before it is rendered** if it exceeds 20000 elements or 200 nesting levels. Styling,
  tree building and painting are each recursive, and blowing the managed stack takes the process down before an
  error page could be shown.
- **One script engine per page.** A reload drops it, so JS state and every listener start over - deliberately,
  because the script itself may be what changed.

## document

```js
document.getElementById('entry')
document.querySelector('.thread.on')
document.querySelectorAll('.bubble')
document.createElement('div')
document.addEventListener('back', fn)     // binds at <body>
```

## element

```js
el.textContent          el.className        el.id            el.value
el.appendChild(child)   el.replaceChildren()                 el.remove()
el.setAttribute(n, v)   el.getAttribute(n)  el.removeAttribute(n)
el.classList.add/remove/toggle/contains
el.style.backgroundColor = '#5E6AD2'   // any property, camelCase or the CSS spelling
el.style.cssText = 'left: 4px; top: 8px'
el.querySelector(sel)   el.querySelectorAll(sel)
el.addEventListener(type, fn)
el.focus()              // an input or textarea; ignored on anything else
el.scrollToEnd()        // the one method the host adds and a browser does not have
el.rect()               // { x, y, width, height } in css pixels, from the top left of the screen
```

**`replaceChildren()` takes no arguments** - it clears the element. Append the new children yourself.

**`el.rect()` is the whole geometry surface.** Sideload 1.12.0. There is no `getBoundingClientRect`, no
`offsetWidth`, no `clientHeight` and no scroll offset to read. The frame is the screen's top left, which is the
same one `position: fixed` uses - so a floating label positioned from a rect lands where you meant it.

It reflects the **last render**. A box the page has just created has not been laid out and reads as zeroes; ask
after the render that builds it, not in the handler that asked for it.

**`el.focus()` works before the field exists.** A focus asked for during startup, or right after a change that
has not been painted yet, is remembered and granted by the render that creates the field - so you never have to
wait for one. To keep the caret in a box rather than place it once, use `data-typing` instead; see
**[Keys and Typing](/mods/sideload/guides/keys-and-typing/)**.

**There is no `style.setProperty`.** Assign the property. `el.style.borderColor` and `el.style['border-color']`
reach the same declaration, and `cssText` reads and writes the whole inline block.

Every mutation goes through these wrappers, so the renderer marks the subtree dirty itself and coalesces a
frame's worth of changes into **one** rebuild. You never call a render function.

## Repaint or rebuild

A rebuild destroys and recreates every GameObject on the page, at roughly **half a millisecond per box**. On a
200-box page that is about 100 ms - once, for a click, nobody notices; sixty times a second to move something,
and the app hitches.

A short and closed list escapes it. Writing one of these repaints that single box, the same path a `:hover` rule
takes - new style, same layout, no new objects:

```
transform
background   background-color   background-image
border-color
border-radius   and the four per-corner longhands
box-shadow
```

Everything else rebuilds. So does `cssText`, which replaces the whole declaration block and can therefore
contain anything.

**`color` and `opacity` are deliberately not on the list**, though they change nothing but appearance. Both are
inherited, and a repaint redraws one box - descendants would keep the old value until something else forced a
rebuild. They take the rebuild, where they are correct.

The rule that follows for anything that moves at 60 Hz - a pan, a zoom, a slide-in:

```js
// hitches: left is a layout property, so every frame rebuilds the page
world.style.left = x + 'px';

// does not: one box, repainted
world.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + zoom + ')';
```

Writing many boxes at once is the opposite case. Each `el.style.left = ...` re-parses that element's whole inline
declaration block and writes it back, so placing a hundred markers with two property writes each is two hundred
parses - enough to blow the 250 ms handler budget and have the render killed part-way through, leaving the app
empty rather than slow. Write the attribute once instead, and take the single rebuild you were going to get
anyway:

```js
el.setAttribute('style', 'left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px');
```

## Events

Eleven types are dispatched, and no others. `pointerdown`, `change`, `focus`, `blur`, `keyup`, `mousemove` and
the rest do not fire, however plausible the name - registering them is silently useless.

| Event | Where | Carries | Raised when |
|---|---|---|---|
| `click` | the element | `e.offsetX/offsetY`, `e.normX/normY` | the player clicks a wired element |
| `input` | the control | `e.value` | the text in an `input`/`textarea` changed |
| `keydown` | the control | `e.key`, `e.value`, `e.ctrlKey/shiftKey/altKey`, `e.repeat`, `e.hasSelection` | Enter in a single-line field, plus every key the field named in `data-keys` |
| `dragstart` | the element | the offsets | a drag begins on an element the page listens to |
| `drag` | the element | the offsets, `e.deltaX/deltaY` | the pointer moved during that drag |
| `dragend` | the element | the offsets | the drag ended |
| `wheel` | the element | `e.wheelDelta` | a wheel notch over an element the page listens to |
| `back` | document | `e.source`, cancellable | right-click or Escape |
| `orientationchange` | document | `e.value` | the phone turned, after the page was laid out again |
| `mouseenter` | the element | - | the pointer arrived on it |
| `mouseleave` | the element | - | the pointer left it |

`mouseenter` and `mouseleave` do **not** bubble, exactly as in a browser: a tooltip that fired again for every
ancestor would open and shut as the pointer crossed each nested box on the way in. They are what makes a hover
tooltip buildable at all - `:hover` may repaint a box and may never lay one out, so the label has to come from
the page. Pair them with `el.rect()` to know where to put it.

`keydown` reaches a field for Enter and for nothing else unless the field NAMES the keys it wants, with
`data-keys="Tab ArrowUp Ctrl+R"`. That is one of three separate keyboard mechanisms and the smallest one -
which key reaches whom, what opens an app, and how a box keeps the caret are all on
**[Keys and Typing](/mods/sideload/guides/keys-and-typing/)**.

Events bubble to the document in registration order per node; `stopPropagation()` ends the walk. The event object
carries `type`, `target`, `currentTarget`, `value`, `key`, `ctrlKey`, `shiftKey`, `altKey`, `repeat`,
`hasSelection`, `source`, `offsetX`, `offsetY`, `normX`, `normY`,
`deltaX`, `deltaY`, `wheelDelta`, `defaultPrevented`, `preventDefault()` and `stopPropagation()`. Every field an
event does not carry is zero or an empty string rather than undefined, so read the ones its row names.

A hit target is only wired on elements that a state rule targets, that are `button`/`a`/`input`/`textarea`, or
that the script has a **click**, **drag** or **wheel** listener on. Everything else lets the pointer straight
through, which is what keeps a page of forty rows from being forty raycast targets.

That wiring is decided while the page renders, and adding a listener does not by itself mark the page dirty. The
usual case is safe, because building an element and appending it queues a rebuild anyway; a listener hung on an
element that was already on screen, with nothing else changed, starts working at the next one.

## Where the pointer landed

A `click` says where inside the element it happened: `e.offsetX` / `e.offsetY` in that element's own CSS pixels
from its top-left, and `e.normX` / `e.normY` as a 0..1 fraction of its width and height. A button does not need
this. A box that stands for a space of its own does:

```js
map.addEventListener('click', (e) => {
  const worldX = e.normX * WORLD_WIDTH;
  const worldY = e.normY * WORLD_HEIGHT;
  s1.call('map.mark', worldX.toFixed(1) + ',' + worldY.toFixed(1));
});
```

The fractions are the ones to reach for. They survive the element being resized, and the phone being turned,
without a second constant to keep in step.

A zero-sized box reports 0 rather than `NaN` - a collapsed row is normal, and a `NaN` reaching arithmetic is
worse than a zero.

## drag and wheel

Both are opt-in per element, and adding a listener is what opts in: a `dragstart`, `drag` or `dragend` listener
makes that element draggable, a `wheel` listener makes it take the wheel.

They are opt-in because both gestures are **taken away from the scroll area the element sits in**. A list row
that swallows the drag can no longer be scrolled past by dragging it; a box that takes the wheel stops the list
under it from scrolling while the pointer is over it. Put them on the thing that pans, not on every row.

```js
let x = 0, y = 0;

viewport.addEventListener('drag', (e) => {
  x += e.deltaX;
  y += e.deltaY;
  world.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
});

viewport.addEventListener('wheel', (e) => {
  zoom *= e.wheelDelta > 0 ? 0.9 : 1.1;
  apply();
});
```

`e.deltaX` / `e.deltaY` are how far the pointer moved since the previous event of that gesture, in CSS pixels,
with y growing downwards. They are zero on `dragstart` and `dragend`, which mark the ends of a gesture rather
than a movement inside it.

The delta is measured **against the page, not against the element**. An element that is being moved by the drag
is an element moving under the pointer, and measuring against it would feed this frame's movement into the next
frame's reading until the thing flew off the screen.

`e.wheelDelta` is one notch, positive when the wheel turns toward the player - the direction that carries a list
further down, and conventionally the one that zooms out. That is the sign a browser's `deltaY` has, and the
opposite of Unity's own.

A drag that ends on the element it started on does **not** also produce a click. uGUI would raise one, so a map
that recentres on click would jump the moment the player let go.

## back: right-click and Escape

Both mean back, exactly as they do in the vanilla apps - right-click steps out of a conversation before it closes
Messages. Taking the event is what keeps your app open:

```js
document.addEventListener('back', (e) => {
  if (!deepInside()) return;   // nothing to go back to, so Sideload closes the app
  e.preventDefault();
  goUpOneLevel();
});
```

Not listening is fine and closes the app, which is the right behaviour for a single-screen app. **An app with
internal navigation that does not listen traps the player one level deep**, so if you have panes, tabs or a
detail view, handle this.

**Check the orientation in that handler.** In landscape a two-pane app usually shows both panes, so there is
nothing to step back from and the press must close the app:

```js
document.addEventListener('back', (e) => {
  if (s1.orientation !== 'portrait' || pane !== 'detail') return;
  e.preventDefault();
  showList();
});
```

Without that check the app silently switches a pane nobody can see and stops closing at all.

`e.source` is `"rightClick"` or `"escape"` for the rare page that must tell them apart. Most should not.

## orientationchange

`@media` moves boxes. It cannot decide which pane the player should land on after a turn - that is a question
about what they were just looking at, and only your script knows:

```js
document.addEventListener('orientationchange', (e) => {
  if (e.value === 'portrait') showDetail();   // landscape had the detail on screen, so keep showing it
  render();
});
```

It fires **after** the page has been laid out at the new shape, so reading sizes in it is safe, and a change you
make gets one more rebuild on the next tick.

## console

`console.log`, `.info`, `.warn`, `.error`. Output goes to the MelonLoader log prefixed with your app id, and to
an attached Chrome DevTools console. Errors are also kept for the F9 overlay.

## Three patterns you will write anyway

Build an element in one expression. Almost every render line needs this shape:

```js
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
};
```

Bind per iteration, not after the loop. `for (const x of xs)` binds `x` per iteration, so a handler closes
over that item rather than the loop's last one. A `var` loop does not.

Do not call `scrollToEnd()` on every render. The host captures and restores scroll offsets across a rebuild,
so doing nothing keeps the reader's place. Call it only when the thing being read actually grew - remember the
identity and item count you last pinned for, and return early when neither moved.

