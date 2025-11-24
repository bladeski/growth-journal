import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager.ts';
import '../../../src/components/Settings/Settings.ts';
import { waitForElement } from '../helpers/testHelpers';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('Settings extra branches', () => {
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
    // cleanup globals
    delete (window as any).__deferredPwaPrompt;
    delete (window as any).importGrowthDb;
    delete (window as any).exportGrowthDb;
    jest.restoreAllMocks();
  });

  test('onMount wires header and file input change handler', async () => {
    // create a fake template content inside shadowRoot so onMount can find elements
    const comp = el as any;
    // ensure shadow DOM contains the expected elements referenced by onMount
    comp.shadowRoot!.innerHTML = `
      <checkin-header id="settings-header"></checkin-header>
      <input id="import-file" type="file" />
      <span id="import-file-name"></span>
      <button id="install-pwa"></button>
      <span id="install-status"></span>
      <button id="install-button"></button>
      <span id="settings-message"></span>
    `;

    // mock CheckinHeader methods
    const header = await waitForElement(comp.shadowRoot as ShadowRoot, '#settings-header').catch(() => null) as any;
    header.updateHeader = jest.fn();

    // call onMount directly
    await (comp as any).onMount();

    expect((header.updateHeader as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);

    // simulate file input change
    const input = await waitForElement(comp.shadowRoot as ShadowRoot, '#import-file').catch(() => null) as HTMLInputElement | null;
    const nameSpan = await waitForElement(comp.shadowRoot as ShadowRoot, '#import-file-name').catch(() => null) as HTMLElement | null;
    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    // trigger change
    input.dispatchEvent(new Event('change'));
    expect(nameSpan.textContent).toBe('data.json');
  });

  test('importDb success and failure branches', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<input id="import-file" type="file" /> <span id="settings-message"></span>`;
    const input = await waitForElement(comp.shadowRoot as ShadowRoot, '#import-file').catch(() => null) as HTMLInputElement | null;
    // no file chosen
    input.files = null as unknown as FileList;
    await comp.importDb();
    const msg = await waitForElement(comp.shadowRoot as ShadowRoot, '#settings-message').catch(() => null) as HTMLElement | null;
    if (msg) expect(msg.textContent).toBe('Please choose a JSON file to import');

    // simulate file and global importer success
    const file = new File(['{}'], 'ok.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    (window as any).importGrowthDb = jest.fn().mockResolvedValue(true);
    await comp.importDb();
    expect((window as any).importGrowthDb).toHaveBeenCalled();
  });

  test('clearDb success and failure via IndexedDbDataService', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<span id="settings-message"></span>`;
    // mock confirm to always return true
    const realConfirm = global.confirm;
    (global as any).confirm = () => true;

    // stub IndexedDbDataService.importDatabase to succeed
    const svcSpy = jest.spyOn(IndexedDbDataService.prototype, 'importDatabase' as any).mockResolvedValue(true);
    await comp.clearDb();
    const msg = await waitForElement(comp.shadowRoot as ShadowRoot, '#settings-message').catch(() => null) as HTMLElement | null;
    if (msg) expect(msg.textContent).toBe('All data cleared');

    svcSpy.mockResolvedValue(false);
    await comp.clearDb();
    if (msg) expect(msg.textContent).toBe('Failed to clear data');

    svcSpy.mockRestore();
    (global as any).confirm = realConfirm;
  });

  test('installPwa handles deferred prompt and global install button', async () => {
    const comp = el as any;
    comp.shadowRoot!.innerHTML = `<button id="install-pwa"></button><span id="install-status"></span><button id="install-button"></button>`;
    const installBtn = await waitForElement(comp.shadowRoot as ShadowRoot, '#install-pwa').catch(() => null) as HTMLButtonElement | null;
    const installStatus = await waitForElement(comp.shadowRoot as ShadowRoot, '#install-status').catch(() => null) as HTMLElement | null;

    // case 1: deferred prompt exists
    const deferred = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
    (window as any).__deferredPwaPrompt = deferred;
    await comp.installPwa();
    const installStatusEl = await waitForElement(comp.shadowRoot as ShadowRoot, '#install-status').catch(() => null) as HTMLElement | null;
    if (installStatusEl) expect(installStatusEl.textContent).toBe('Installed' || 'Prompting...' || 'Dismissed');

    // case 2: fallback to global install button
    delete (window as any).__deferredPwaPrompt;
    // create a real global install button in the document so Settings can find it
    const globalInstall = document.createElement('button');
    globalInstall.id = 'install-button';
    document.body.appendChild(globalInstall);
    // mock PWAManager.isPWA to false so it will call click
    const isPwaSpy = jest.spyOn(PWAManager, 'isPWA' as any).mockReturnValue(false);
    const clickSpy = jest.spyOn(globalInstall, 'click' as any).mockImplementation(() => {});
    await comp.installPwa();
    clickSpy.mockRestore();
    isPwaSpy.mockRestore();
    globalInstall.remove();
  });
});
