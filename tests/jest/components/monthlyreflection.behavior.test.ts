import { jest } from '@jest/globals';
import '../../../src/components/MonthlyReflection/MonthlyReflection';
import { mockIndexedDbService } from '../helpers/testHelpers';

describe('MonthlyReflection behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('loads default month when no data exists', async () => {
    const mod = await import('../../../src/data/IndexedDbDataService');
    const IndexedDbDataService = mod.default;
    const original = IndexedDbDataService.prototype.getMonthlyReview;
    IndexedDbDataService.prototype.getMonthlyReview = jest.fn().mockResolvedValue(null);

    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);

    // allow constructor load to run
    await new Promise((r) => setTimeout(r, 20));

    expect(el.props.month_year).toBeDefined();
    expect(el.props.biggest_growth_moment).toBe('');

    // restore
    IndexedDbDataService.prototype.getMonthlyReview = original;
  });

  test('loads existing monthly review data', async () => {
    const payload = {
      month_year: '2025-11',
      genuine_apologies_given: 2,
      times_paused_before_reacting: 3,
      accountability_partner_feedback_score: 4,
      biggest_growth_moment: 'Won a hard conversation',
      biggest_challenge: 'Time management',
      new_goal_next_month: 'Practice focus',
    };

    const mod = await import('../../../src/data/IndexedDbDataService');
    const IndexedDbDataService = mod.default;
    const original = IndexedDbDataService.prototype.getMonthlyReview;
    IndexedDbDataService.prototype.getMonthlyReview = jest.fn().mockResolvedValue(payload);

    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 20));

    expect(el.props.genuine_apologies_given).toBe('2');
    expect(el.props.biggest_growth_moment).toBe('Won a hard conversation');

    IndexedDbDataService.prototype.getMonthlyReview = original;
  });

  test('successful submit saves and emits', async () => {
    const mod = await import('../../../src/data/IndexedDbDataService');
    const IndexedDbDataService = mod.default;
    const original = IndexedDbDataService.prototype.setMonthlyReview;
    const spy = jest.fn().mockResolvedValue(true);
    IndexedDbDataService.prototype.setMonthlyReview = spy;

    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);

    // populate props to simulate user input
    el.props.genuine_apologies_given = '1';
    el.props.times_paused_before_reacting = '2';
    el.props.accountability_partner_feedback_score = '5';
    el.props.biggest_growth_moment = 'Progress';

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;
    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    const emitted: any[] = [];
    el.addEventListener('submit', (e: any) => emitted.push(e.detail));

    await el.handleSubmit(ev);

    expect(spy).toHaveBeenCalled();
    expect(el.props.successMessage).toMatch(/Monthly reflection saved successfully/);
    expect(emitted.length).toBeGreaterThanOrEqual(1);

    IndexedDbDataService.prototype.setMonthlyReview = original;
  });
});
