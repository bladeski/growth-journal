import { isPWA } from '../pwa-static';

describe('PWAManager.isPWA', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNavigator = window.navigator;

  afterEach(() => {
    // restore
    Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true });
    Object.defineProperty(window, 'navigator', { value: originalNavigator, configurable: true });
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

    // ensure referrer doesn't indicate Android app
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });

    expect(isPWA()).toBe(false);
  });
});
