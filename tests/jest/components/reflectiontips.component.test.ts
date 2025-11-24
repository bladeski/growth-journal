import '../../../src/components/ReflectionTips/ReflectionTips';

describe('ReflectionTips component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('reflection-tips');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
