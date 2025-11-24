import '../../../src/components/Card/Card';

describe('Card component smoke', () => {
  test('registers and creates shadowRoot', () => {
    const el = document.createElement('card-component');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
