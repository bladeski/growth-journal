/*
 * Lightweight mock for navigator.serviceWorker used in Jest tests.
 * It provides a `controller` with a `postMessage` method that accepts a
 * message and an array of transferable ports. The provided `responder`
 * function is called with (type, payload) and should return the IdbResponse
 * (or a Promise thereof). The response is posted back on the provided port
 * as `{ payload: <IdbResponse> }` which matches the shape used by
 * `IndexedDbDataService.postMessage`.
 */

export type IdbResponse<T = unknown> = { success: true; items?: T } | { success: false; error: string };

export function installMockServiceWorker(
  responder: (type: string, payload: unknown) => IdbResponse | Promise<IdbResponse>,
) {
  // Provide a lightweight MessageChannel/MessagePort polyfill for jest/node
  if (typeof (global as any).MessageChannel === 'undefined') {
    class FakePort {
      private _onmessage: ((ev: { data: unknown }) => void) | null = null;
      postMessage(data: unknown) {
        // noop when used from the controller side; tests use port.postMessage to send back
        setTimeout(() => {
          if (this._onmessage) this._onmessage({ data });
        }, 0);
      }
      set onmessage(fn: (ev: { data: unknown }) => void) {
        this._onmessage = fn;
      }
      get onmessage() {
        return this._onmessage;
      }
    }

    (global as any).MessageChannel = class {
      port1: any;
      port2: any;
      constructor() {
        this.port1 = new FakePort();
        this.port2 = new FakePort();
        // connect ports so postMessage on one triggers onmessage on the other
        this.port1.postMessage = (d: unknown) => setTimeout(() => this.port2._onmessage?.({ data: d }), 0);
        this.port2.postMessage = (d: unknown) => setTimeout(() => this.port1._onmessage?.({ data: d }), 0);
      }
    } as any;
  }
  // Create a mock ServiceWorker-like object
  const mockSW = {
    postMessage(msg: any, transfer?: any[]) {
      // the code under test sends a MessagePort as the first transferable
      const port = transfer && transfer[0];
      if (!port || typeof port.postMessage !== 'function') return;

      // respond asynchronously to simulate real SW
      Promise.resolve()
        .then(async () => {
          try {
            const r = await responder(msg?.type, msg?.payload);
            // reply in the shape expected by the consumer: { payload: IdbResponse }
            port.postMessage({ payload: r });
          } catch (e: any) {
            port.postMessage({ payload: { success: false, error: String(e) } });
          }
        })
        .catch((e) => port.postMessage({ payload: { success: false, error: String(e) } }));
    },
  } as unknown as ServiceWorker;

  // Provide navigator.serviceWorker and a ready promise which resolves to a registration
  const registration = { active: mockSW, installing: null, waiting: null } as unknown as ServiceWorkerRegistration;

  // Install onto global navigator
  const nav = (global as any).navigator || (global as any).window?.navigator;
  if (!nav) {
    // In some jest environments navigator exists on global
    (global as any).navigator = {};
  }

  const prev = (global as any).navigator.serviceWorker;

  (global as any).navigator.serviceWorker = {
    controller: mockSW,
    ready: Promise.resolve(registration),
  } as any;

  return function uninstall() {
    // restore previous value (could be undefined)
    (global as any).navigator.serviceWorker = prev;
  };
}
