import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';
import '../../src/components/Settings/Settings.ts';

// ensure TextEncoder/TextDecoder are available in the Jest JSDOM environment
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
// @ts-ignore
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

describe('Settings.installPwa', () => {
  let settingsEl: HTMLElement | null = null;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    settingsEl = document.createElement('app-settings');
    document.body.appendChild(settingsEl);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // cleanup any global helper
    // @ts-ignore
    delete window.__deferredPwaPrompt;
  });

  test('installPwa uses deferred prompt when available', async () => {
    const deferred = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    } as unknown as BeforeInstallPromptEvent;

    // attach test deferred prompt helper
    // @ts-ignore
    window.__deferredPwaPrompt = deferred;

    const comp = settingsEl as unknown as { installPwa?: () => Promise<void> };
    expect(typeof comp.installPwa).toBe('function');
    if (comp.installPwa) await comp.installPwa();

    expect(deferred.prompt).toHaveBeenCalled();
  });
});
