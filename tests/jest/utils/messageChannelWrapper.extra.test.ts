import createMessageChannel from '../../../src/utils/MessageChannelWrapper';

describe('createMessageChannel - extra', () => {
  test('returns real MessageChannel when global exists', () => {
    // Ensure global MessageChannel exists (JSDOM provides it)
    const original = (globalThis as any).MessageChannel;
    try {
      // Provide a minimal MessageChannel-like constructor when missing
      (globalThis as any).MessageChannel =
        original ||
        class {
          port1: any = { postMessage() {} };
          port2: any = { postMessage() {} };
          constructor() {
            this.port1 = this.port1;
            this.port2 = this.port2;
          }
        };
      const ch = createMessageChannel();
      expect(ch).toHaveProperty('port1');
      expect(ch).toHaveProperty('port2');
    } finally {
      (globalThis as any).MessageChannel = original;
    }
  });

  test('fake ports are wired and can be used multiple times', (done) => {
    // simulate absence of MessageChannel so polyfill path is used
    const original = (globalThis as any).MessageChannel;
    try {
      delete (globalThis as any).MessageChannel;
      const ch = createMessageChannel();
      const p1 = ch.port1 as any;
      const p2 = ch.port2 as any;

      let count = 0;
      p2.onmessage = (ev: any) => {
        count += 1;
        if (count === 2) done();
      };

      p1.postMessage('one');
      p1.postMessage('two');
    } finally {
      (globalThis as any).MessageChannel = original;
    }
  });
});
