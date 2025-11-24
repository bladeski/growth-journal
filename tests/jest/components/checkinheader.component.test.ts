import '../../../src/components/CheckinHeader/CheckinHeader';

describe('CheckinHeader component smoke', () => {
  test('registers and exposes expected element', () => {
    const el = document.createElement('checkin-header');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
