import { PWAManager } from '../../src/utils/pwa.ts';

describe('PWAManager ignore persistence', () => {
  beforeEach(() => {
    // Ensure the DOM has the install container elements the manager expects
    document.body.innerHTML = `<div class="install-container" style="display:none"><button id="install-button"></button><button id="install-ignore"></button></div>`;
    // Clear any persisted state
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  test('ignoring install persists dismissal', () => {
    // initialize manager so listeners are wired
    new PWAManager();

    // Simulate beforeinstallprompt event being fired
    const ev = new Event('beforeinstallprompt');
    // attach a preventDefault since the manager calls it
  // attach a preventDefault shim for the test event
  (ev as any).preventDefault = () => {};
    window.dispatchEvent(ev);

    // The showInstallButton should have wired up ignore button to persist
    const ignoreBtn = document.getElementById('install-ignore') as HTMLButtonElement | null;
    expect(ignoreBtn).toBeTruthy();
    ignoreBtn!.click();

    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
  });
});
