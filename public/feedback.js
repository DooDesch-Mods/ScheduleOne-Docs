/**
 * A page feedback control that reports to Umami. Self-contained: no dependencies, no build step, no backend.
 * Drop it on any site that already loads the Umami tracker:
 *
 *   <script defer src="https://docs.doodesch.de/feedback.js"
 *           data-support="https://support.doodesch.de/docs"></script>
 *
 * WHAT GOES WHERE, and why it is not one box for everything:
 *
 * The thumb and the reason go to Umami. Both are low-cardinality and carry nothing personal, which is what
 * an analytics store is good at: "eleven people found this page wrong" is a number you can sort a backlog by.
 *
 * Free prose does NOT go to Umami. Two reasons, and the second is the one that matters. Analytics has no
 * reply button - a sentence sitting in an event feed can be read and never answered. And people type their
 * name, their email, their save path into a comment box; that turns a cookieless analytics install into a
 * store of personal data by accident. Prose is handed to the support form instead, with the page prefilled,
 * where it becomes something a person can answer and close.
 *
 * The shape is the 2026 consensus for docs feedback: thumb first, then one lightweight question for the
 * "why", because a bare thumb tells you a page is bad and nothing about what to change.
 */
(() => {
  'use strict';

  const script = document.currentScript
    ?? document.querySelector('script[src$="feedback.js"]');
  const SUPPORT = script?.dataset.support ?? '';
  const EVENT = script?.dataset.event ?? 'page-feedback';
  const KEY = `feedback:${location.pathname}`;

  // Nothing to report to, nothing to show. A control that quietly discards clicks is worse than no control.
  if (!SUPPORT && !window.umami) return;

  const REASONS = [
    ['missing', 'Something is missing'],
    ['wrong', 'Something is wrong'],
    ['unclear', 'Hard to follow'],
    ['lost', 'I could not find it'],
  ];

  const track = (name, data) => {
    try {
      window.umami?.track(name, data);
    } catch {
      // Analytics blocked or not loaded. The control still has to behave.
    }
  };

  const remember = (value) => {
    try { localStorage.setItem(KEY, value); } catch { /* private mode; asking again is harmless */ }
  };
  const recall = () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  };

  if (recall()) return;   // already answered for this page in this browser

  const css = `
    .ddf {
      position: fixed; right: 1rem; bottom: 1rem; z-index: 2147483000;
      max-width: 17rem; box-sizing: border-box;
      padding: .6rem .75rem;
      font: 400 0.8125rem/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      border: 1px solid rgba(128,128,128,.35); border-radius: .4rem;
      background: Canvas; color: CanvasText;
      box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 8px 24px -12px rgb(0 0 0 / .35);
    }
    /* Under a phone-sized viewport a floating box covers what it is asking about. */
    @media (max-width: 45rem) { .ddf { display: none; } }
    @media (prefers-reduced-motion: no-preference) {
      .ddf { animation: ddf-in .18s ease-out; }
      @keyframes ddf-in { from { opacity: 0; transform: translateY(.35rem); } }
    }
    .ddf-row { display: flex; align-items: center; gap: .5rem; }
    .ddf-q { flex: 1 1 auto; margin: 0; }
    .ddf-b {
      font: inherit; color: inherit; cursor: pointer;
      background: transparent; border: 1px solid rgba(128,128,128,.45);
      border-radius: .25rem; padding: .1rem .45rem; line-height: 1.3;
    }
    .ddf-b:hover { border-color: currentColor; }
    .ddf-b:focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
    .ddf-x { border: 0; padding: .1rem .3rem; opacity: .6; }
    .ddf-list { display: flex; flex-direction: column; gap: .3rem; margin: .5rem 0 0; padding: 0; list-style: none; }
    .ddf-list .ddf-b { text-align: left; width: 100%; }
    .ddf-note { margin: .5rem 0 0; }
    .ddf-note a { color: inherit; }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const box = document.createElement('aside');
  box.className = 'ddf';
  box.setAttribute('aria-label', 'Page feedback');
  // The control replaces its own contents as it goes, so a screen reader has to be told each time.
  box.setAttribute('aria-live', 'polite');

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  const close = () => box.remove();

  /** Prose goes to a place that can answer it, with the page already filled in. */
  const supportLink = (label) => {
    const href = SUPPORT
      ? `${SUPPORT}${SUPPORT.includes('?') ? '&' : '?'}page=${encodeURIComponent(location.href)}`
      : null;
    return href ? el('a', { href, textContent: label, rel: 'noopener' }) : el('span');
  };

  const done = (message, offerDetail) => {
    box.textContent = '';
    box.append(el('p', { className: 'ddf-note' }, [
      document.createTextNode(message),
      ...(offerDetail ? [document.createTextNode(' '), supportLink('Tell us what happened')] : []),
    ]));
    setTimeout(close, offerDetail ? 12000 : 2500);
  };

  const askWhy = () => {
    box.textContent = '';
    box.append(
      el('div', { className: 'ddf-row' }, [
        el('p', { className: 'ddf-q', textContent: 'What was wrong with it?' }),
        el('button', { className: 'ddf-b ddf-x', type: 'button', textContent: '×', title: 'Dismiss', onclick: close }),
      ]),
      el('ul', { className: 'ddf-list' }, REASONS.map(([value, label]) =>
        el('li', {}, [
          el('button', {
            className: 'ddf-b', type: 'button', textContent: label,
            onclick: () => {
              track(`${EVENT}-reason`, { reason: value, path: location.pathname });
              done('Noted, thank you.', true);
            },
          }),
        ]))),
    );
  };

  const vote = (helpful) => {
    remember(helpful ? 'yes' : 'no');
    track(EVENT, { helpful, path: location.pathname });
    if (helpful) done('Good to hear, thank you.', false);
    else askWhy();
  };

  box.append(el('div', { className: 'ddf-row' }, [
    el('p', { className: 'ddf-q', textContent: 'Was this page useful?' }),
    el('button', {
      className: 'ddf-b', type: 'button', textContent: '\u{1F44D}',
      title: 'Yes', ariaLabel: 'Yes, this page was useful',
      onclick: () => vote(true),
    }),
    el('button', {
      className: 'ddf-b', type: 'button', textContent: '\u{1F44E}',
      title: 'No', ariaLabel: 'No, this page was not useful',
      onclick: () => vote(false),
    }),
    el('button', {
      className: 'ddf-b ddf-x', type: 'button', textContent: '×',
      title: 'Dismiss', ariaLabel: 'Dismiss', onclick: close,
    }),
  ]));

  document.body.append(box);
})();
