/**
 * PWA-specific type definitions
 */

// Extend the ServiceWorkerRegistration interface to include sync
declare global {
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  interface ServiceWorkerGlobalScope {
    addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void;
  }

  interface SyncEvent extends ExtendableEvent {
    tag: string;
    lastChance: boolean;
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export {};
