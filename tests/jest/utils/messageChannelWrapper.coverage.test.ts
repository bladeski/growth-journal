import { jest } from '@jest/globals';
import createMessageChannel, { createMessageChannel as createFn } from '../../../src/utils/MessageChannelWrapper';

describe('createMessageChannel - coverage helpers', () => {
  const original = (globalThis as any).MessageChannel;

  afterEach(() => {
    (globalThis as any).MessageChannel = original;
    jest.restoreAllMocks?.();
  });

  test('polyfill exposes onmessage getter and setter', (done) => {
    // Force polyfill path and restore in finally via local try/finally
    const orig = (globalThis as any).MessageChannel;
    try {
      delete (globalThis as any).MessageChannel;
      const ch = createFn();
      const p1 = ch.port1 as any;
      const p2 = ch.port2 as any;

      // getter should return null initially
      expect(p1.onmessage).toBeNull();

      // setter should store the function and be readable
      const handler = (ev: any) => {
        try {
          expect(ev.data).toBe('ping');
          // reading getter after set should return the function reference
          expect(p1.onmessage).toBe(handler);
          done();
        } catch (e) {
          done(e);
        }
      };

      p1.onmessage = handler;
      // send from the other port
      p2.postMessage('ping');
    } finally {
      (globalThis as any).MessageChannel = orig;
    }
  });

  test('default export is callable and returns ports', () => {
    // ensure default import works and returns ports
    const origMsg = (globalThis as any).MessageChannel;
    try {
      // replace global MessageChannel with a simple constructible stub
      (globalThis as any).MessageChannel =
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
      (globalThis as any).MessageChannel = origMsg;
    }
  });
});
