import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager';

describe('PWAManager deeper tests', () => {
  let origNavigatorSW: any;

  beforeEach(() => {
    origNavigatorSW = (navigator as any).serviceWorker;
    // clear localStorage flag
    localStorage.removeItem('pwa-install-dismissed');
  });

  afterEach(() => {
    (navigator as any).serviceWorker = origNavigatorSW;
    localStorage.removeItem('pwa-install-dismissed');
    jest.useRealTimers();
  });

  test('registerServiceWorker calls register when serviceWorker present', async () => {
    const registerMock = jest.fn().mockResolvedValue({});
    (navigator as any).serviceWorker = { register: registerMock };

    // construct manager (constructor triggers register)
    const mgr = new PWAManager();
    // allow microtasks
    await Promise.resolve();
    expect(registerMock).toHaveBeenCalled();
  });

  test('promptInstall accepted hides container and persists flag', async () => {
    const mgr = new PWAManager();
    // prepare DOM
    const container = document.createElement('div');
    container.className = 'install-container';
    const installBtn = document.createElement('button');
    installBtn.id = 'install-button';
    container.appendChild(installBtn);
    document.body.appendChild(container);

    // set deferred prompt
    const deferred: any = { prompt: jest.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
    (mgr as any).deferredPrompt = deferred;

    await (mgr as any).promptInstall();
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
    expect(container.style.display).toBe('none');
    document.body.removeChild(container);
  });

  test('showInstallButton and ignore persistence', () => {
    const mgr = new PWAManager();
    const container = document.createElement('div');
    container.className = 'install-container';
    const installBtn = document.createElement('button');
    installBtn.id = 'install-button';
    const ignoreBtn = document.createElement('button');
    ignoreBtn.id = 'install-ignore';
    container.appendChild(installBtn);
    container.appendChild(ignoreBtn);
    document.body.appendChild(container);

    (mgr as any).showInstallButton();
    expect(container.style.display).toBe('flex');

    // click ignore should persist dismissal
    ignoreBtn.click();
    expect(localStorage.getItem('pwa-install-dismissed')).toBe('1');
    document.body.removeChild(container);
  });

  test('syncOfflineData registers background sync when available', async () => {
    const registration = { sync: { register: jest.fn() } };
    (navigator as any).serviceWorker = { ready: Promise.resolve(registration) };
    // ensure ServiceWorkerRegistration.prototype.sync exists
    (window as any).ServiceWorkerRegistration = function () {} as any;
    (window as any).ServiceWorkerRegistration.prototype.sync = true;

    const mgr = new PWAManager();
    await (mgr as any).syncOfflineData();
    expect(registration.sync.register).toHaveBeenCalledWith('background-sync-journal');
  });

  test('showUpdateAvailableNotification toggles display and auto-hides', () => {
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
  });
});
