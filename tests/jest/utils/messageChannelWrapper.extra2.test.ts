import createMessageChannel from '../../../src/utils/MessageChannelWrapper';

describe('createMessageChannel - extra2', () => {
  test('when global MessageChannel exists, factory returns object with ports that can postMessage', () => {
    const original = (globalThis as any).MessageChannel;
    try {
      // Provide a minimal MessageChannel-like constructor that wires ports
      (globalThis as any).MessageChannel =
        original ||
        class {
          port1: any;
          port2: any;
          constructor() {
            this.port1 = { postMessage: (_: any) => {} };
            this.port2 = { postMessage: (_: any) => {} };
          }
        };

      const ch = createMessageChannel();
      expect(ch).toBeDefined();
      expect(ch).toHaveProperty('port1');
      expect(ch).toHaveProperty('port2');
    } finally {
      (globalThis as any).MessageChannel = original;
    }
  });

  test('fake ports: messages delivered to counterpart and handlers are invoked', (done) => {
    // ensure polyfill path by deleting any global MessageChannel
    const original = (globalThis as any).MessageChannel;
    try {
      delete (globalThis as any).MessageChannel;
      const ch = createMessageChannel();
      const p1 = ch.port1 as any;
      const p2 = ch.port2 as any;

      let seen: any[] = [];
      p2.onmessage = (ev: any) => {
        seen.push(ev.data);
        if (seen.length === 3) {
          expect(seen).toEqual(['a', 'b', { x: 1 }]);
          done();
        }
      };

      // post multiple message types
      p1.postMessage('a');
      p1.postMessage('b');
      p1.postMessage({ x: 1 });
    } finally {
      (globalThis as any).MessageChannel = original;
    }
  });
});
