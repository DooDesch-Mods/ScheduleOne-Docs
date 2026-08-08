/**
 * Rehype plugin: prefix the configured site `base` onto root-relative links
 * in markdown/MDX content.
 *
 * Starlight base-prefixes the links it generates itself (sidebar, hero actions),
 * but plain root-relative links written inside page content (e.g. `/networking/`)
 * are emitted as-is and would 404 under a project-pages base path. This rewrites
 * any content link that starts with a single `/` to include the base, while
 * leaving external links, protocol-relative `//` links, in-page anchors, and
 * links that already include the base untouched.
 */
export function rehypeBaseLinks({ base }) {
  const normalized = base && base !== '/' ? base.replace(/\/$/, '') : '';
  if (!normalized) return () => {};

  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const href = node.properties && node.properties.href;
      if (
        typeof href === 'string' &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        href !== normalized &&
        !href.startsWith(normalized + '/')
      ) {
        node.properties.href = normalized + href;
      }
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  };

  return (tree) => walk(tree);
}
