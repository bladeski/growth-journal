require('../../src/components/Settings/Settings.ts');

describe('Settings.installPwa (js)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.__deferredPwaPrompt;
  });

  test('installPwa uses deferred prompt when available', async () => {
    const Settings = document.createElement('app-settings');
    document.body.appendChild(Settings);

    const deferred = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    window.__deferredPwaPrompt = deferred;

    const comp = Settings;
    // component exposes installPwa on the element instance
    expect(typeof comp.installPwa).toBe('function');
    await comp.installPwa();

    expect(deferred.prompt).toHaveBeenCalled();
  });
});
