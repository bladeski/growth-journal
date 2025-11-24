import '../../../src/components/Settings/Settings';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';
import * as PwaManager from '../../../src/utils/PwaManager.ts';
import { jest } from '@jest/globals';

describe('SettingsComponent behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // DataTransfer polyfill for Jest environment
    if (typeof (global as any).DataTransfer === 'undefined') {
      // minimal polyfill supporting .items.add and .files
      (global as any).DataTransfer = class {
        items: any[] = [];
        files: any[] = [];
        constructor() {
          this.items = [];
          this.files = [];
        }
        getFiles() {
          return this.files;
        }
      } as any;
    }
    // ensure a minimal template is present so shadowRoot gets content
    const tpl = document.createElement('template');
    tpl.id = 'settings-template';
    document.body.appendChild(tpl);
  });

  test('exportDb calls global exporter and shows message', () => {
    const exportMock = jest.fn();
    (window as any).exportGrowthDb = exportMock;

    const el = document.createElement('app-settings') as any;
    // minimal template
    (el as any).templateFn = () => `<div><button id="export-db"></button><div id="settings-message"></div></div>`;
    document.body.appendChild(el);

    el.exportDb();
    expect(exportMock).toHaveBeenCalled();
    const msg = el.shadowRoot.querySelector('#settings-message').textContent;
    expect(msg).toMatch(/Export started/);
  });

  test('importDb warns when no file chosen and shows message', async () => {
    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><input id="import-file" type="file" /><div id="settings-message"></div></div>`;
    document.body.appendChild(el);

    await el.importDb();
    const msg = el.shadowRoot.querySelector('#settings-message').textContent;
    expect(msg).toBe('Please choose a JSON file to import');
  });

  test('importDb shows success and failure based on global importer', async () => {
    const successFile = new File(['{}'], 'data.json', { type: 'application/json' });
    const importer = jest.fn().mockResolvedValue(true);
    (window as any).importGrowthDb = importer;

    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><input id="import-file" type="file" /><div id="settings-message"></div></div>`;
    document.body.appendChild(el);

    const input = el.shadowRoot.querySelector('#import-file');
    // mock FileList with a minimal FileList-like object
    const fakeFileList: any = { 0: successFile, length: 1, item: (_: number) => successFile };
    Object.defineProperty(input, 'files', { value: fakeFileList, configurable: true });

    await el.importDb();
    expect(importer).toHaveBeenCalled();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('Import completed');

    // simulate failure
    importer.mockRejectedValueOnce(new Error('fail'));
    // re-use same files for failure case; importer will reject
    await el.importDb();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('Import failed');
  });

  test('clearDb calls IndexedDbDataService.importDatabase and respects confirm', async () => {
    const svcMock = jest.spyOn(IndexedDbDataService.prototype, 'importDatabase').mockResolvedValue(true);
    // stub confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><div id="settings-message"></div></div>`;
    document.body.appendChild(el);

    await el.clearDb();
    expect(confirmSpy).toHaveBeenCalled();
    expect(svcMock).toHaveBeenCalled();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('All data cleared');

    // failing import
    svcMock.mockResolvedValueOnce(false);
    await el.clearDb();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('Failed to clear data');
  });

  test('clearCache handles missing Cache API and clears caches when available', async () => {
    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><div id="settings-message"></div></div>`;
    document.body.appendChild(el);

    // no caches
    const originalCaches = (global as any).caches;
    delete (global as any).caches;
    await el.clearCache();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('Cache API not available');

    // restore and mock
    (global as any).caches = { keys: jest.fn().mockResolvedValue(['a', 'b']), delete: jest.fn().mockResolvedValue(true) };
    await el.clearCache();
    expect((global as any).caches.keys).toHaveBeenCalled();
    expect(el.shadowRoot.querySelector('#settings-message').textContent).toBe('Cache cleared');
    // restore
    (global as any).caches = originalCaches;
  });

  test('installPwa handles deferred prompt and global install button branches', async () => {
    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><button id="install-pwa"></button><span id="install-status"></span></div>`;
    document.body.appendChild(el);

    // deferred prompt branch
    const userChoice = Promise.resolve({ outcome: 'accepted' });
    (window as any).__deferredPwaPrompt = { prompt: jest.fn(), userChoice };
    await el.installPwa();
    expect(el.shadowRoot.querySelector('#install-status').textContent).toBe('Installed');

    // fallback global button branch
    delete (window as any).__deferredPwaPrompt;
    const globalBtn = document.createElement('button');
    globalBtn.id = 'install-button';
    document.body.appendChild(globalBtn);
    jest.spyOn(PwaManager.PWAManager, 'isPWA').mockReturnValue(false);
    await el.installPwa();
    expect(el.shadowRoot.querySelector('#install-status').textContent).toMatch(/Open|Opening/);
  });

  test('changeTheme writes localStorage and applies theme', () => {
    const el = document.createElement('app-settings') as any;
    (el as any).templateFn = () => `<div><select id="theme-select"><option value="dark">dark</option></select></div>`;
    document.body.appendChild(el);

    const select = document.createElement('select') as HTMLSelectElement;
    const opt = document.createElement('option');
    opt.value = 'dark';
    opt.text = 'dark';
    select.appendChild(opt);
    const evt = { target: select } as unknown as Event;
    select.value = 'dark';
    el.changeTheme(evt);
    expect(localStorage.getItem('gj_theme_preference')).toBe('dark');
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
