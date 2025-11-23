import '../../../src/components/Dashboard/Dashboard';

describe('Dashboard component smoke', () => {
  test('registers and creates element', () => {
    const el = document.createElement('growth-dashboard');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
