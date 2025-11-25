import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager';

describe('PWAManager coverage helpers', () => {
  let origGetItem: any;

  beforeEach(() => {
    origGetItem = Storage.prototype.getItem;
    // ensure ServiceWorkerRegistration stub
    (window as any).ServiceWorkerRegistration = function () {} as any;
    (window as any).ServiceWorkerRegistration.prototype.sync = undefined;
    (navigator as any).serviceWorker = undefined;
    localStorage.removeItem('pwa-install-dismissed');
  });

  afterEach(() => {
    Storage.prototype.getItem = origGetItem;
    localStorage.removeItem('pwa-install-dismissed');
    jest.useRealTimers();
  });

  test('init tolerates localStorage.getItem throwing', () => {
    Storage.prototype.getItem = function () {
      throw new Error('storage fail');
    } as any;

    expect(() => new PWAManager()).not.toThrow();
  });

  test('registerServiceWorker handles register rejection', async () => {
    const registerMock = jest.fn().mockRejectedValue(new Error('register failed'));
    (navigator as any).serviceWorker = { register: registerMock };

    // should not throw during construction
    const mgr = new PWAManager();
    // wait a tick for the async registerServiceWorker to run
    await new Promise((r) => setTimeout(r, 0));
    expect(registerMock).toHaveBeenCalled();
  });

  test('syncOfflineData registers when sync supported', async () => {
    const reg = { sync: { register: jest.fn().mockResolvedValue(undefined) } };
    (navigator as any).serviceWorker = { ready: Promise.resolve(reg) };
    (window as any).ServiceWorkerRegistration.prototype.sync = true;

    const mgr = new PWAManager();
    await (mgr as any).syncOfflineData();
    expect(reg.sync.register).toHaveBeenCalledWith('background-sync-journal');
  });

  test('showUpdateAvailableNotification auto-hides after timeout', () => {
    jest.useFakeTimers();
    const mgr = new PWAManager();
    const el = document.createElement('div');
    el.id = 'update-notification';
    document.body.appendChild(el);

    (mgr as any).showUpdateAvailableNotification();
    expect(el.style.display).toBe('block');
    jest.advanceTimersByTime(5000);
    expect(el.style.display).toBe('none');
    document.body.removeChild(el);
    jest.useRealTimers();
  });

  test('appinstalled handler hides install UI and persists', async () => {
    const mgr = new PWAManager();
    const container = document.createElement('div');
    container.className = 'install-container';
    const installBtn = document.createElement('button');
    installBtn.id = 'install-button';
    container.appendChild(installBtn);
    document.body.appendChild(container);

    // dispatch appinstalled
    window.dispatchEvent(new Event('appinstalled'));
    await Promise.resolve();

    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
    document.body.removeChild(container);
  });
});
