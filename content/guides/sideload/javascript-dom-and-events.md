---
title: "JavaScript, DOM and events reference"
description: "Look up the script engine, globals, DOM members and events available to a Sideload page."
sidebar:
  order: 11
---
Look up what JavaScript a Sideload page can use. The engine is Jint with every experimental feature on.

## The language

**ES2015 through ES2024.** Classes with `#private` fields, optional chaining, nullish coalescing, destructuring, template literals, generators, `async`/`await` syntax, spread, `replaceChildren`, `at(-1)`. Nothing is transpiled or polyfilled.

## Globals

`document`, `s1`, `console`, `fetch`, `Promise`, `FormData`, `setTimeout`, `setInterval`, `clearTimeout`,
`clearInterval`, `requestAnimationFrame`, `cancelAnimationFrame`, `devicePixelRatio`, `addEventListener`,
`removeEventListener`, `localStorage`, `sessionStorage`, and `window`, `self` and `globalThis`, which are all
three the global object itself.

`localStorage` and `sessionStorage` use the same store as `s1.storage`. Timers run on the Unity main thread and never race with your C#.

There is no `navigator` and there is no file access. The element wrapper has
under seventy members against a browser's three hundred. `dataset`, `scrollTop`, `offsetWidth`,
`insertAdjacentHTML`, `append` and `prepend` are among the ones missing. A missing member returns nothing and does not throw, so a bad call fails silently. The browser preview names such calls - see [Dev loop and testing](/mods/sideload/guides/dev-loop-and-testing/).

## Engine limits

- **250 ms budget per handler.** The engine aborts a slower handler and logs the error with `file:line`.
- **A page is refused before rendering** if it has more than 20000 elements or 200 nesting levels.
- **One script engine per page.** A reload drops it, so JS state and listeners start over.

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
el.scrollToEnd()        // host-only method, not in a browser
el.rect()               // { x, y, width, height } in css pixels, from the top left of the screen
```

- **`replaceChildren()` takes no arguments.** It clears the element. Append the new children yourself.
- **There is no `style.setProperty`.** Assign the property. `el.style.borderColor` and `el.style['border-color']` reach the same declaration.
- **`el.rect()` is the whole geometry surface** (needs Sideload 1.12+). There is no `getBoundingClientRect`, `offsetWidth`, `clientHeight` or scroll offset. The frame is the screen's top left, the same one `position: fixed` uses. It reflects the last render, so a box created in the current handler reads as zeroes.
- **`el.focus()` works before the field exists.** The render that creates the field grants the focus. To keep the caret in a box, use `data-typing` - see [Keys and typing](/mods/sideload/guides/keys-and-typing/).

Every mutation marks the subtree dirty. The renderer merges a frame's changes into one rebuild. Never call a render function.

## Repaint or rebuild

A rebuild recreates every GameObject on the page, at about **0.5 ms per box**. A 200-box page takes about 100 ms. That is fine for a click and a hitch at 60 times a second.

Writing one of these properties repaints a single box. The layout and objects stay the same:

```
transform
background   background-color   background-image
border-color
border-radius   and the four per-corner longhands
box-shadow
```

Everything else rebuilds, including `cssText`. `color` and `opacity` rebuild on purpose: both are inherited, and a repaint would leave descendants with the old value.

For anything that moves at 60 Hz (pan, zoom, slide-in), write `transform`:

```js
// hitches: left is a layout property, so every frame rebuilds the page
world.style.left = x + 'px';

