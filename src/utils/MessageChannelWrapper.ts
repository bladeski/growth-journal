/**
 * createMessageChannel
 * Small wrapper factory that returns a MessageChannel in browser environments
 * or a lightweight polyfill when running under Node/Jest. Exported so tests
 * can mock/replace it easily if needed.
 */
export function createMessageChannel(): MessageChannel {
  if (typeof (globalThis as any).MessageChannel !== 'undefined') {
    return new (globalThis as any).MessageChannel();
  }

  // Minimal polyfill for MessageChannel/MessagePort used in tests.
  class FakePort {
    _onmessage: ((ev: { data: unknown }) => void) | null = null;
    postMessage(_data: unknown) {
      // no-op; posting will be wired by the creator
    }
    set onmessage(fn: ((ev: { data: unknown }) => void) | null) {
      this._onmessage = fn;
    }
    get onmessage() {
      return this._onmessage as any;
    }
  }

  const port1 = new FakePort();
  const port2 = new FakePort();

  // wire ports so postMessage on one triggers onmessage on the other
  (port1 as any).postMessage = (d: unknown) => setTimeout(() => port2._onmessage?.({ data: d }), 0);
  (port2 as any).postMessage = (d: unknown) => setTimeout(() => port1._onmessage?.({ data: d }), 0);

  return { port1: port1 as any, port2: port2 as any } as unknown as MessageChannel;
}

export default createMessageChannel;
