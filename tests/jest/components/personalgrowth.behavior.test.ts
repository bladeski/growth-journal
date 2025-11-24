import { jest } from '@jest/globals';
import '../../../src/components/PersonalGrowth/PersonalGrowth';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';

describe('PersonalGrowth behavior tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('loads data for date and updates sections visibility', async () => {
    jest.spyOn(IndexedDbDataService.prototype, 'getGrowthIntention').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayCheckin').mockResolvedValue({ initial_thought: 'x' });
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayQuestions').mockResolvedValue({ midday_question: 'Q?' });
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningReflection').mockResolvedValue({ what_went_well: 'good' });
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningQuestions').mockResolvedValue({ what_went_well: 'What went well?' });
    jest.spyOn(IndexedDbDataService.prototype, 'getMorningCheckin').mockResolvedValue(undefined);

    const el = document.createElement('personal-growth') as any;
    (el as any).templateFn = () => `
      <div id="personal-growth-header"></div>
      <input id="journal-date" type="date" />
      <div id="morning-status"></div>
      <div id="midday-status"></div>
      <div id="evening-status"></div>
      <div id="empty-state" class="empty-state"></div>
      <div id="intention-section" class="entry-section hidden"></div>
      <div id="midday-section" class="entry-section hidden"></div>
      <div id="reflection-section" class="entry-section hidden"></div>
      <div id="metrics-section"></div>
    `;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 30));

    await el.setDate('2025-11-21');
    await new Promise((r) => setTimeout(r, 10));

    const data = el.getCurrentData();
    expect(data.midday).toBeTruthy();
    expect(data.reflection).toBeTruthy();
    expect(data.intention).toEqual({});
  });

  test('navigation methods update date correctly', async () => {
    const el = document.createElement('personal-growth') as any;
    (el as any).templateFn = () => `
      <div id="personal-growth-header"></div>
      <input id="journal-date" type="date" />
      <div id="morning-status"></div>
      <div id="midday-status"></div>
      <div id="evening-status"></div>
      <div id="empty-state" class="empty-state"></div>
      <div id="intention-section" class="entry-section hidden"></div>
      <div id="midday-section" class="entry-section hidden"></div>
      <div id="reflection-section" class="entry-section hidden"></div>
      <div id="metrics-section"></div>
    `;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 20));

    const initial = el.getCurrentData().date;
    await el.goToPrevious();
    await new Promise((r) => setTimeout(r, 10));
    const prev = el.getCurrentData().date;
    expect(prev).not.toBe(initial);

    await el.goToNext();
    await new Promise((r) => setTimeout(r, 10));
    const next = el.getCurrentData().date;
    expect(next).toBe(initial);
  });
});
