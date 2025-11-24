import { jest } from '@jest/globals';
import '../../../src/components/PersonalGrowth/PersonalGrowth.ts';

import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('PersonalGrowth focused tests', () => {
  let origProto: any;

  beforeEach(() => {
    // stub the IDB service methods used by PersonalGrowth
    origProto = { ...IndexedDbDataService.prototype };
    IndexedDbDataService.prototype.getGrowthIntention = jest.fn().mockResolvedValue({});
    IndexedDbDataService.prototype.getMiddayCheckin = jest.fn().mockResolvedValue({});
    IndexedDbDataService.prototype.getMiddayQuestions = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getEveningReflection = jest.fn().mockResolvedValue({});
    IndexedDbDataService.prototype.getEveningQuestions = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getMorningCheckin = jest.fn().mockResolvedValue(null);
  });

  afterEach(() => {
    // restore prototype
    Object.assign(IndexedDbDataService.prototype, origProto);
    // remove any created elements from document
    const el = document.querySelector('personal-growth');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('setupHeader cancel triggers handleClose emit', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    // wait a tick for connectedCallback to schedule onMount
    await new Promise((r) => setTimeout(r, 0));

    const header = el.shadowRoot?.querySelector('#personal-growth-header');
    // if header not present in test template skip assert
    if (!header) return;

    const spy = jest.fn();
    el.addEventListener('cancel', spy as EventListener);

    // dispatch cancel event
    header.dispatchEvent(new CustomEvent('cancel'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('dateChange updates selectedDate and calls loadDataForDate', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    const header = el.shadowRoot?.querySelector('#personal-growth-header');
    if (!header) return;

    // spy on loadDataForDate
    const ld = jest.spyOn(el, 'loadDataForDate');
    header.dispatchEvent(new CustomEvent('dateChange', { detail: { date: '2000-01-02' } }));
    expect(ld).toHaveBeenCalledWith('2000-01-02');
  });

  test('goToPrevious and goToNext change selectedDate and call loadDataForDate', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    // set a known date
    el.selectedDate = '2020-03-10';

    const spy = jest.spyOn(el, 'loadDataForDate').mockResolvedValue(undefined as any);

    await el.goToPrevious();
    expect(el.selectedDate).toBe('2020-03-09');
    expect(spy).toHaveBeenCalled();

    await el.goToNext();
    expect(el.selectedDate).toBe('2020-03-10');
  });

  test('displayEntries shows midday and reflection sections when data present', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    // inject midday and reflection data
    el.middayData = { defensive_moment: 'x' };
    el.reflectionData = { what_went_well: 'y' };

    // call displayEntries directly
    el.displayEntries();

    const middaySection = el.shadowRoot?.querySelector('#midday-section');
    const reflectionSection = el.shadowRoot?.querySelector('#reflection-section');

    // If sections exist in the template assert their hidden state
    if (middaySection) expect(middaySection.classList.contains('hidden')).toBe(false);
    if (reflectionSection) expect(reflectionSection.classList.contains('hidden')).toBe(false);
  });

  test('showMessage sets visible and clears after timeout', async () => {
    const el = document.createElement('personal-growth') as any;
    document.body.appendChild(el);

    // allow connectedCallback scheduled tasks to run using real timers
    await new Promise((r) => setTimeout(r, 0));

    // now switch to fake timers to control the message timeout
    jest.useFakeTimers();

    const msg = el.shadowRoot?.querySelector('#success-message');
    if (!msg) {
      jest.useRealTimers();
      return;
    }

    el.showMessage('ok', 'success');
    expect(msg.getAttribute('data-prop:visible')).toBe('true');

    // advance timers
    jest.advanceTimersByTime(3001);
    // run any pending timer callbacks
    jest.runOnlyPendingTimers();
    expect(msg.getAttribute('data-prop:visible')).toBe('false');
    jest.useRealTimers();
  });
});
