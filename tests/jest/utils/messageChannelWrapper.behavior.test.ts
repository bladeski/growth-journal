import createMessageChannel from '../../../src/utils/MessageChannelWrapper';

describe('createMessageChannel (behavior)', () => {
  test('polyfill wiring: postMessage triggers onmessage on other port', (done) => {
    const ch = createMessageChannel();
    const p1 = ch.port1 as any;
    const p2 = ch.port2 as any;

    p2.onmessage = (ev: any) => {
      try {
        expect(ev.data).toEqual({ type: 'hello' });
        done();
      } catch (err) {
        done(err);
      }
    };

    p1.postMessage({ type: 'hello' });
  });

  test('ports expose postMessage functions', () => {
    const ch = createMessageChannel();
    expect(typeof (ch.port1 as any).postMessage).toBe('function');
    expect(typeof (ch.port2 as any).postMessage).toBe('function');
  });
});