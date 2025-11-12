import { isPWA } from '../pwa-static';

describe('PWAManager.isPWA', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNavigator = window.navigator;

  afterEach(() => {
    // restore
    // @ts-ignore
    window.matchMedia = originalMatchMedia;
    // @ts-ignore
    window.navigator = originalNavigator;
  });

  test('returns true when display-mode is standalone', () => {
    // @ts-ignore
    window.matchMedia = (query: string) => ({ matches: true, media: query } as MediaQueryList);
    // @ts-ignore
    window.navigator = { standalone: false } as Navigator & { standalone?: boolean };

  expect(isPWA()).toBe(true);
  });

  test('returns false when not standalone', () => {
    // @ts-ignore
    window.matchMedia = (query: string) => ({ matches: false, media: query } as MediaQueryList);
    // @ts-ignore
    window.navigator = { standalone: false } as Navigator & { standalone?: boolean };

    // ensure referrer doesn't indicate Android app
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });

  expect(isPWA()).toBe(false);
  });
});
