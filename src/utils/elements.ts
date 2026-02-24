export function whenUpgraded<T extends HTMLElement = HTMLElement>(
  el: Element,
  tagName: string,
): Promise<T> {
  const ce = customElements.get(tagName);
  if (ce) {
    // Already defined; upgraded element should already have component API
    return Promise.resolve(el as T);
  }
  return customElements.whenDefined(tagName).then(() => el as T);
}

/** Queue a microtask; useful to wait for CE upgrade in some browsers */
export const nextMicrotask = () => Promise.resolve();