// does not: one box, repainted
world.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + zoom + ')';
```

When you place many boxes at once, each `el.style.left = ...` re-parses the element's inline block. A hundred markers with two writes each is two hundred parses. That can exceed the 250 ms budget, abort the render and leave the app empty. Write the attribute once:

```js
el.setAttribute('style', 'left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px');
```

## Events

Eleven types are dispatched. Any other type (`pointerdown`, `change`, `focus`, `blur`, `keyup`, `mousemove`) never fires. The log names such a listener.

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

- `mouseenter` and `mouseleave` do not bubble. Pair them with `el.rect()` to place a hover tooltip. `:hover` cannot do that, because it cannot change layout.
- `keydown` reaches a field for Enter only, unless the field names more keys in `data-keys="Tab ArrowUp Ctrl+R"`. See [Keys and typing](/mods/sideload/guides/keys-and-typing/).
- Events bubble to the document in registration order per node. `stopPropagation()` ends the walk.
- The event object has `type`, `target`, `currentTarget`, `value`, `key`, `ctrlKey`, `shiftKey`, `altKey`, `repeat`,
  `hasSelection`, `source`, `offsetX`, `offsetY`, `normX`, `normY`,
  `deltaX`, `deltaY`, `wheelDelta`, `defaultPrevented`, `preventDefault()` and `stopPropagation()`. A field an event does not carry is zero or an empty string, never undefined.
- **A hit target exists only** on elements that a state rule targets, on `button`/`a`/`input`/`textarea`, and on elements with a **click**, **drag** or **wheel** listener. The pointer passes through everything else.
- The wiring is decided at render. A listener added to an element already on screen, with no other change, starts working at the next rebuild.

## Where the pointer landed

`click` carries `e.offsetX` / `e.offsetY` in the element's own CSS pixels from its top-left, and `e.normX` / `e.normY` as a 0..1 fraction of its width and height. Prefer the fractions: they survive resizing and turning the phone. A zero-sized box reports 0, never `NaN`.

```js
map.addEventListener('click', (e) => {
  const worldX = e.normX * WORLD_WIDTH;
  const worldY = e.normY * WORLD_HEIGHT;
  s1.call('map.mark', worldX.toFixed(1) + ',' + worldY.toFixed(1));
});
```

## drag and wheel

A `dragstart`, `drag` or `dragend` listener makes an element draggable. A `wheel` listener makes it take the wheel. Both gestures are **taken away from the scroll area the element sits in**: a draggable row cannot be scrolled past by dragging it, and a wheel-taking box stops the list under it from scrolling. Put the listeners on the thing that pans, not on every row.

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

- `e.deltaX` / `e.deltaY` are the pointer movement since the previous event, in CSS pixels, y down. They are zero on `dragstart` and `dragend`. They are measured against the page, so moving the dragged element does not feed back.
- `e.wheelDelta` is one notch. It is positive when the wheel turns toward the player (list scrolls down, conventionally zoom out). That is the sign of a browser's `deltaY`.
- A drag that ends on its own element does not also raise a click.

## back: right-click and Escape

Right-click and Escape both mean back. Calling `preventDefault()` keeps your app open:

```js
document.addEventListener('back', (e) => {
  if (!deepInside()) return;   // nothing to go back to, so Sideload closes the app
  e.preventDefault();
  goUpOneLevel();
});
```

Without a listener, back closes the app. **An app with panes, tabs or a detail view that has no listener traps the player one level deep.**

In landscape a two-pane app shows both panes, so back must close it. Check the orientation:

```js
document.addEventListener('back', (e) => {
  if (s1.orientation !== 'portrait' || pane !== 'detail') return;
  e.preventDefault();
  showList();
});
```

`e.source` is `"rightClick"` or `"escape"`.

## orientationchange

`@media` moves boxes, but only your script knows which pane the player should land on after a turn. The event fires after the page is laid out at the new shape, so reading sizes in it is safe.

```js
document.addEventListener('orientationchange', (e) => {
  if (e.value === 'portrait') showDetail();
  render();
});
```

## console

`console.log`, `.info`, `.warn`, `.error`. Output goes to the MelonLoader log prefixed with your app id, and to an attached Chrome DevTools console. The F9 overlay keeps errors.

## Patterns

Build an element in one expression:

```js
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
};
```

- Use `for (const x of xs)` so each handler closes over its own item. A `var` loop shares the last one.
- Do not call `scrollToEnd()` on every render. The host restores scroll offsets across a rebuild. Call it only when the content grew: remember the identity and item count you last pinned, and return early when neither moved.

## Next

- [Keys and typing](/mods/sideload/guides/keys-and-typing/)
- [CSS and layout reference](/mods/sideload/guides/css-and-layout/)
- [Troubleshooting](/mods/sideload/guides/troubleshooting/)
