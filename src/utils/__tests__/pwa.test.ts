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

  test('returns true when display-mode is standalone', () => {
    // assign test doubles using Object.defineProperty
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({ matches: true, media: query }) as MediaQueryList,
      configurable: true,
    });
    Object.defineProperty(window, 'navigator', {
      value: { standalone: false } as Navigator & { standalone?: boolean },
      configurable: true,
    });

    expect(isPWA()).toBe(true);
  });

  test('returns false when not standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({ matches: false, media: query }) as MediaQueryList,
      configurable: true,
    });
    Object.defineProperty(window, 'navigator', {
      value: { standalone: false } as Navigator & { standalone?: boolean },
      configurable: true,
    });

  // ensure referrer doesn't indicate Android app - define a getter to override jsdom accessor
  Object.defineProperty(document, 'referrer', { get: () => '', configurable: true });

    expect(isPWA()).toBe(false);
  });
});
