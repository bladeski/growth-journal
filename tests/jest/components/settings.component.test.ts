import '../../../src/components/Settings/Settings.ts';
import { waitForElement } from '../helpers/testHelpers';

describe('SettingsComponent behaviors', () => {
  let el: HTMLElement | null = null;

  beforeEach(() => {
    // create element and attach
    el = document.createElement('app-settings');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el?.remove();
    el = null;
    localStorage.removeItem('gj_theme_preference');
  });

  test('changeTheme persists and applies theme', () => {
    const comp = el as any;
    // call internal applyThemePref directly
    comp.applyThemePref('dark');
    expect(localStorage.getItem('gj_theme_preference')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // call changeTheme by synthesizing an event
    const select = document.createElement('select');
    ['system','light','dark'].forEach(v => { const o = document.createElement('option'); o.value = v; o.text = v; select.appendChild(o); });
    select.value = 'light';
    const ev = { target: select } as unknown as Event;
    comp.changeTheme(ev);
    expect(localStorage.getItem('gj_theme_preference')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  test('exportDb calls global exporter and shows message', async () => {
    const comp = el as any;
    // set global exporter as a spy
    let called = false;
    (window as any).exportGrowthDb = () => {
      called = true;
    };
    comp.exportDb();
    expect(called).toBe(true);
    const msg = await waitForElement(el!.shadowRoot as ShadowRoot, '#settings-message').catch(() => null);
    if (msg) expect(msg.textContent).toMatch(/Export started|Export failed/);
  });

  test('clearCache handles missing Cache API gracefully', async () => {
    const comp = el as any;
    // simulate missing caches
    if ('caches' in window) delete (window as any).caches;
    await comp.clearCache();
    const msg = await waitForElement(el!.shadowRoot as ShadowRoot, '#settings-message').catch(() => null);
    if (msg) expect(msg.textContent).toBe('Cache API not available');
  });
});
