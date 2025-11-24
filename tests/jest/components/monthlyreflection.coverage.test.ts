import { jest } from '@jest/globals';
import '../../../src/components/MonthlyReflection/MonthlyReflection.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('MonthlyReflection focused tests', () => {
  let origProto: any;
  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
    jest.useFakeTimers();
  });
  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    jest.useRealTimers();
    const el = document.querySelector('monthly-reflection');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadReflection populates when data exists', async () => {
    const response = { month_year: '2025-11', genuine_apologies_given: 2, biggest_growth_moment: 'Small wins' };
    IndexedDbDataService.prototype.getMonthlyReview = jest.fn().mockResolvedValue(response);

    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);

    await Promise.resolve();

    expect(el.props.genuine_apologies_given).toBe('2');
    jest.runOnlyPendingTimers();
  });

  test('loadReflection sets default month when no data', async () => {
    IndexedDbDataService.prototype.getMonthlyReview = jest.fn().mockResolvedValue(null);
    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.props.month_year).toMatch(/\d{4}-\d{2}/);
  });

  test('handleSubmit saves and emits submit event when successful', async () => {
    IndexedDbDataService.prototype.setMonthlyReview = jest.fn().mockResolvedValue(true);
    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);

    const fakeEvent = { preventDefault: () => {}, target: { checkValidity: () => true, reportValidity: () => {} } } as unknown as Event;

    const submitSpy = jest.fn();
    el.addEventListener('submit', submitSpy);

    await el.handleSubmit(fakeEvent);

    expect(IndexedDbDataService.prototype.setMonthlyReview).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
  });

  test('cancel emits cancel and onDisconnect clears timeout', () => {
    const el = document.createElement('monthly-reflection') as any;
    document.body.appendChild(el);
    const cancelSpy = jest.fn();
    el.addEventListener('cancel', cancelSpy);

    el.cancel();
    expect(cancelSpy).toHaveBeenCalled();

    el._renderTimeout = window.setTimeout(() => {}, 500) as unknown as number;
    el.onDisconnect();
    expect(el._renderTimeout).toBeNull();
  });
});
