export async function waitForElement(root: ShadowRoot | Document, selector: string, timeout = 500) {
  const start = Date.now();
  while (true) {
    // @ts-ignore
    const found = root.querySelector(selector);
    if (found) return found as Element;
    if (Date.now() - start > timeout) throw new Error(`Timeout waiting for ${selector}`);
    // small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 10));
  }
}

export function mockIndexedDbService(spies: Record<string, any>) {
  // spies: methodName -> value (resolved value or function)
  // This helper returns an object with restoreAll to cleanup
  const originals: Record<string, any> = {};
  try {
    // lazy import to avoid circulars at module load time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IndexedDbDataService = require('../../../src/data/IndexedDbDataService').default;
    for (const k of Object.keys(spies)) {
      if ((IndexedDbDataService.prototype as any)[k]) {
        originals[k] = (IndexedDbDataService.prototype as any)[k];
        (IndexedDbDataService.prototype as any)[k] = spies[k];
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
          (IndexedDbDataService.prototype as any)[k] = originals[k];
        }
      } catch (e) {
        // noop
      }
    },
  };
}
