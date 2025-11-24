// Minimal Service Worker / navigator.serviceWorker shim for tests
export function setupMockServiceWorker() {
  const originalNavigator = (globalThis as any).navigator;

  const fakeRegistration = { addEventListener: () => {}, scope: '/', installing: undefined, waiting: undefined, active: undefined } as any;

  const fakeSW = {
    register: jestFn(() => Promise.resolve(fakeRegistration)),
  } as any;

  const fakeNavigator = {
    serviceWorker: {
      register: fakeSW.register,
    },
  } as any;

  (globalThis as any).navigator = fakeNavigator;

  return {
    restore: () => {
      (globalThis as any).navigator = originalNavigator;
    },
    registration: fakeRegistration,
  };
}

function jestFn(fn: any) {
  // local simple wrapper instead of importing jest in helpers
  return (...args: any[]) => fn(...args);
}

export default setupMockServiceWorker;
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types */
/*
 * Lightweight mock for navigator.serviceWorker used in Jest tests.
 * It provides a `controller` with a `postMessage` method that accepts a
 * message and an array of transferable ports. The provided `responder`
 * function is called with (type, payload) and should return the IdbResponse
 * (or a Promise thereof). The response is posted back on the provided port
 * as `{ payload: <IdbResponse> }` which matches the shape used by
 * `IndexedDbDataService.postMessage`.
 */

export type IdbResponse<T = unknown> =
  | { success: true; items?: T }
  | { success: false; error: string };

export function installMockServiceWorker(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  responder: (type: string, payload: unknown) => IdbResponse | Promise<IdbResponse>,
) {
  // Provide a lightweight MessageChannel/MessagePort polyfill for jest/node
  if (typeof (global as unknown as Record<string, unknown>).MessageChannel === 'undefined') {
    class FakePort {
      private _onmessage: ((ev: { data: unknown }) => void) | null = null;
      postMessage(data: unknown) {
        // noop when used from the controller side; tests use port.postMessage to send back
        setTimeout(() => {
          if (this._onmessage) this._onmessage({ data });
        }, 0);
      }
      set onmessage(fn: ((ev: { data: unknown }) => void) | null) {
        this._onmessage = fn;
      }
      get onmessage() {
        return this._onmessage;
      }
    }

    // Provide a minimal MessageChannel polyfill for tests. Use Record types to avoid `any`.
    (global as unknown as Record<string, unknown>).MessageChannel = class {
      port1: FakePort;
      port2: FakePort;
      constructor() {
        this.port1 = new FakePort();
        this.port2 = new FakePort();
        // connect ports so postMessage on one triggers onmessage on the other
        this.port1.postMessage = (d: unknown) =>
          setTimeout(() => this.port2['_onmessage']?.({ data: d }), 0);
        this.port2.postMessage = (d: unknown) =>
          setTimeout(() => this.port1['_onmessage']?.({ data: d }), 0);
      }
    } as unknown as { new (): { port1: FakePort; port2: FakePort } };
  }
  // Create a mock ServiceWorker-like object
  const mockSW = {
    postMessage(msg: Record<string, unknown>, transfer?: unknown[]) {
      // the code under test sends a MessagePort as the first transferable
      const port =
        (transfer && (transfer[0] as { postMessage?: (m: unknown) => void })) || undefined;
      if (!port || typeof port.postMessage !== 'function') return;

      // respond asynchronously to simulate real SW
      Promise.resolve()
        .then(async () => {
          try {
            const r = await responder(msg?.type as string, msg?.payload);
            // reply in the shape expected by the consumer: { payload: IdbResponse }
            port.postMessage?.({ payload: r });
          } catch (e) {
            port.postMessage?.({ payload: { success: false, error: String(e) } });
          }
        })
        .catch((e) => port.postMessage?.({ payload: { success: false, error: String(e) } }));
    },
  } as unknown as ServiceWorker;

  // Provide navigator.serviceWorker and a ready promise which resolves to a registration
  const registration = {
    active: mockSW,
    installing: null,
    waiting: null,
  } as unknown as ServiceWorkerRegistration;

  // Install onto global navigator
  const g = global as unknown as Record<string, unknown>;
  const nav =
    (g.navigator as Record<string, unknown>) ||
    ((g.window as Record<string, unknown>)?.navigator as Record<string, unknown> | undefined);
  if (!nav) {
    // In some jest environments navigator exists on global
    (g.navigator as Record<string, unknown>) = {};
  }

  const prev = (g.navigator as Record<string, unknown>)?.serviceWorker;

  (g.navigator as Record<string, unknown>).serviceWorker = {
    controller: mockSW,
    ready: Promise.resolve(registration),
  } as unknown as ServiceWorker;

  return function uninstall() {
    // restore previous value (could be undefined)
    (g.navigator as Record<string, unknown>).serviceWorker = prev as unknown as
      | ServiceWorker
      | undefined;
  };
}
