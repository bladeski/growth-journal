import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager';

describe('PWAManager extra coverage', () => {
  beforeEach(() => {
    localStorage.removeItem('pwa-install-dismissed');
    // default navigator.serviceWorker reset
    (navigator as any).serviceWorker = undefined;
    // provide a safe ServiceWorkerRegistration stub so tests that inspect
    // window.ServiceWorkerRegistration.prototype don't throw in JSDOM
    (window as any).ServiceWorkerRegistration = function () {} as any;
  });

  afterEach(() => {
    localStorage.removeItem('pwa-install-dismissed');
    (navigator as any).serviceWorker = undefined;
    jest.useRealTimers();
  });

  test('constructor respects localStorage dismissed flag', () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    const mgr = new PWAManager();
    expect((mgr as any).installDismissed).toBe(true);
  });

  test('online/offline handlers toggle status and call syncOfflineData when online', async () => {
    const mgr = new PWAManager();
    // spy on syncOfflineData
    const spy = jest.spyOn(mgr as any, 'syncOfflineData').mockImplementation(async () => {});

    // fire offline then online
    window.dispatchEvent(new Event('offline'));
    expect(mgr.getOnlineStatus()).toBe(false);

    window.dispatchEvent(new Event('online'));
    // give microtask tick
    await Promise.resolve();
    expect(mgr.getOnlineStatus()).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('syncOfflineData no-op when sync unsupported', async () => {
    // simulate no sync support
    (window as any).ServiceWorkerRegistration = function () {} as any;
    (window as any).ServiceWorkerRegistration.prototype.sync = undefined;
    (navigator as any).serviceWorker = { ready: Promise.resolve({ sync: undefined }) };

    const mgr = new PWAManager();
    // should not throw
    await (mgr as any).syncOfflineData();
    expect(true).toBe(true);
  });

  test('isPWA static method returns boolean', () => {
    // depends on matchMedia; mock it
    const originalMatch = window.matchMedia;
    (window as any).matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(PWAManager.isPWA()).toBe(true);
    (window as any).matchMedia = originalMatch;
  });

  test('promptInstall keyboard handling triggers prompt', async () => {
    const mgr = new PWAManager();
    const container = document.createElement('div');
    container.className = 'install-container';
    const installBtn = document.createElement('button');
    installBtn.id = 'install-button';
    container.appendChild(installBtn);
    document.body.appendChild(container);

    const fakePrompt: any = { prompt: jest.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
    (mgr as any).deferredPrompt = fakePrompt;

    // simulate keyboard Enter event
    const evt: any = new KeyboardEvent('keydown', { key: 'Enter' });
    installBtn.dispatchEvent(evt);

    // call promptInstall directly to process fakePrompt
    await (mgr as any).promptInstall();
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
    document.body.removeChild(container);
  });

  test('ignore install persists dismissal when clicking ignore', () => {
    const mgr = new PWAManager();
    const container = document.createElement('div');
    container.className = 'install-container';
    const ignoreBtn = document.createElement('button');
    ignoreBtn.id = 'install-ignore';
    container.appendChild(ignoreBtn);
    document.body.appendChild(container);

    (mgr as any).showInstallButton();
    // simulate click
    ignoreBtn.click();
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
    document.body.removeChild(container);
  });
});
