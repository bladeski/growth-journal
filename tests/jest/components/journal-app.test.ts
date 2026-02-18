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

const getGrowthAreasMock = jest.fn();
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
const saveMock = jest.fn();
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

const i18n: I18n = {
  locale: 'en',
  resources: {
    'area.focus': 'Focus',
    'area.health': 'Health',
  },
  fallback: null,
};

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
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

describe('JournalApp', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('bootstraps entry and hydrates journal-day', async () => {
    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([
      { id: 'area.focus', label: 'Focus' },
      { id: 'area.health', label: 'Health' },
    ]);
    localStorage.setItem('settings:growthArea', 'area.focus');

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day).not.toBeNull();
    expect(day!.props.entry).toBe(entry);
    expect(day!.props.i18n).toBe(i18n);
    expect(day!.props.growthArea).toBe('area.focus');
    expect(dayRenderMock).toHaveBeenCalled();

    const select = el.shadowRoot?.querySelector('#setting-growth-area') as HTMLSelectElement | null;
    expect(select?.options.length).toBe(2);
  });

  test('log-change triggers debounced save', async () => {
    jest.useFakeTimers();

    const entry: IJournalEntry = {
      id: 'entry-2',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day).not.toBeNull();

    day!.dispatchEvent(
      new CustomEvent('log-change', {
        detail: { value: 'new log' },
        bubbles: true,
        composed: true,
      }),
    );

    jest.advanceTimersByTime(500);
    await flushMicrotasks();

    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ log: 'new log' }));
  });

  test('value-challenge-change triggers debounced save', async () => {
    jest.useFakeTimers();

    const entry: IJournalEntry = {
      id: 'entry-3',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    day!.dispatchEvent(
      new CustomEvent('value-challenge-change', {
        detail: { valueChallenge: { value: 'v1', challenge: 'c1' } },
        bubbles: true,
        composed: true,
      }),
    );

    jest.advanceTimersByTime(500);
    await flushMicrotasks();

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ valueChallenge: { value: 'v1', challenge: 'c1' } }),
    );
  });

  test('section-answer calls applyAnswer', async () => {
    const entry: IJournalEntry = {
      id: 'entry-4',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const updatedEntry: IJournalEntry = {
      ...entry,
      updatedAt: '2026-02-18T10:05:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValue(entry);
    applyAnswerMock.mockResolvedValue(updatedEntry);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    day!.dispatchEvent(
      new CustomEvent('section-answer', {
        detail: {
          sectionKind: 'morning-reset',
          questionId: 'q1',
          value: { kind: 'text', value: 'answer' },
        },
        bubbles: true,
        composed: true,
      }),
    );

    await flushMicrotasks();

    expect(applyAnswerMock).toHaveBeenCalledWith(
      entry,
      expect.objectContaining({ questionId: 'q1' }),
    );
    expect(el.props.entry).toBe(updatedEntry);
  });

  test('date picker changes date and reloads entry', async () => {
    const entry1: IJournalEntry = {
      id: 'entry-5',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };
    const entry2: IJournalEntry = {
      id: 'entry-6',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValueOnce(entry1).mockResolvedValueOnce(entry2);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const dateInput = el.shadowRoot?.querySelector('#date-picker') as HTMLInputElement | null;
    expect(dateInput).not.toBeNull();

    dateInput!.value = '2026-02-17';
    dateInput!.onchange!(new Event('change'));

    await flushMicrotasks();

    expect(el.props.date).toBe('2026-02-17');
    expect(el.props.entry).toBe(entry2);
  });

  test('prev-day button navigates to previous date', async () => {
    const entry1: IJournalEntry = {
      id: 'entry-7',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };
    const entry2: IJournalEntry = {
      id: 'entry-8',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValueOnce(entry1).mockResolvedValueOnce(entry2);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const prevBtn = el.shadowRoot?.querySelector('#prev-day') as HTMLButtonElement | null;
    expect(prevBtn).not.toBeNull();

    prevBtn!.click();

    await flushMicrotasks();

    expect(el.props.date).toBe('2026-02-17');
    expect(el.props.entry).toBe(entry2);
  });

  test('next-day button navigates to next date', async () => {
    const entry1: IJournalEntry = {
      id: 'entry-9',
      date: '2026-02-17',
      createdAt: '2026-02-17T10:00:00.000Z',
      updatedAt: '2026-02-17T10:00:00.000Z',
    };
    const entry2: IJournalEntry = {
      id: 'entry-10',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValueOnce(entry1).mockResolvedValueOnce(entry2);
    dbGetSettingMock.mockResolvedValue(null as unknown);
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.props.date = '2026-02-17'; // Start at previous date
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const nextBtn = el.shadowRoot?.querySelector('#next-day') as HTMLButtonElement | null;
    expect(nextBtn).not.toBeNull();

    nextBtn!.click();

    await flushMicrotasks();

    expect(el.props.date).toBe('2026-02-18');
    expect(el.props.entry).toBe(entry2);
  });

  test('bootstrap error shows error message', async () => {
    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockRejectedValue(new Error('Database unavailable'));
    getGrowthAreasMock.mockReturnValue([]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    expect(el.props.error).toBe('Database unavailable');
    expect(el.props.loading).toBe(false);

    const errorDiv = el.shadowRoot?.querySelector('#error');
    expect(errorDiv?.classList.contains('hidden')).toBe(false);
  });

  test('uses IndexedDB for saved growth area when available', async () => {
    const entry: IJournalEntry = {
      id: 'entry-11',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    loadRuntimeI18nMock.mockResolvedValue(i18n);
    ensureDayMock.mockResolvedValue(entry);
    dbGetSettingMock.mockResolvedValue('area.health' as unknown);
    getGrowthAreasMock.mockReturnValue([
      { id: 'area.focus', label: 'Focus' },
      { id: 'area.health', label: 'Health' },
    ]);

    const el = document.createElement(tag) as InstanceType<typeof JournalApp>;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);

    await flushMicrotasks();

    const select = el.shadowRoot?.querySelector('#setting-growth-area') as HTMLSelectElement | null;
    expect(select?.value).toBe('area.health');

    const day = el.shadowRoot?.querySelector('journal-day') as MockJournalDay | null;
    expect(day!.props.growthArea).toBe('area.health');
  });
});
