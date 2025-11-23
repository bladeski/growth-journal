import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';
import '../../../src/components/Settings/Settings.ts';

// Ensure TextEncoder/TextDecoder are available in the Jest JSDOM environment
// @ts-expect-error
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
// @ts-expect-error
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

describe('Settings theme preferences', () => {
  let settingsEl: HTMLElement | null = null;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    // create element and attach to DOM so connectedCallback runs
    settingsEl = document.createElement('app-settings');
    document.body.appendChild(settingsEl);
    // clear any persisted preference
    localStorage.removeItem('gj_theme_preference');
    // clear pre-hydration window var
    try { delete (window as any).__gj_theme_pref; } catch (e) {}
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.removeItem('gj_theme_preference');
    try { delete (window as any).__gj_theme_pref; } catch (e) {}
    document.documentElement.removeAttribute('data-theme');
  });

  test('changeTheme persists selection and applies data-theme attribute', () => {
    const comp = settingsEl as unknown as { changeTheme?: (ev: Event) => void };
    // create a fake change event for selecting 'dark' with options so value is honoured
    const select = document.createElement('select');
    ['system', 'light', 'dark'].forEach((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.text = v;
      select.appendChild(o);
    });
    select.value = 'dark';
    const ev = { target: select } as unknown as Event;

    expect(localStorage.getItem('gj_theme_preference')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();

    if (comp.changeTheme) comp.changeTheme(ev);

    expect(localStorage.getItem('gj_theme_preference')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('applyThemePref respects system/window pre-hydration preference', () => {
    const comp = settingsEl as unknown as { applyThemePref?: (p: string) => void };
    // simulate pre-hydration preference by calling the internal helper
    if ((comp as any).applyThemePref) (comp as any).applyThemePref('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
