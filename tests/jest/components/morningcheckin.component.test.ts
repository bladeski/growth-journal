import '../../../src/components/MorningCheckin/MorningCheckin';

describe('MorningCheckin component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('morning-checkin');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
