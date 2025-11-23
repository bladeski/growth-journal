import { createMessageChannel } from '../../src/utils/MessageChannelWrapper';
import { QuestionsDataParser } from '../../src/utils/QuestionsDataParser';
import { PWAManager } from '../../src/utils/PwaManager';

describe('utils: MessageChannelWrapper', () => {
  test('polyfill ports can postMessage and receive', (done) => {
    // Force environment without native MessageChannel by shadowing global
    const original = (globalThis as any).MessageChannel;
    delete (globalThis as any).MessageChannel;
    const ch = createMessageChannel();
    ch.port1.onmessage = (ev: any) => {
      expect(ev.data).toBe('ping');
      // restore
      if (original) (globalThis as any).MessageChannel = original;
      done();
    };
    ch.port2.postMessage('ping');
  });
});

describe('utils: QuestionsDataParser', () => {
  test('parse known keys top-level', () => {
    const src = { what_went_well: 'good', intention: 'do more' };
    const parsed = QuestionsDataParser.parse(src);
    expect(parsed.what_went_well).toBe('good');
    expect(parsed.intention).toBe('do more');
  });

  test('parse nested questions object and arrays', () => {
    const src = { questions: { a: '1', questions: { b: '2' } } };
    const parsed = QuestionsDataParser.parse(src);
    expect(parsed.a).toBe('1');
    expect(parsed.b).toBe('2');

    const arr = { data: [{ key: 'x', question: 'q' }] };
    const parsedArr = QuestionsDataParser.parse(arr);
    expect(parsedArr.x).toBe('q');
  });

  test('get and getMultiple return defaults', () => {
    const src = { data: { foo: 'bar' } };
    expect(QuestionsDataParser.get(src, 'foo')).toBe('bar');
    expect(QuestionsDataParser.get(src, 'missing', 'def')).toBe('def');
    const multi = QuestionsDataParser.getMultiple(src, ['foo', 'missing'], { missing: 'md' });
    expect(multi.foo).toBe('bar');
    expect(multi.missing).toBe('md');
  });
});

describe('utils: PWAManager', () => {
  test('isPWA checks display-mode and referrer', () => {
    // mock matchMedia
    (window as any).matchMedia = (q: string) => ({ matches: q.includes('standalone') });
    const origRef = document.referrer;
    Object.defineProperty(document, 'referrer', { value: 'android-app://something', configurable: true });
    expect(PWAManager.isPWA()).toBe(true);
    // restore
    Object.defineProperty(document, 'referrer', { value: origRef, configurable: true });
  });
});
