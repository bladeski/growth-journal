import '../../../src/components/PersonalGrowth/PersonalGrowth';

describe('PersonalGrowth component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('personal-growth');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
