/**
 * PWA utilities for Growth Journal
 * Handles service worker registration, installation prompts, and offline functionality
 */

export class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.init();
  }

  private init(): void {
    // Respect user's previous dismissal choice for the install prompt
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed === '1') {
        // leave install container hidden; PWAManager will not show it
      }
    } catch (e) {
      // ignore storage errors
    }
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupOnlineOfflineHandlers();
    this.setupBeforeInstallPrompt();
  }

  /**
   * Register service worker for offline functionality
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        // Use Parcel's bundling to produce a proper JS worker file in dev and prod.
        // new URL(..., import.meta.url) lets the bundler provide the correct served URL
        // for the worker source (src/sw.ts). Register as a module so TS/ESM code works.
        const swUrl = new URL('../sw.ts', import.meta.url);
        const registration = await navigator.serviceWorker.register(swUrl.toString(), {
          type: 'module',
        });
        console.log('Service Worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailableNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupBeforeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWAManager: beforeinstallprompt fired');
      // Prevent the automatic prompt so we can show it on a user gesture
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
      // Helpful debug: expose on window for quick manual invocation in console
      // expose on window for quick manual invocation in console (typed safely)
      interface DeferredWindow extends Window {
        __deferredPwaPrompt?: BeforeInstallPromptEvent;
      }
      (window as DeferredWindow).__deferredPwaPrompt = e;
    });
  }

  /**
   * Show install button when PWA can be installed
   */
  private showInstallButton(): void {
    const container = document.querySelector('.install-container') as HTMLElement | null;
    if (!container) return;
    console.log('PWAManager: showing install container');
    container.style.display = 'flex';

    const installBtn = document.getElementById('install-button');
    if (installBtn) {
      installBtn.setAttribute('role', 'button');
      installBtn.tabIndex = 0;
      const boundPrompt = this.promptInstall.bind(this);
      installBtn.addEventListener('click', boundPrompt);
      installBtn.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          boundPrompt();
        }
      });
    }

    const ignoreBtn = document.getElementById('install-ignore');
    if (ignoreBtn) {
      ignoreBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        container.classList.add('dismissed');
        container.style.display = 'none';
        // Optionally persist dismissal to localStorage
        try {
          localStorage.setItem('pwa-install-dismissed', '1');
        } catch (e) {
          // ignore storage errors
        }
      });
    }
  }

  /**
   * Prompt user to install PWA
   */
  public async promptInstall(): Promise<void> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      this.deferredPrompt = null;
      const installBtn = document.getElementById('install-button');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
    }
  }

  /**
   * Setup online/offline status handlers
   */
  private setupOnlineOfflineHandlers(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateOnlineStatus();
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateOnlineStatus();
    });
  }

  /**
   * Setup install prompt for mobile devices
   */
  private setupInstallPrompt(): void {
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      // Hide install button or show success message
      const installBtn = document.getElementById('install-button');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
    });
  }

  /**
   * Update UI based on online/offline status
   */
  private updateOnlineStatus(): void {
    const statusIndicator = document.getElementById('online-status');
    if (statusIndicator) {
      statusIndicator.textContent = this.isOnline ? 'Online' : 'Offline';
      statusIndicator.className = this.isOnline ? 'status-online' : 'status-offline';
    }

    // Show/hide offline indicator
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.style.display = this.isOnline ? 'none' : 'block';
    }
  }

  /**
   * Sync offline data when back online
   */
  private async syncOfflineData(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync) {
        await registration.sync.register('background-sync-journal');
      }
    }
  }

  /**
   * Show notification when app update is available
   */
  private showUpdateAvailableNotification(): void {
    // You can implement a custom notification here
    const updateNotification = document.getElementById('update-notification');
    if (updateNotification) {
      updateNotification.style.display = 'block';
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (updateNotification) {
        updateNotification.style.display = 'none';
      }
    }, 5000);
  }

  /**
   * Check if app is running as PWA
   */
  public static isPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Get online status
   */
  public getOnlineStatus(): boolean {
    return this.isOnline;
  }
}
