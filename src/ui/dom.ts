/* A very small DOM helper. docs/ARCHITECTURE.md says no UI framework, and nothing here
   needs one: the pages are built once and updated in a handful of named places. */

type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  html?: string;
  /** Anything else becomes an attribute, except on* which becomes a listener. */
  [key: string]: unknown;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  apply(node, props);
  append(node, children);
  return node;
}

export function svg(tag: string, props: Props = {}, ...children: Child[]): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

function apply(node: HTMLElement, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value as Partial<CSSStyleDeclaration>);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
}

function append(node: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

export const clear = (node: Element): void => {
  while (node.firstChild) node.removeChild(node.firstChild);
};

export const mount = (parent: Element, ...children: Child[]): void => {
  clear(parent);
  append(parent, children);
};

/** Escapes text that is going into innerHTML. */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
