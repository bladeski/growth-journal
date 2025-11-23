import { jest } from '@jest/globals';
import '../../../src/components/MiddayCheckin/MiddayCheckin.ts';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService.ts';

describe('MiddayCheckin focused tests', () => {
  let origProto: any;

  beforeEach(() => {
    origProto = { ...IndexedDbDataService.prototype };
  });

  afterEach(() => {
    Object.assign(IndexedDbDataService.prototype, origProto);
    const el = document.querySelector('midday-checkin');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    jest.restoreAllMocks();
  });

  test('loadCheckin populates questions and existing checkin values', async () => {
    IndexedDbDataService.prototype.getMiddayQuestions = jest.fn().mockResolvedValue({ midday_question: 'How are you?', core_value: 'Focus', intention: 'Be present' });
    IndexedDbDataService.prototype.getMiddayCheckin = jest.fn().mockResolvedValue({ defensive_moment: 'test', initial_thought: 'x', healthier_reframe: 'y' });

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    // wait for async loadCheckin to run
    await new Promise((r) => setTimeout(r, 0));

    expect(el.props.daySpecificQuestion).toBe('How are you?');
    expect(el.props.coreValue).toBe('Focus');
    expect(el.props.coreValueLower).toBe('focus');
    expect(el.props.defensive_moment).toBe('test');
    expect(el.hasExistingCheckin).toBe(true);
  });

  test('updateTipsContent updates list items when coreValueLower provided', () => {
    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);
    if (!el.shadowRoot) el.attachShadow({ mode: 'open' });

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
    expect(list[1].textContent).toContain('Your intention for today is about focus');
    expect(list[3].textContent).toContain('How can I practice focus');
  });

  test('formatDate returns Today and formatted date', () => {
    const el = document.createElement('midday-checkin') as any;
    const today = new Date().toISOString().split('T')[0];
    expect(el.formatDate(today)).toBe('Today');
    const other = '2021-02-03';
    expect(el.formatDate(other)).toMatch(/2021/);
  });

  test('handleSubmit uses historic branch when targetDate set', async () => {
    IndexedDbDataService.prototype.setMiddayCheckin = jest.fn().mockResolvedValue(true);

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    el.targetDate = '2020-01-01';
    el.props.defensive_moment = 'd';
    el.props.initial_thought = 'i';
    el.props.healthier_reframe = 'h';

    // simulate submit event with a fake form target that passes validation
    const form = document.createElement('form') as any;
    form.checkValidity = () => true;
    form.reportValidity = () => {};
    const fakeEvent = {
      preventDefault: () => {},
      target: form,
    } as unknown as Event;
    await el.handleSubmit(fakeEvent);

    expect(IndexedDbDataService.prototype.setMiddayCheckin).toHaveBeenCalled();
    expect(el.hasExistingCheckin).toBe(true);
  });

  test('setDate triggers loadCheckin', async () => {
    IndexedDbDataService.prototype.getMiddayQuestions = jest.fn().mockResolvedValue(null);
    IndexedDbDataService.prototype.getMiddayCheckin = jest.fn().mockResolvedValue(null);

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    el.setDate('2020-05-05');

    await new Promise((r) => setTimeout(r, 0));
  });
});
