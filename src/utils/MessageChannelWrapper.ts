/**
 * createMessageChannel
 * Small wrapper factory that returns a MessageChannel in browser environments
 * or a lightweight polyfill when running under Node/Jest. Exported so tests
 * can mock/replace it easily if needed.
 */
export function createMessageChannel(): MessageChannel {
  if (typeof globalThis !== 'undefined' && 'MessageChannel' in globalThis) {
    return new (
      globalThis as typeof globalThis & { MessageChannel: typeof MessageChannel }
    ).MessageChannel();
  }

  // Minimal polyfill for MessageChannel/MessagePort used in tests.
  class FakePort {
    _onmessage: ((ev: { data: unknown }) => void) | null = null;
    postMessage(_data: unknown) {
      // no-op; posting will be wired by the creator
      void _data;
    }
    set onmessage(fn: ((ev: { data: unknown }) => void) | null) {
      this._onmessage = fn;
    }
    get onmessage() {
      return this._onmessage;
    }
  }

  const port1 = new FakePort();
  const port2 = new FakePort();

  // wire ports so postMessage on one triggers onmessage on the other
  (port1 as FakePort & { postMessage: (data: unknown) => void }).postMessage = (d: unknown) =>
    setTimeout(() => port2._onmessage?.({ data: d }), 0);
  (port2 as FakePort & { postMessage: (data: unknown) => void }).postMessage = (d: unknown) =>
    setTimeout(() => port1._onmessage?.({ data: d }), 0);

  return { port1: port1, port2: port2 } as unknown as MessageChannel;
}

export default createMessageChannel;
