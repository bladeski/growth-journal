import { jest } from '@jest/globals';
import '../../../src/components/MorningCheckin/MorningCheckin.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('MorningCheckin focused tests', () => {
  let origProto: any;

  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
  });

  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    const el = document.querySelector('morning-checkin');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadCheckin loads existing morning checkin', async () => {
    IndexedDbDataService.prototype.getMorningCheckin = jest.fn().mockResolvedValue({ intention: 'Do focus', core_value: 'Focus' });

    const el = document.createElement('morning-checkin') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    expect(el.props.intention).toBe('Do focus');
    expect(el.props.core_value).toBe('Focus');
    expect(el.hasExistingCheckin).toBe(true);
  });

  test('loadCheckin falls back to growth prefill when no morning checkin', async () => {
    IndexedDbDataService.prototype.getMorningCheckin = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getGrowthIntention = jest.fn().mockResolvedValue({ intention: 'Prefill', core_value: 'Calm' });

    const el = document.createElement('morning-checkin') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    expect(el.props.intention).toBe('Prefill');
    expect(el.props.core_value).toBe('Calm');
  });

  test('formatDate returns Today and formatted', () => {
    const el = document.createElement('morning-checkin') as any;
    const today = new Date().toISOString().split('T')[0];
    expect(el.formatDate(today)).toBe('Today');
    expect(el.formatDate('2022-03-04')).toMatch(/2022/);
  });

  test('handleSubmit saves to intentions when targetDate not today', async () => {
    IndexedDbDataService.prototype.addGrowthIntention = jest.fn().mockResolvedValue(true);
    IndexedDbDataService.prototype.setMorningCheckin = jest.fn().mockResolvedValue(true);

    const el = document.createElement('morning-checkin') as any;
    document.body.appendChild(el);

    el.targetDate = '2020-01-01';
    el.props.intention = 'I intend';
    el.props.core_value = 'Focus';

    const fakeEvent = { preventDefault: () => {}, target: { checkValidity: () => true, reportValidity: () => {} } } as unknown as Event;
    await el.handleSubmit(fakeEvent);

    expect(IndexedDbDataService.prototype.addGrowthIntention).toHaveBeenCalled();
    expect(el.hasExistingCheckin).toBe(true);
  });

  test('setDate triggers loadCheckin', async () => {
    IndexedDbDataService.prototype.getMorningCheckin = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getGrowthIntention = jest.fn().mockResolvedValue(null);

    const el = document.createElement('morning-checkin') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));
    el.setDate('2020-05-05');
    await new Promise((r) => setTimeout(r, 0));
  });
});
