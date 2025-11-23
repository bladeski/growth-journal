import { jest } from '@jest/globals';
import createMessageChannel, { createMessageChannel as createFn } from '../../../src/utils/MessageChannelWrapper';

describe('createMessageChannel', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('returns real MessageChannel when available', () => {
    // ensure global MessageChannel exists in test environment
    const ch = createFn();
    expect(ch).toHaveProperty('port1');
    expect(ch).toHaveProperty('port2');
  });

  test('polyfill wiring: postMessage triggers onmessage on other port', (done) => {
    // simulate absence of global MessageChannel
    const original = (globalThis as any).MessageChannel;
    try {
      // temporarily remove MessageChannel
      // @ts-ignore
      delete (globalThis as any).MessageChannel;

      const ch = createFn();
      const p1 = ch.port1 as any;
      const p2 = ch.port2 as any;

      p2.onmessage = (ev: any) => {
        try {
          expect(ev.data).toBe('ping');
          done();
        } catch (e) {
          done(e);
        }
      };

      p1.postMessage('ping');
    } finally {
      (globalThis as any).MessageChannel = original;
    }
  });
});
