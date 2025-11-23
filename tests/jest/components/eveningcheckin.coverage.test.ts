import { jest } from '@jest/globals';
import '../../../src/components/EveningCheckin/EveningCheckin.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('EveningCheckin focused tests', () => {
  let origProto: any;
  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
  });
  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    const el = document.querySelector('evening-checkin');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadCheckin sets questions and existing data path', async () => {
    IndexedDbDataService.prototype.getEveningQuestions = jest.fn().mockResolvedValue({
      what_went_well: 'Custom?', defensive_moments: 'Def?', empathy_practice: 'Emp?', small_win: 'Win', core_value: 'Focus', intention: 'Intent',
    });
    IndexedDbDataService.prototype.getEveningReflection = jest.fn().mockResolvedValue({ what_went_well: 'Good', defensive_moments: 'X', empathy_practice: 'Y', small_win: 'Z' });

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // loadCheckin called in constructor; wait a tick
    await new Promise((r) => setTimeout(r, 0));

    // props should be populated from questions and reflection
    expect(el.props.whatWentWellQuestion).toBe('Custom?');
    expect(el.props.what_went_well).toBe('Good');
    expect(el.hasExistingCheckin).toBe(true);
  });

  test('updateTipsContent updates list items when coreValueLower present', async () => {
    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);
    if (!el.shadowRoot) el.attachShadow({ mode: 'open' });

    // create reflection-tips with list items
    const tips = document.createElement('reflection-tips');
    const ul = document.createElement('ul');
    for (let i = 0; i < 5; i++) {
      const li = document.createElement('li');
      ul.appendChild(li);
    }
    tips.appendChild(ul);
    el.shadowRoot.appendChild(tips);

    el.props.coreValue = 'Focus';
    el.props.coreValueLower = 'focus';

    el.updateTipsContent();

    const list = tips.querySelectorAll('li');
    expect(list[0].textContent).toContain('focus');
    expect(list[2].textContent).toContain('focus');
  });

  test('formatDate returns Today for current date and long format otherwise', () => {
    const el = document.createElement('evening-checkin') as any;
    const today = new Date().toISOString().split('T')[0];
    expect(el.formatDate(today)).toBe('Today');
    const other = '2020-01-02';
    const formatted = el.formatDate(other);
    expect(formatted).toMatch(/2020/);
  });

  test('loadCheckinForDate loads today branch and other date branch', async () => {
    const today = new Date().toISOString().split('T')[0];
    IndexedDbDataService.prototype.getEveningQuestions = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getEveningReflection = jest.fn().mockResolvedValue(null);

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // call loadCheckinForDate for today
    await el.loadCheckinForDate(today);

    // call for another date
    await el.loadCheckinForDate('2020-01-01');
  });
});
