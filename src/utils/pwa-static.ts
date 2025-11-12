/**
 * Minimal, pure helper to detect PWA display mode. Kept separate from the full PWAManager
 * to allow unit-testing without importing runtime-only APIs or code that uses import.meta.
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
    document.referrer.includes('android-app://')
  );
}
