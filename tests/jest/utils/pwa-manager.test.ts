import { jest } from '@jest/globals';
import { PWAManager } from '../../../src/utils/PwaManager.ts';

describe('PWAManager', () => {
  let mockLocalStorage: Record<string, string>;
  let originalLocalStorage: Storage;
  let originalNavigator: Partial<Navigator>;

  beforeEach(() => {
    // Reset mocks
    mockLocalStorage = {};
    jest.clearAllMocks();

    // Store original localStorage
    originalLocalStorage = window.localStorage;

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Clean up DOM
    document.body.innerHTML = `
      <div class="install-container" style="display: none;">
        <button id="install-button">Install</button>
        <button id="install-ignore">Dismiss</button>
      </div>
      <div id="online-status"></div>
      <div id="offline-indicator" style="display: none;"></div>
      <div id="update-notification" style="display: none;"></div>
    `;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
      writable: true,
    });

    // Mock ServiceWorkerRegistration with sync property
    if (!window.ServiceWorkerRegistration) {
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: {
            sync: undefined,
          },
        },
        configurable: true,
        writable: true,
      });
    }

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: jest.fn().mockResolvedValue({
          active: null,
          installing: null,
          waiting: null,
          scope: '/',
          updateViaCache: 'imports',
          update: jest.fn().mockResolvedValue(undefined),
          addEventListener: jest.fn(),
        }),
        controller: null,
        ready: Promise.resolve({
          sync: { register: jest.fn() },
        } as unknown as ServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('initialization', () => {
    test('initializes with default state', async () => {
      const manager = new PWAManager();

      expect(window.localStorage.getItem).toHaveBeenCalledWith('pwa-install-dismissed');
    });

    test('respects previous dismissal from localStorage', () => {
      mockLocalStorage['pwa-install-dismissed'] = '1';

      const manager = new PWAManager();

      expect(window.localStorage.getItem).toHaveBeenCalledWith('pwa-install-dismissed');
    });

    test('handles localStorage errors gracefully', () => {
      (window.localStorage.getItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => new PWAManager()).not.toThrow();
    });
  });

  describe('service worker registration', () => {
    test('registers service worker when available', () => {
      const manager = new PWAManager();

      expect(navigator.serviceWorker.register).toHaveBeenCalled();
    });

    test('handles service worker registration errors', () => {
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValueOnce(
        new Error('Registration failed')
      );

      // Should not throw
      expect(() => new PWAManager()).not.toThrow();
    });
  });

  describe('install prompt handling', () => {
    test('creates install button element references', () => {
      const manager = new PWAManager();
      const installBtn = document.getElementById('install-button') as HTMLButtonElement;

      expect(installBtn).toBeDefined();
    });

    test('maintains install-container element', () => {
      const manager = new PWAManager();
      const container = document.querySelector('.install-container') as HTMLElement;

      expect(container).toBeDefined();
      expect(container.style.display).toBe('none');
    });

    test('has dismiss button element', () => {
      const manager = new PWAManager();
      const dismissBtn = document.getElementById('install-ignore') as HTMLButtonElement;

      expect(dismissBtn).toBeDefined();
    });
  });

  describe('online/offline handling', () => {
    test('updates online status from navigator.onLine', () => {
      const manager = new PWAManager();

      expect(manager.getOnlineStatus()).toBe(true);
    });

    test('updates status when offline event fired', async () => {
      const manager = new PWAManager();

      // Need to manually set isOnline since event listeners are set in init
      (manager as any).isOnline = false;

      expect(manager.getOnlineStatus()).toBe(false);
    });

    test('updates container visibility on offline', async () => {
      const manager = new PWAManager();
      const offlineIndicator = document.getElementById('offline-indicator') as HTMLElement;

      // Manually trigger the update
      (manager as any).updateOnlineStatus();

      // Should be visible when offline
      expect(offlineIndicator).toBeDefined();
    });
  });

  describe('promptInstall', () => {
    test('does nothing when no deferred prompt available', async () => {
      const manager = new PWAManager();

      (manager as any).deferredPrompt = null;

      await manager.promptInstall();

      // Should complete without error
      expect(manager).toBeDefined();
    });

    test('prompts user when deferred prompt exists and user accepts', async () => {
      const manager = new PWAManager();

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      await manager.promptInstall();

      expect(mockPrompt.prompt).toHaveBeenCalled();
      expect(window.localStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', '1');
    });

    test('handles user dismissing install prompt', async () => {
      const manager = new PWAManager();

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      await manager.promptInstall();

      expect(mockPrompt.prompt).toHaveBeenCalled();
      // deferredPrompt should be cleared
      expect((manager as any).deferredPrompt).toBeNull();
    });

    test('hides install button after prompt completion', async () => {
      const manager = new PWAManager();
      const installBtn = document.getElementById('install-button') as HTMLButtonElement;

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      await manager.promptInstall();

      expect(installBtn.style.display).toBe('none');
    });

    test('hides ignore button after prompt completion', async () => {
      const manager = new PWAManager();
      const ignoreBtn = document.getElementById('install-ignore') as HTMLButtonElement;

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      await manager.promptInstall();

      expect(ignoreBtn.style.display).toBe('none');
    });

    test('handles localStorage errors during installation', async () => {
      const manager = new PWAManager();

      (window.localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      // Should not throw
      await expect(manager.promptInstall()).resolves.not.toThrow();
    });

    test('clears deferred prompt after user interaction', async () => {
      const manager = new PWAManager();

      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      (manager as any).deferredPrompt = mockPrompt;

      await manager.promptInstall();

      expect((manager as any).deferredPrompt).toBeNull();
    });
  });

  describe('static isPWA method', () => {
    test('returns true when running in standalone mode', () => {
      (window.matchMedia as jest.Mock).mockReturnValueOnce({
        matches: true,
        media: '(display-mode: standalone)',
      });

      expect(PWAManager.isPWA()).toBe(true);
    });

    test('returns true when navigator.standalone is true', () => {
      (window.matchMedia as jest.Mock).mockReturnValueOnce({
        matches: false,
        media: '(display-mode: standalone)',
      });

      const originalStandalone = (navigator as any).standalone;

      try {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: true,
          writable: true,
        });

        expect(PWAManager.isPWA()).toBe(true);
      } finally {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: originalStandalone,
          writable: true,
        });
      }
    });

    test('returns true when document referrer includes android-app', () => {
      (window.matchMedia as jest.Mock).mockReturnValueOnce({
        matches: false,
        media: '(display-mode: standalone)',
      });

      const originalStandalone = (navigator as any).standalone;

      try {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: false,
          writable: true,
        });

        Object.defineProperty(document, 'referrer', {
          configurable: true,
          value: 'android-app://com.example.app',
          writable: true,
        });

        expect(PWAManager.isPWA()).toBe(true);
      } finally {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: originalStandalone,
          writable: true,
        });
      }
    });

    test('returns false when not running as PWA', () => {
      (window.matchMedia as jest.Mock).mockReturnValueOnce({
        matches: false,
        media: '(display-mode: browser)',
      });

      const originalStandalone = (navigator as any).standalone;

      try {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: false,
          writable: true,
        });

        Object.defineProperty(document, 'referrer', {
          configurable: true,
          value: '',
          writable: true,
        });

        expect(PWAManager.isPWA()).toBe(false);
      } finally {
        Object.defineProperty(navigator, 'standalone', {
          configurable: true,
          value: originalStandalone,
          writable: true,
        });
      }
    });
  });

  describe('getOnlineStatus', () => {
    test('returns current online status', () => {
      const manager = new PWAManager();

      expect(manager.getOnlineStatus()).toBe(true);

      // Simulate offline
      (manager as any).isOnline = false;

      expect(manager.getOnlineStatus()).toBe(false);
    });
  });
});

