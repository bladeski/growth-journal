import '../../../src/components/WeeklyReview/WeeklyReview';

describe('WeeklyReview component smoke', () => {
  test('registers and instantiates', () => {
    const el = document.createElement('weekly-review');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeTruthy();
    el.remove();
  });
});
