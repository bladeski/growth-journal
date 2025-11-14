export {};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' | string }>;
  }

  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent;
  }
}
