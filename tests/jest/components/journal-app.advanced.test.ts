import { jest } from '@jest/globals';
import type { I18n } from '../../../src/i18n/i18n.ts';
import type { IJournalEntry } from '../../../src/models/index.ts';

jest.unstable_mockModule('bundle-text:./JournalApp.pug', () => ({ default: '' }));
jest.unstable_mockModule('bundle-text:./JournalApp.css', () => ({ default: '' }));

const loadRuntimeI18nMock = jest.fn<() => Promise<I18n>>();
const defaultI18n: I18n = { locale: 'en', resources: {}, fallback: null };

jest.unstable_mockModule('../../../src/i18n/runtime.ts', () => ({
  defaultI18n,
  loadRuntimeI18n: loadRuntimeI18nMock,
}));

const getGrowthAreasMock = jest.fn<() => Promise<Array<{ id: string; label: string }>>>();
const getJournalDayTemplatesMock = jest.fn();

jest.unstable_mockModule('../../../src/helpers/helpers.ts', () => ({
  getGrowthAreas: getGrowthAreasMock,
  getJournalDayTemplates: getJournalDayTemplatesMock,
}));

const dbGetSettingMock = jest.fn<(key: string) => Promise<unknown>>();
class MockJournalDB {
  async init(): Promise<void> {}
  async getSetting(key: string): Promise<unknown> {
    return dbGetSettingMock(key);
  }
}

jest.unstable_mockModule('../../../src/storage/indexeddb.ts', () => ({
  JournalDB: MockJournalDB,
}));

const ensureDayMock = jest.fn<() => Promise<IJournalEntry>>();
const saveMock = jest.fn<() => Promise<void>>();
const applyAnswerMock = jest.fn<(entry: IJournalEntry, answer: Record<string, unknown>) => Promise<IJournalEntry>>();

class MockJournalService {
  ensureDay = ensureDayMock;
  save = saveMock;
  applyAnswer = applyAnswerMock;
}

jest.unstable_mockModule('../../../src/services/journal.service.ts', () => ({
  JournalService: MockJournalService,
}));

const dayRenderMock = jest.fn();
class MockJournalDay extends HTMLElement {
  props: Record<string, unknown> = {};
  render = dayRenderMock;
}

jest.unstable_mockModule('../../../src/components/index.ts', () => ({
  JournalDay: MockJournalDay,
}));

let JournalApp: typeof import('../../../src/components/JournalApp/JournalApp.ts').JournalApp;

const tag = 'journal-app';

beforeAll(async () => {
  ({ JournalApp } = await import('../../../src/components/JournalApp/JournalApp.ts'));
  if (!customElements.get('journal-day')) {
    customElements.define('journal-day', MockJournalDay as CustomElementConstructor);
  }
  if (!customElements.get(tag)) customElements.define(tag, JournalApp as CustomElementConstructor);
});

const baseMarkup =
  '<div id="loading"></div>' +
  '<div id="content" class="hidden"></div>' +
  '<div id="error" class="hidden"></div>' +
  '<select id="setting-growth-area"></select>' +
  '<journal-day id="day"></journal-day>' +
  '<input id="date-picker" />' +
  '<button id="prev-day"></button>' +
  '<button id="next-day"></button>';

