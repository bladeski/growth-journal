import { jest } from '@jest/globals';
import '../../../src/components/EveningCheckin/EveningCheckin';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';
import { waitForElement, mockIndexedDbService } from '../helpers/testHelpers';

describe('EveningCheckin behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('loadData fills props and updates form values', async () => {
    const spies = {
      getEveningQuestions: Promise.resolve({ what_went_well: 'Q1', core_value: 'Bravery', small_win: 'Win' }),
      getEveningReflection: Promise.resolve({ what_went_well: 'did well', small_win: 'yay' }),
    } as any;

    const mocker = mockIndexedDbService({
      getEveningQuestions: jest.fn().mockResolvedValue({ what_went_well: 'Q1', core_value: 'Bravery', small_win: 'Win' }),
      getEveningReflection: jest.fn().mockResolvedValue({ what_went_well: 'did well', small_win: 'yay' }),
    });

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // wait for initial loadCheckin to finish
    await new Promise((r) => setTimeout(r, 20));

    // setDate should trigger loadCheckin and fill props
    el.setDate('2025-11-20');
    await new Promise((r) => setTimeout(r, 20));

    const data = el.props;
    expect(data.what_went_well).toBeDefined();
    expect(data.small_win).toBeDefined();

    mocker.restoreAll();
  });

  test('handleSubmit validation fails when required fields missing', async () => {
    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // ensure props are empty
    el.props.what_went_well = '';
    el.props.empathy_practice = '';
    el.props.small_win = '';

    const form = document.createElement('form');
    // make form valid at HTML level
    // @ts-ignore
    form.checkValidity = () => true;

    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    await el.handleSubmit(ev);
    // after validation, errorMessage should be set
    expect(el.props.errorMessage).toMatch(/Please fill in all required fields/);
  });

  test('handleSubmit calls IDB setEveningReflection and sets success state', async () => {
    const mocker = mockIndexedDbService({
      setEveningReflection: jest.fn().mockResolvedValue(true),
    });

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // set required fields
    el.props.what_went_well = 'x';
    el.props.empathy_practice = 'y';
    el.props.small_win = 'z';

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;
    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    await el.handleSubmit(ev);

    expect(el.props.successMessage).toBe('Evening reflection saved successfully!');

    mocker.restoreAll();
  });
});
import { jest } from '@jest/globals';
import '../../../src/components/EveningCheckin/EveningCheckin';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';
import { waitForElement, mockIndexedDbService } from '../helpers/testHelpers';

describe('EveningCheckin behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('loadData fills props and updates form values', async () => {
    const spies = {
      getEveningQuestions: Promise.resolve({ what_went_well: 'Q1', core_value: 'Bravery', small_win: 'Win' }),
      getEveningReflection: Promise.resolve({ what_went_well: 'did well', small_win: 'yay' }),
    } as any;

    const mocker = mockIndexedDbService({
      getEveningQuestions: jest.fn().mockResolvedValue({ what_went_well: 'Q1', core_value: 'Bravery', small_win: 'Win' }),
      getEveningReflection: jest.fn().mockResolvedValue({ what_went_well: 'did well', small_win: 'yay' }),
    });

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // wait for initial loadCheckin to finish
    await new Promise((r) => setTimeout(r, 20));

    // setDate should trigger loadCheckin and fill props
    el.setDate('2025-11-20');
    await new Promise((r) => setTimeout(r, 20));

    const data = el.props;
    expect(data.what_went_well).toBeDefined();
    expect(data.small_win).toBeDefined();

    mocker.restoreAll();
  });

  test('handleSubmit validation fails when required fields missing', async () => {
    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // ensure props are empty
    el.props.what_went_well = '';
    el.props.empathy_practice = '';
    el.props.small_win = '';

    const form = document.createElement('form');
    // make form valid at HTML level
    // @ts-ignore
    form.checkValidity = () => true;

    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    await el.handleSubmit(ev);
    // after validation, errorMessage should be set
    expect(el.props.errorMessage).toMatch(/Please fill in all required fields/);
  });

  test('handleSubmit calls IDB setEveningReflection and sets success state', async () => {
    const mocker = mockIndexedDbService({
      setEveningReflection: jest.fn().mockResolvedValue(true),
    });

    const el = document.createElement('evening-checkin') as any;
    document.body.appendChild(el);

    // set required fields
    el.props.what_went_well = 'x';
    el.props.empathy_practice = 'y';
    el.props.small_win = 'z';

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;
    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    await el.handleSubmit(ev);

    expect(el.props.successMessage).toBe('Evening reflection saved successfully!');

    mocker.restoreAll();
  });
});
