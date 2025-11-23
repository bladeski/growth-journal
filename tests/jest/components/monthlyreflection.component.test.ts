import '../../../src/components/MonthlyReflection/MonthlyReflection';

describe('MonthlyReflection component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('monthly-reflection');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
