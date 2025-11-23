import '../../../src/components/MessageComponent/MessageComponent';

describe('MessageComponent smoke', () => {
  test('registers and attaches', () => {
    const el = document.createElement('message-component');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
