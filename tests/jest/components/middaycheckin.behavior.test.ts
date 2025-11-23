import { jest } from '@jest/globals';
import '../../../src/components/MiddayCheckin/MiddayCheckin';
import { mockIndexedDbService } from '../helpers/testHelpers';

describe('MiddayCheckin behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('loadCheckin loads questions and existing reflection', async () => {
    const mock = mockIndexedDbService({
      getMiddayQuestions: jest.fn().mockResolvedValue({
        midday_question: 'What was I thinking?',
        core_value: 'Focus',
      }),
      getMiddayCheckin: jest.fn().mockResolvedValue({
        initial_thought: 'I was distracted',
        healthier_reframe: 'Focus more',
      }),
    });

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    // Allow the component's constructor load to run
    await new Promise((r) => setTimeout(r, 20));

    // setDate should trigger a load for that date
    el.setDate('2025-11-20');
    await new Promise((r) => setTimeout(r, 20));

    expect(el.props.initial_thought).toBeDefined();
    expect(el.props.daySpecificQuestion).toBeDefined();

    mock.restoreAll();
  });

  test('validation prevents submit when required fields missing', async () => {
    const spy = jest.fn().mockResolvedValue(true);
    const mock = mockIndexedDbService({ setMiddayCheckin: spy });

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    el.props.initial_thought = '';
    el.props.productive_question = '';

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => false;
    const ev = { preventDefault: () => {}, target: form } as unknown as Event;
    await el.handleSubmit(ev);

    // since HTML5 validation failed, API should not be called and no success message
    expect(spy).not.toHaveBeenCalled();
    expect(el.props.successMessage).toBe('');

    mock.restoreAll();
  });

  test('successful submit saves and emits submit event', async () => {
    const spy = jest.fn().mockImplementation(async (data: any) => {
      return true;
    });
    const mock = mockIndexedDbService({ setMiddayCheckin: spy });

    const el = document.createElement('midday-checkin') as any;
    document.body.appendChild(el);

    el.props.initial_thought = 'Thinking clearly';
    el.props.healthier_reframe = 'Do the next small thing';

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;
    const ev = { preventDefault: () => {}, target: form } as unknown as Event;

    const emitted: any[] = [];
    el.addEventListener('submit', (e: any) => emitted.push(e.detail));

    await el.handleSubmit(ev);

    expect(el.props.successMessage).toMatch(/Midday reflection saved successfully/);
    expect(el.props.successMessage).toBeTruthy();
    expect(el.props.initial_thought).toBe('Thinking clearly');
    expect(el.props.healthier_reframe).toBe('Do the next small thing');
    expect(emitted.length).toBe(1);

    mock.restoreAll();
  });
});