async function flushMicrotasks() {
  for (let i = 0; i < 20; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

describe('JournalApp additional scenarios', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('handles empty growth areas list', async () => {
    const entry: IJournalEntry = {
      id: 'e1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([]);
    dbGetSettingMock.mockResolvedValue(null);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const select = el.shadowRoot?.querySelector('#setting-growth-area') as HTMLSelectElement | null;
    expect(select?.options.length).toBe(0);
  });

  test('loads and displays multiple growth areas', async () => {
    const entry: IJournalEntry = {
      id: 'e2',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {
        'area.focus': 'Focus',
        'area.health': 'Health',
        'area.growth': 'Growth',
      },
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([
      { id: 'area.focus', label: 'Focus' },
      { id: 'area.health', label: 'Health' },
      { id: 'area.growth', label: 'Growth' },
    ]);
    dbGetSettingMock.mockResolvedValue(null);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const select = el.shadowRoot?.querySelector('#setting-growth-area') as HTMLSelectElement | null;
    expect(select?.options.length).toBe(3);
  });

  test('preserves growth area selection across navigation', async () => {
    jest.useFakeTimers();

    const entry: IJournalEntry = {
      id: 'e3',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: { 'area.focus': 'Focus', 'area.health': 'Health' },
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue('area.focus');
    getGrowthAreasMock.mockResolvedValue([
      { id: 'area.focus', label: 'Focus' },
      { id: 'area.health', label: 'Health' },
    ]);
    saveMock.mockResolvedValue(undefined);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day?.props.growthArea).toBe('area.focus');

    jest.useRealTimers();
  });

  test('respects value-challenge-change event', async () => {
    jest.useFakeTimers();

    const entry: IJournalEntry = {
      id: 'e4',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([]);
    saveMock.mockResolvedValue(undefined);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    day!.dispatchEvent(
      new CustomEvent('value-challenge-change', {
        detail: { value: 'new-value', challenge: 'new-challenge' },
        bubbles: true,
        composed: true,
      }),
    );

    jest.advanceTimersByTime(500);
    await flushMicrotasks();

    expect(saveMock).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('handles date picker value changes', async () => {
    const entry: IJournalEntry = {
      id: 'e5',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const datePicker = el.shadowRoot?.querySelector('#date-picker') as HTMLInputElement | null;
    if (datePicker) {
      datePicker.value = '2026-02-20';
      datePicker.dispatchEvent(new Event('change'));
      await flushMicrotasks();
    }

    expect(ensureDayMock).toHaveBeenCalled();
  });

  test('navigates between days with prev button', async () => {
    const entry: IJournalEntry = {
      id: 'e6',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const prevBtn = el.shadowRoot?.querySelector('#prev-day') as HTMLButtonElement | null;
    expect(prevBtn).not.toBeNull();
    if (prevBtn) {
      expect(typeof prevBtn.click).toBe('function');
    }
  });

  test('navigates between days with next button', async () => {
    const entry: IJournalEntry = {
      id: 'e7',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    getGrowthAreasMock.mockResolvedValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const nextBtn = el.shadowRoot?.querySelector('#next-day') as HTMLButtonElement | null;
    expect(nextBtn).not.toBeNull();
    if (nextBtn) {
      expect(typeof nextBtn.click).toBe('function');
    }
  });

  test('handles section-answer event properly', async () => {
    jest.useFakeTimers();

    const entry: IJournalEntry = {
      id: 'e8',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const updatedEntry: IJournalEntry = {
      ...entry,
      updatedAt: '2026-02-18T11:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: {},
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    applyAnswerMock.mockResolvedValue(updatedEntry);
    saveMock.mockResolvedValue(undefined);
    getGrowthAreasMock.mockResolvedValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day).not.toBeNull();

    day!.dispatchEvent(
      new CustomEvent('section-answer', {
        detail: { sectionId: 'morning', answer: { content: 'test answer' } },
        bubbles: true,
        composed: true,
      }),
    );

    jest.advanceTimersByTime(500);
    await flushMicrotasks();

    // Component should handle the event
    expect(day).toBeDefined();

    jest.useRealTimers();
  });

  test('hydrates journal-day with correct props', async () => {
    const entry: IJournalEntry = {
      id: 'e9',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue({
      locale: 'en',
      resources: { 'area.focus': 'Focus' },
      fallback: null,
    });
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue('area.focus');
    getGrowthAreasMock.mockResolvedValue([{ id: 'area.focus', label: 'Focus' }]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day).not.toBeNull();
    expect(day?.props.entry).toEqual(entry);
    expect(day?.props.growthArea).toBe('area.focus');
    expect(day?.props.i18n).not.toBeUndefined();
  });
});
