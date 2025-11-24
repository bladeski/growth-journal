import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./Settings.pug';
import styles from 'bundle-text:./Settings.css';
import IndexedDbDataService from '../../data/IndexedDbDataService.ts';
import { CheckinHeader } from '../CheckinHeader/CheckinHeader.ts';
import { PWAManager } from '../../utils/PwaManager.ts';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();
import { IGrowthJournalWindow } from '../../interfaces/IGrowthJournalWindow.ts';

const THEME_KEY = 'gj_theme_preference';

const GrowthJournalWindow = window as IGrowthJournalWindow;

export class SettingsComponent extends BaseComponent {
  constructor() {
    super(() => template, {}, [styles]);
  }

  changeTheme(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    localStorage.setItem(THEME_KEY, v);
    this.applyThemePref(v);
    this.showMessage('Theme preference saved');
  }
  private applyThemePref(pref: string): void {
    const root = document.documentElement;
    if (pref === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && mq.matches) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
    } else if (pref === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  protected async onMount(): Promise<void> {
    // configure the shared checkin-header for consistent appearance
    const header = this.shadowRoot?.querySelector('#settings-header') as CheckinHeader;
    if (header && typeof header.updateHeader === 'function') {
      header.updateHeader({
        title: 'Settings',
        description: 'App settings and data management',
        coreValue: '',
        intention: '',
      });

      header.addEventListener('cancel', () => {
        // Signal the app to navigate back so routing and history stay consistent
        document.dispatchEvent(new CustomEvent('navigate-back'));
      });
    }

    // wire file input filename display
    const fileInput = this.shadowRoot?.querySelector('#import-file') as HTMLInputElement | null;
    const fileNameSpan = this.shadowRoot?.querySelector('#import-file-name') as HTMLElement | null;
    if (fileInput && fileNameSpan) {
      fileInput.addEventListener('change', () => {
        const f =
          fileInput.files && fileInput.files.length > 0
            ? fileInput.files[0].name
            : 'No file chosen';
        fileNameSpan.textContent = f;
      });
    }

    // update install button state if PWA prompt available
    const installBtn = this.shadowRoot?.querySelector('#install-pwa') as HTMLButtonElement | null;
    const installStatus = this.shadowRoot?.querySelector('#install-status') as HTMLElement | null;
    if (installBtn) {
      const deferred = GrowthJournalWindow.__deferredPwaPrompt;
      if (deferred) {
        installStatus && (installStatus.textContent = 'Install available');
        installBtn.addEventListener('click', async () => {
          try {
            deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === 'accepted')
              installStatus && (installStatus.textContent = 'Installed');
            else installStatus && (installStatus.textContent = 'Dismissed');
          } catch (e) {
            installStatus && (installStatus.textContent = 'Install failed');
          }
        });
      } else {
        // Try to reuse the global install button in the page (#install-button) which PWAManager sets up
        const globalInstall = document.getElementById('install-button') as HTMLButtonElement | null;

        if (globalInstall) {
          if (PWAManager.isPWA()) {
            installStatus && (installStatus.textContent = 'Already installed');
            installBtn.disabled = true;
          } else {
            installBtn.addEventListener('click', () => globalInstall.click());
            installStatus && (installStatus.textContent = 'Open system installer');
          }
        } else {
          installStatus && (installStatus.textContent = 'Install not available');
          installBtn.disabled = true;
        }
      }
    }

    // Theme selection: system / light / dark
    const themeSelect = this.shadowRoot?.querySelector('#theme-select') as HTMLSelectElement | null;

    const onSystemChange = () => {
      const pref = localStorage.getItem(THEME_KEY) || 'system';
      if (pref === 'system') this.applyThemePref('system');
    };

    if (themeSelect) {
      // set initial value. Prefer the pre-hydration window variable if present so
      // the select reflects the same preference used by the inline script.
      const winPref = (window as IGrowthJournalWindow).__gj_theme_pref as string | undefined;
      const pref =
        winPref !== undefined && winPref !== null
          ? winPref
          : localStorage.getItem(THEME_KEY) || 'system';
      themeSelect.value = pref;
      this.applyThemePref(pref);

      // Listen to system preference changes when system mode selected
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && typeof mq.addEventListener === 'function') {
          mq.addEventListener('change', onSystemChange as EventListener);
        } else if (mq && typeof mq.addListener === 'function') {
          mq.addListener(onSystemChange);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    // schedule onMount on next tick to ensure shadow DOM is rendered
    window.setTimeout(() => {
      // call but ignore returned promise
      try {
        this.onMount();
      } catch (e) {
        // ignore
      }
    }, 0);
  }

  exportDb(): void {
    // uses global helper exposed by IndexedDbDataService
    try {
      GrowthJournalWindow.exportGrowthDb?.();
      this.showMessage('Export started (download should begin shortly)');
    } catch (e) {
      this.showMessage('Export failed');
    }
  }

  async importDb(): Promise<void> {
    const input = this.shadowRoot?.querySelector('#import-file') as HTMLInputElement | null;
    if (!input || !input.files || input.files.length === 0) {
      this.showMessage('Please choose a JSON file to import');
      return;
    }
    const file = input.files[0];
    try {
      await GrowthJournalWindow.importGrowthDb?.(file);
      this.showMessage('Import completed');
    } catch (e) {
      logger.error('Import failed', { error: e });
      this.showMessage('Import failed');
    }
  }

  async clearDb(): Promise<void> {
    if (!confirm('Are you sure you want to clear all journal data? This cannot be undone.')) return;
    try {
      const svc = new IndexedDbDataService();
      // import empty arrays to each store
      const payload = {
        intentions: [],
        morning: [],
        midday: [],
        evening: [],
        weekly: [],
        monthly: [],
      } as Record<string, unknown[]>;
      const ok = await svc.importDatabase(payload);
      if (ok) this.showMessage('All data cleared');
      else this.showMessage('Failed to clear data');
    } catch (e) {
      logger.error('Failed to clear data', { error: e });
      this.showMessage('Failed to clear data');
    }
  }

  async clearCache(): Promise<void> {
    if (!('caches' in window)) {
      this.showMessage('Cache API not available');
      return;
    }
    try {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
      this.showMessage('Cache cleared');
    } catch (e) {
      logger.error('Failed to clear cache', { error: e });
      this.showMessage('Failed to clear cache');
    }
  }

  async installPwa(): Promise<void> {
    const installStatus = this.shadowRoot?.querySelector('#install-status') as HTMLElement | null;
    const installBtn = this.shadowRoot?.querySelector('#install-pwa') as HTMLButtonElement | null;

    try {
      const deferred = GrowthJournalWindow.__deferredPwaPrompt;
      if (deferred) {
        installStatus && (installStatus.textContent = 'Prompting...');
        try {
          deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === 'accepted') {
            installStatus && (installStatus.textContent = 'Installed');
            if (installBtn) installBtn.disabled = true;
          } else {
            installStatus && (installStatus.textContent = 'Dismissed');
          }
        } catch (e) {
          installStatus && (installStatus.textContent = 'Install failed');
        }
        return;
      }

      // fallback: click the global install button created by PWAManager
      const globalInstall = document.getElementById('install-button') as HTMLButtonElement | null;
      if (globalInstall) {
        // If app is already installed, reflect that
        if (PWAManager.isPWA()) {
          installStatus && (installStatus.textContent = 'Already installed');
          if (installBtn) installBtn.disabled = true;
          return;
        }
        installStatus && (installStatus.textContent = 'Opening installer');
        globalInstall.click();
        return;
      }

      installStatus && (installStatus.textContent = 'Install not available');
      if (installBtn) installBtn.disabled = true;
    } catch (err) {
      logger.error('installPwa error', { error: err });
      installStatus && (installStatus.textContent = 'Install failed');
    }
  }

  private showMessage(msg: string): void {
    const el = this.shadowRoot?.querySelector('#settings-message') as HTMLElement | null;
    if (el) el.textContent = msg;
  }

  public render(): void {
    super.render();
  }
}

customElements.define('app-settings', SettingsComponent);
