import { afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals';
import type { I18n } from '../../../src/i18n/i18n.ts';
import type { IJournalEntry } from '../../../src/models/index.ts';
import type { ISectionTemplate } from '../../../src/models/ISectionTemplate.ts';

jest.unstable_mockModule('bundle-text:./JournalDay.pug', () => ({ default: '' }));
jest.unstable_mockModule('bundle-text:./JournalDay.css', () => ({ default: '' }));

const getJournalDayTemplatesMock = jest.fn();

jest.unstable_mockModule('../../../src/helpers/helpers.ts', () => ({
  getJournalDayTemplates: getJournalDayTemplatesMock,
  getDayLabels: () => ({
    focusAriaLabel: "Today's focus",
    questionsAriaLabel: 'Daily reflection questions',
    valueLabelPrefix: 'Value:',
    challengeLabelPrefix: 'Challenge:',
  }),
  getDayEntryAriaLabel: (_i18n: unknown, date: string) => `Journal entry for ${date}`,
}));

const getAreaValueMapMock = jest.fn<() => Promise<Record<string, unknown>>>();

class MockDataService {
  static getInstance() {
    return new MockDataService();
  }
  async getAreaValueMap() {
    return getAreaValueMapMock();
  }
}

jest.unstable_mockModule('../../../src/services/data.service.ts', () => ({
  default: MockDataService,
}));

const sectionRenderMock = jest.fn();
class MockJournalSection extends HTMLElement {
  props: Record<string, unknown> = {};
  render = sectionRenderMock;
  setOpen = jest.fn();
}

if (!customElements.get('journal-section')) {
  customElements.define('journal-section', MockJournalSection as CustomElementConstructor);
}

jest.unstable_mockModule('../../../src/components/JournalSection/JournalSection.ts', () => {
  return { JournalSection: MockJournalSection };
});

let JournalDay: typeof import('../../../src/components/JournalDay/JournalDay.ts').JournalDay;

const tag = 'journal-day';

beforeAll(async () => {
  ({ JournalDay } = await import('../../../src/components/JournalDay/JournalDay.ts'));
  if (!customElements.get(tag)) customElements.define(tag, JournalDay as CustomElementConstructor);
});

const i18n: I18n = {
  locale: 'en',
  resources: {
    'val-a': 'val-a',
    'ch-a': 'ch-a',
  },
  fallback: null,
};

function buildTemplate(kind: ISectionTemplate['kind']): ISectionTemplate {
  return {
    id: `${kind}-tpl`,
    kind,
    title: 'title',
    questions: [{ id: `${kind}-q`, kind: 'text', prompt: 'prompt' }],
    version: 1,
  };
}

const baseMarkup =
  '<span class="value-label"><span data-bind="valueLabelPrefix"></span> <span data-bind="valueText"></span></span>' +
  '<span class="challenge-label"><span data-bind="challengeLabelPrefix"></span> <span data-bind="challengeText"></span></span>' +
  '<journal-section id="sec-morning"></journal-section>' +
  '<journal-section id="sec-midday"></journal-section>' +
  '<journal-section id="sec-evening"></journal-section>' +
  '<journal-section id="sec-accountability"></journal-section>' +
  '<journal-section id="sec-log"></journal-section>';

async function flushMicrotasks() {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('JournalDay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('emits value-challenge-change when missing and not readonly', async () => {
    getAreaValueMapMock.mockResolvedValue({
      'val-a': ['ch-a'],
    });
    getJournalDayTemplatesMock.mockReturnValue({
      valueChallenge: { value: 'val-a', challenge: 'ch-a' },
      templates: {
        morning: buildTemplate('morning-reset'),
        midday: buildTemplate('midday-checkin'),
        evening: buildTemplate('evening-reflection'),
        accountability: buildTemplate('accountability'),
        log: buildTemplate('journal-log'),
      },
    });

    const entry: IJournalEntry = {
      id: 'entry-1',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const el = document.createElement(tag) as InstanceType<typeof JournalDay>;
    el.shadowRoot!.innerHTML = baseMarkup;

    const handler = jest.fn();
    el.addEventListener('value-challenge-change', handler);

    el.props.entry = entry;
    el.props.i18n = i18n;
    el.props.readonly = false;
    (el.props as Record<string, unknown>).valueChallenge = null;

    el.render();
    await (el as unknown as { hydrateChildren: () => Promise<void> }).hydrateChildren();

    expect(getJournalDayTemplatesMock.mock.calls.length).toBeGreaterThan(0);
    expect(handler.mock.calls.length).toBeGreaterThan(0);
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail.valueChallenge).toEqual({ value: 'val-a', challenge: 'ch-a' });
    expect(entry.valueChallenge).toEqual({ value: 'val-a', challenge: 'ch-a' });

    const valueLabel = el.shadowRoot?.querySelector('.value-label');
    const challengeLabel = el.shadowRoot?.querySelector('.challenge-label');
    expect(valueLabel?.textContent).toBe('Value: val-a');
    expect(challengeLabel?.textContent).toBe('Challenge: ch-a');
  });

  test('does not emit value-challenge-change when readonly', async () => {
    getAreaValueMapMock.mockResolvedValue({
      'val-a': ['ch-a'],
    });
    getJournalDayTemplatesMock.mockReturnValue({
      valueChallenge: { value: 'val-a', challenge: 'ch-a' },
      templates: {
        morning: buildTemplate('morning-reset'),
        midday: buildTemplate('midday-checkin'),
        evening: buildTemplate('evening-reflection'),
        accountability: buildTemplate('accountability'),
        log: buildTemplate('journal-log'),
      },
    });

    const entry: IJournalEntry = {
      id: 'entry-2',
      date: '2026-02-18',
      createdAt: '2026-02-18T10:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
    };

    const el = document.createElement(tag) as InstanceType<typeof JournalDay>;
    el.props.entry = entry;
    el.props.i18n = i18n;
    el.props.readonly = true;
    el.shadowRoot!.innerHTML = baseMarkup;

    const handler = jest.fn();
    el.addEventListener('value-challenge-change', handler);

    el.render();
    await flushMicrotasks();

    expect(handler).not.toHaveBeenCalled();
    expect(entry.valueChallenge).toBeUndefined();
  });
});
