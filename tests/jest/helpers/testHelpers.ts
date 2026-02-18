export async function waitForElement(root: ShadowRoot | Document, selector: string, timeout = 500) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = root.querySelector(selector);
    if (found) return found as Element;
    if (Date.now() - start > timeout) throw new Error(`Timeout waiting for ${selector}`);
    // small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 10));
  }
}

export function mockIndexedDbService(spies: Record<string, unknown>) {
  // spies: methodName -> value (resolved value or function)
  // This helper returns an object with restoreAll to cleanup
  const originals: Record<string, unknown> = {};
  try {
    // lazy import to avoid circulars at module load time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IndexedDbDataService = require('../../../src/data/IndexedDbDataService').default;
    for (const k of Object.keys(spies)) {
      if (Object.prototype.hasOwnProperty.call(IndexedDbDataService.prototype, k)) {
        originals[k] = (IndexedDbDataService.prototype as Record<string, unknown>)[k];
        (IndexedDbDataService.prototype as Record<string, unknown>)[k] = spies[k];
      }
    }
  } catch (e) {
    // ignore if can't mock
  }

  return {
    restoreAll: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IndexedDbDataService = require('../../../src/data/IndexedDbDataService').default;
        for (const k of Object.keys(originals)) {
          (IndexedDbDataService.prototype as Record<string, unknown>)[k] = originals[k];
        }
      } catch (e) {
        // noop
      }
    },
  };
}
