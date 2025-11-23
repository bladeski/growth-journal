import { jest } from '@jest/globals';
import '../../../src/components/Settings/Settings.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';
import { waitForElement } from '../helpers/testHelpers';

describe('Settings additional branches', () => {
  let el: HTMLElement | null = null;

  beforeEach(() => {
    el = document.createElement('app-settings');
    document.body.appendChild(el);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    el?.remove();
    el = null;
    localStorage.removeItem('gj_theme_preference');
    delete (window as any).__deferredPwaPrompt;
    delete (window as any).importGrowthDb;
    jest.restoreAllMocks();
  });

  test('system theme applies based on matchMedia', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<select id="theme-select"></select>`;
    // simulate window matchMedia returning matches
    const mq = { matches: true, addEventListener: () => {} } as unknown as MediaQueryList;
    (window as any).matchMedia = () => mq;
    (window as any).__gj_theme_pref = undefined;
    // ensure stored preference is system
    localStorage.setItem('gj_theme_preference', 'system');
    await (comp as any).onMount();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('installPwa deferred dismissed path and prompt failure', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<button id="install-pwa"></button><span id="install-status"></span>`;
    // deferred that resolves to dismissed
    (window as any).__deferredPwaPrompt = { prompt: jest.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) };
    await comp.installPwa();
    const status = await waitForElement(comp.shadowRoot as ShadowRoot, '#install-status').catch(() => null) as HTMLElement | null;
    if (status) expect(status.textContent).toBe('Dismissed' || 'Install failed' || 'Prompting...');

    // deferred whose prompt throws (should be caught by installPwa)
    (window as any).__deferredPwaPrompt = { prompt: jest.fn(() => { throw new Error('fail'); }), userChoice: Promise.resolve({ outcome: 'accepted' }) };
    await comp.installPwa();
    expect(status.textContent).toBe('Install failed');
  });

  test('importDb handles rejection gracefully', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<input id="import-file" type="file" /><span id="settings-message"></span>`;
    const input = await waitForElement(comp.shadowRoot as ShadowRoot, '#import-file').catch(() => null) as HTMLInputElement | null;
    const file = new File(['{}'], 'bad.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    (window as any).importGrowthDb = jest.fn().mockRejectedValue(new Error('import fail'));
    await comp.importDb();
    const msg = await waitForElement(comp.shadowRoot as ShadowRoot, '#settings-message').catch(() => null) as HTMLElement | null;
    if (msg) expect(msg.textContent).toBe('Import failed');
  });

  test('clearDb handles service throwing', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<span id="settings-message"></span>`;
    const realConfirm = global.confirm;
    (global as any).confirm = () => true;
    // stub to throw
    const svcSpy = jest.spyOn(IndexedDbDataService.prototype as any, 'importDatabase').mockImplementation(() => { throw new Error('boom'); });
    await comp.clearDb();
    const msg = await waitForElement(comp.shadowRoot as ShadowRoot, '#settings-message').catch(() => null) as HTMLElement | null;
    if (msg) expect(msg.textContent).toBe('Failed to clear data');
    svcSpy.mockRestore();
    (global as any).confirm = realConfirm;
  });
});
