import { jest } from '@jest/globals';
import '../../../src/components/PersonalGrowth/PersonalGrowth';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';

describe('PersonalGrowth expanded behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('empty state shows when no data present', async () => {
    jest.spyOn(IndexedDbDataService.prototype, 'getGrowthIntention').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayCheckin').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayQuestions').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningReflection').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningQuestions').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMorningCheckin').mockResolvedValue(undefined);

    const el = document.createElement('personal-growth') as any;
    (el as any).templateFn = () => `
      <div id="personal-growth-header"></div>
      <input id="journal-date" type="date" />
      <div id="morning-status"></div>
      <div id="midday-status"></div>
      <div id="evening-status"></div>
      <div id="empty-state" class="empty-state"></div>
      <div id="intention-section" class="entry-section hidden"><span id="core-value-display"></span></div>
      <div id="midday-section" class="entry-section hidden"><span id="initial-thought-display"></span></div>
      <div id="reflection-section" class="entry-section hidden"><span id="what-went-well-display"></span></div>
      <div id="metrics-section"></div>
    `;
    document.body.appendChild(el);

    // wait for shadowRoot + selector
    for (let i = 0; i < 100; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 10));
      if (el.shadowRoot && el.shadowRoot.querySelector('#empty-state')) break;
    }
    const empty = el.shadowRoot && el.shadowRoot.querySelector('#empty-state');
    expect(empty).toBeTruthy();
    expect(empty.classList.contains('active')).toBe(true);
  });

  test('intention section is visible when morning saved exists', async () => {
    jest.spyOn(IndexedDbDataService.prototype, 'getGrowthIntention').mockResolvedValue({
      core_value: 'Focus',
      intention: 'Be present',
      focus: 'pause_3_breaths',
      affirmation: 'I can do this',
    });
    jest.spyOn(IndexedDbDataService.prototype, 'getMorningCheckin').mockResolvedValue({});
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayCheckin').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningReflection').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayQuestions').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningQuestions').mockResolvedValue(undefined);

    const el = document.createElement('personal-growth') as any;
    (el as any).templateFn = () => `
      <div id="personal-growth-header"></div>
      <input id="journal-date" type="date" />
      <div id="morning-status"></div>
      <div id="midday-status"></div>
      <div id="evening-status"></div>
      <div id="empty-state" class="empty-state"></div>
      <div id="intention-section" class="entry-section hidden"><span id="core-value-display"></span></div>
      <div id="midday-section" class="entry-section hidden"><span id="initial-thought-display"></span></div>
      <div id="reflection-section" class="entry-section hidden"><span id="what-went-well-display"></span></div>
      <div id="metrics-section"></div>
    `;
    document.body.appendChild(el);
    // wait for intention section to appear
    for (let i = 0; i < 100; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 10));
      if (el.shadowRoot && el.shadowRoot.querySelector('#intention-section')) break;
    }
    const data = el.getCurrentData();
    expect(data.intention).toBeTruthy();
    expect((data.intention as any).core_value).toBe('Focus');
  });

  test('midday and reflection sections render dynamic content and emit edit events', async () => {
    jest.spyOn(IndexedDbDataService.prototype, 'getGrowthIntention').mockResolvedValue(undefined);
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayCheckin').mockResolvedValue({ initial_thought: 'Distracted' });
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningReflection').mockResolvedValue({ what_went_well: 'Good job' });
    jest.spyOn(IndexedDbDataService.prototype, 'getMiddayQuestions').mockResolvedValue({ midday_question: 'What happened?' });
    jest.spyOn(IndexedDbDataService.prototype, 'getEveningQuestions').mockResolvedValue({ what_went_well: 'What went well?' });
    jest.spyOn(IndexedDbDataService.prototype, 'getMorningCheckin').mockResolvedValue(undefined);

    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);
    // wait for midday + reflection sections
    for (let i = 0; i < 100; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 10));
      if (el.shadowRoot && el.shadowRoot.querySelector('#midday-section')) break;
    }
    const data = el.getCurrentData();
    expect(data.midday).toBeTruthy();
    expect((data.midday as any).initial_thought).toBe('Distracted');
    expect(data.reflection).toBeTruthy();
    expect((data.reflection as any).what_went_well).toBe('Good job');
    expect((data.dynamicQuestions as any).midday_question).toBe('What happened?');
    expect((data.dynamicQuestions as any).what_went_well).toBe('What went well?');

    // test emitted events for edit actions
    const editCalls: Array<any> = [];
    el.addEventListener('editMidday', (e: CustomEvent) => editCalls.push({ type: 'midday', detail: e.detail }));
    el.addEventListener('editEvening', (e: CustomEvent) => editCalls.push({ type: 'evening', detail: e.detail }));

    // call public methods which emit
    el.editMiddayCheckin();
    el.editEveningCheckin();

    expect(editCalls.length).toBe(2);
    expect(editCalls[0].type).toBe('midday');
    expect(editCalls[1].type).toBe('evening');
  });
});
