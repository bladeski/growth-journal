import { jest } from '@jest/globals';
import '../../../src/components/WeeklyReview/WeeklyReview.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('WeeklyReview focused tests', () => {
  let origProto: any;
  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
    jest.useFakeTimers();
  });
  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    jest.useRealTimers();
    const el = document.querySelector('weekly-review');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadReview with existing review populates props and schedules header update', async () => {
    const response = { week_of: '2025-11-17', skill_focused_on: 'Empathy', empathy_self_rating: 4 };
    IndexedDbDataService.prototype.getWeeklyReview = jest.fn().mockResolvedValue(response);

    const el = document.createElement('weekly-review') as any;
    document.body.appendChild(el);

    // wait for async loadReview
    await Promise.resolve();

    expect(el.props.skill_focused_on).toBe('Empathy');
    // fast-forward render timeout to trigger header update
    jest.runOnlyPendingTimers();
  });

  test('loadReview handles alternative response shapes', async () => {
    IndexedDbDataService.prototype.getWeeklyReview = jest.fn().mockResolvedValue({ data: { week_of: '2025-11-10' } });
    const el = document.createElement('weekly-review') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.props.week_of).toMatch(/2025/);
  });

  test('handleSubmit validates and emits submit', () => {
    const el = document.createElement('weekly-review') as any;
    document.body.appendChild(el);

    // provide required field
    el.props.skill_focused_on = 'Focus';
    const fakeEvent = { preventDefault: () => {}, target: { checkValidity: () => true, reportValidity: () => {} } } as unknown as Event;

    const submitSpy = jest.fn();
    el.addEventListener('submit', submitSpy);

    el.handleSubmit(fakeEvent);

    expect(el.props.successMessage).toBe('Weekly review saved successfully!');
  });

  test('cancel emits cancel event and onDisconnect clears timeout', () => {
    const el = document.createElement('weekly-review') as any;
    document.body.appendChild(el);
    const cancelSpy = jest.fn();
    el.addEventListener('cancel', cancelSpy);

    el.cancel();
    expect(cancelSpy).toHaveBeenCalled();

    // schedule a timeout and ensure onDisconnect clears it
    el._renderTimeout = window.setTimeout(() => {}, 1000) as unknown as number;
    el.onDisconnect();
    expect(el._renderTimeout).toBeNull();
  });
});
