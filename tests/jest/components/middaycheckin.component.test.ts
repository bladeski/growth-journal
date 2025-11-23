import '../../../src/components/MiddayCheckin/MiddayCheckin';

describe('MiddayCheckin component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('midday-checkin');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
