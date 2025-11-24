import '../../../src/components/EveningCheckin/EveningCheckin';

describe('EveningCheckin component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('evening-checkin');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
