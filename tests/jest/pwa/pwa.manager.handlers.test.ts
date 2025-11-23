import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager';

describe('PWAManager handlers', () => {
  let origSW: any;

  beforeEach(() => {
    origSW = (navigator as any).serviceWorker;
    // ensure no persistent flag
    localStorage.removeItem('pwa-install-dismissed');
    // ensure ServiceWorkerRegistration exists in the test environment
    if (!(window as any).ServiceWorkerRegistration) {
      (window as any).ServiceWorkerRegistration = function () {} as any;
      (window as any).ServiceWorkerRegistration.prototype = {};
      (window as any).ServiceWorkerRegistration.prototype.sync = false;
    }
    // ensure navigator.serviceWorker.ready exists to avoid undefined in tests
    if (!(navigator as any).serviceWorker) {
      (navigator as any).serviceWorker = {
        ready: Promise.resolve({}),
        register: jest.fn().mockResolvedValue({}),
      } as any;
    } else {
      if (!(navigator as any).serviceWorker.ready) (navigator as any).serviceWorker.ready = Promise.resolve({});
      if (!(navigator as any).serviceWorker.register) (navigator as any).serviceWorker.register = jest.fn().mockResolvedValue({});
    }
  });

  afterEach(() => {
    (navigator as any).serviceWorker = origSW;
    localStorage.removeItem('pwa-install-dismissed');
    delete (window as any).__deferredPwaPrompt;
    // cleanup mocked ServiceWorkerRegistration
    try {
      delete (window as any).ServiceWorkerRegistration;
    } catch (e) {
      (window as any).ServiceWorkerRegistration = undefined;
    }
  });

  test('registerServiceWorker updatefound -> state installed triggers update notification', async () => {
    // build mocks
    let updatefoundHandler: ((ev?: any) => void) | null = null;
    const installing: any = {
      state: 'installing',
      addEventListener: function (evt: string, cb: () => void) {
        // store statechange cb
        (this as any)._statechange = cb;
      },
    };

    const registration: any = {
      installing,
      addEventListener: (evt: string, cb: (ev?: any) => void) => {
        if (evt === 'updatefound') updatefoundHandler = cb;
      },
    };

    const registerMock = jest.fn().mockResolvedValue(registration);
    (navigator as any).serviceWorker = { register: registerMock };

    const mgr = new PWAManager();
    // spy on update notification
    const spy = jest.spyOn(mgr as any, 'showUpdateAvailableNotification');

    // ensure register called
    await Promise.resolve();
    expect(registerMock).toHaveBeenCalled();

    // trigger updatefound then statechange
    expect(typeof updatefoundHandler).toBe('function');
    // simulate that a controller exists (means previously controlled)
    (navigator as any).serviceWorker.controller = {};
    // call updatefound handler
    updatefoundHandler && updatefoundHandler();
    // simulate worker state change to installed and invoke stored handler
    installing.state = 'installed';
    installing._statechange && installing._statechange();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('online/offline event handlers call updateOnlineStatus and syncOfflineData', () => {
    const mgr = new PWAManager();
    const upd = jest.spyOn(mgr as any, 'updateOnlineStatus');
    const sync = jest.spyOn(mgr as any, 'syncOfflineData');

    // dispatch online
    window.dispatchEvent(new Event('online'));
    expect(upd).toHaveBeenCalled();
    expect(sync).toHaveBeenCalled();

    // dispatch offline
    window.dispatchEvent(new Event('offline'));
    expect(upd).toHaveBeenCalled();

    upd.mockRestore();
    sync.mockRestore();
  });

  test('setupBeforeInstallPrompt sets window var and calls showInstallButton', () => {
    const mgr = new PWAManager();
    const spy = jest.spyOn(mgr as any, 'showInstallButton');

    // create a fake event object carrying userChoice
    const evt: any = new Event('beforeinstallprompt');
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    // dispatch
    window.dispatchEvent(evt);

    expect((window as any).__deferredPwaPrompt).toBe(evt);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
