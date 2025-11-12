import { isPWA } from '../pwa-static';

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
  function setProp<T extends object, K extends keyof any>(obj: T, prop: K, value: any) {
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

  function setGetter<T extends object, K extends keyof any>(obj: T, prop: K, getter: () => any) {
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

  function restoreProp<T extends object, K extends keyof any>(obj: T, prop: K, original: any) {
    try {
      Object.defineProperty(obj, prop as string, { value: original, configurable: true });
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any)[prop] = original;
      } catch {
        // ignore
      }
    }
  }

  test('returns true when display-mode is standalone', () => {
    // assign test doubles using robust helper
    setProp(window, 'matchMedia', (query: string) => ({ matches: true, media: query }) as MediaQueryList);
    setProp(window, 'navigator', { standalone: false } as Navigator & { standalone?: boolean });

    expect(isPWA()).toBe(true);
  });

  test('returns false when not standalone', () => {
    setProp(window, 'matchMedia', (query: string) => ({ matches: false, media: query }) as MediaQueryList);
    setProp(window, 'navigator', { standalone: false } as Navigator & { standalone?: boolean });

    // ensure referrer doesn't indicate Android app - use getter helper to override jsdom accessor
    setGetter(document, 'referrer', () => '');

    // Diagnostic: assert which of the three checks is causing truthiness on CI
    const mmMatches = window.matchMedia('(display-mode: standalone)').matches;
    const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    const ref = document.referrer;
    // log for CI visibility
    // eslint-disable-next-line no-console
    console.debug('diag: matchMedia.matches=', mmMatches, 'navigator.standalone=', navStandalone, 'referrer=', ref);

    expect(mmMatches).toBe(false);
    expect(navStandalone).toBeFalsy();
    expect(ref.includes('android-app://')).toBe(false);
    expect(isPWA()).toBe(false);
  });
});
