import { isPWA } from '../../../src/utils/pwa-static.ts';

describe('PWAManager.isPWA', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNavigator = window.navigator;
  const originalReferrer = document.referrer;
  afterEach(() => {
    // restore
    Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true });
    Object.defineProperty(window, 'navigator', { value: originalNavigator, configurable: true });
    Object.defineProperty(document, 'referrer', { value: originalReferrer, configurable: true });
  });

  // Helpers to set/restore properties robustly in various jsdom/browser environments
  function setProp<T extends object, K extends string | number | symbol>(
    obj: T,
    prop: K,
    value: unknown,
  ) {
    try {
      Object.defineProperty(obj, prop as string, { value, configurable: true });
    } catch {
      try {
        // fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any)[prop] = value;
      } catch {
        // ignore
      }
    }
  }

  function setGetter<T extends object, K extends string | number | symbol>(
    obj: T,
    prop: K,
    getter: () => unknown,
  ) {
    try {
      Object.defineProperty(obj, prop as string, { get: getter, configurable: true });
    } catch {
      try {
        // fallback to value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any)[prop] = getter();
      } catch {
        // ignore
      }
    }
  }

  // No restore helper required: afterEach restores global originals.

  test('returns true when display-mode is standalone', () => {
    // assign test doubles using robust helper
    setProp(
      window,
      'matchMedia',
      (query: string) => ({ matches: true, media: query }) as MediaQueryList,
    );
    setProp(window, 'navigator', { standalone: false } as Navigator & { standalone?: boolean });

    expect(isPWA()).toBe(true);
  });

  test('returns false when not standalone', () => {
    // Some CI environments expose a non-configurable matchMedia; use getter to override reliably
    setGetter(
      window,
      'matchMedia',
      () => (query: string) => ({ matches: false, media: query }) as MediaQueryList,
    );
    setProp(window, 'navigator', { standalone: false } as Navigator & { standalone?: boolean });

    // ensure referrer doesn't indicate Android app - use getter helper to override jsdom accessor
    setGetter(document, 'referrer', () => '');

    expect(isPWA()).toBe(false);
  });
});
