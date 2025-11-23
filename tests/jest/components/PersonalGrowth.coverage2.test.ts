import { jest } from '@jest/globals';
import '../../../src/components/PersonalGrowth/PersonalGrowth.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('PersonalGrowth coverage2 tests', () => {
  let origProto: any;

  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
  });

  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    const el = document.querySelector('personal-growth');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadDataForDate sets dynamicQuestions from eveningQResp strings and hasAnyData numeric/array/object branches', async () => {
    // stub to return evening questions with mixed types
    IndexedDbDataService.prototype.getGrowthIntention = jest.fn().mockResolvedValue({});
    IndexedDbDataService.prototype.getMiddayCheckin = jest.fn().mockResolvedValue({});
    IndexedDbDataService.prototype.getMiddayQuestions = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getEveningReflection = jest.fn().mockResolvedValue({ what_went_well: 'good', defensive_moments: 'x' });
    IndexedDbDataService.prototype.getEveningQuestions = jest.fn().mockResolvedValue({ what_went_well: 'Prompt?', defensive_moments: 123 });
    IndexedDbDataService.prototype.getMorningCheckin = jest.fn().mockResolvedValue({});

    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    // wait tick for onMount
    await new Promise((r) => setTimeout(r, 0));

    // call loadDataForDate explicitly with a sample date
    await el.loadDataForDate('2020-01-01');

    // dynamicQuestions.what_went_well should be string 'Prompt?'
    expect(el.dynamicQuestions.what_went_well).toBe('Prompt?');

    // hasAnyData numeric/object/array behaviour
    expect(el.hasAnyData({ a: 0 })).toBe(true); // number -> true
    expect(el.hasAnyData({ a: '' })).toBe(false); // empty string -> false
    expect(el.hasAnyData({ a: [''] })).toBe(false); // array of empty -> false
    expect(el.hasAnyData({ a: ['x'] })).toBe(true); // array with meaningful
    expect(el.hasAnyData({ a: { b: ' ' } })).toBe(false); // nested whitespace
    expect(el.hasAnyData({ a: { b: 'x' } })).toBe(true);
  });

  test('filterReflectionForActualData removes scaffold prompts and keeps real values', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    // setup reflectionData and dynamicQuestions to simulate scaffold
    el.reflectionData = {
      entry_date: '2020-01-01',
      what_went_well: 'Prompt?',
      defensive_moments: 'real note',
      extra: '  ',
    };
    el.dynamicQuestions = {
      what_went_well: 'Prompt?',
      defensive_moments: 'When did I...',
    };

    const filtered = el.filterReflectionForActualData();
    // entry_date removed
    expect(filtered.entry_date).toBeUndefined();
    // what_went_well matched prompt -> removed
    expect(filtered.what_went_well).toBeUndefined();
    // defensive_moments real -> kept
    expect(filtered.defensive_moments).toBe('real note');
    // extra whitespace -> removed
    expect(filtered.extra).toBeUndefined();
  });

  test('displayMetrics writes values when progressData populated', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    el.progressData = {
      apologies_given: 2,
      pauses_before_reacting: 3,
      empathy_moments: 4,
      defensive_reactions: 1,
      vulnerability_shared: 0,
      self_rating_empathy: 8,
      self_rating_responsibility: 6,
    };

    // create some simple shadow nodes so setText can find them
    const wrap = el.shadowRoot || el.attachShadow({ mode: 'open' });
    const ids = ['#apologies-display','#pauses-display','#empathy-moments-display','#defensive-reactions-display','#vulnerability-display','#empathy-rating-display','#responsibility-rating-display'];
    ids.forEach((id) => {
      const node = document.createElement('div');
      node.id = id.replace('#','');
      wrap.appendChild(node);
    });

    el.displayMetrics();

    expect(wrap.querySelector('#apologies-display')!.textContent).toBe('2');
    expect(wrap.querySelector('#empathy-rating-display')!.textContent).toBe('8/10');
  });

  test('onDisconnect clears timers and goToToday respects isLoadingData early return', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    // set timeouts and ensure onDisconnect clears them
    el._mountTimeout = window.setTimeout(() => {}, 10000);
    el._messageTimeout = window.setTimeout(() => {}, 10000);

    el.onDisconnect();
    expect(el._mountTimeout).toBeNull();
    expect(el._messageTimeout).toBeNull();

    // test goToToday early return
    el.isLoadingData = true;
    const spy = jest.spyOn(el, 'loadDataForDate');
    await el.goToToday();
    expect(spy).not.toHaveBeenCalled();
  });
});
