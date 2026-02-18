import type { I18n } from '../../../src/i18n/i18n.ts';
import type { ISectionState, ISectionTemplate } from '../../../src/models/index.ts';
import { jest } from '@jest/globals';

jest.unstable_mockModule('bundle-text:./JournalSection.pug', () => ({ default: '' }));
jest.unstable_mockModule('bundle-text:./JournalSection.css', () => ({ default: '' }));

let JournalSection: typeof import('../../../src/components/JournalSection/JournalSection.ts').JournalSection;

const tag = 'journal-section';

beforeAll(async () => {
  ({ JournalSection } = await import('../../../src/components/JournalSection/JournalSection.ts'));
  if (!customElements.get(tag)) {
    customElements.define(tag, JournalSection as CustomElementConstructor);
  }
});

const i18n: I18n = {
  locale: 'en',
  resources: {
    'sec.title': 'Section Title',
    'q.text': 'Text prompt',
    'q.rate': 'Rate prompt',
    'rating.ok': 'OK',
  },
  fallback: null,
};

function buildTemplate(): ISectionTemplate {
  return {
    id: 'tpl-1',
    kind: 'morning-reset',
    titleKey: 'sec.title',
    questions: [
      { id: 'q-text', kind: 'text', promptKey: 'q.text' },
      {
        id: 'q-rate',
        kind: 'rating',
        promptKey: 'q.rate',
        scaleMin: 1,
        scaleMax: 5,
        labelKeys: { 3: 'rating.ok' },
      },
    ],
    version: 1,
  };
}

function buildState(): ISectionState {
  return {
    templateId: 'tpl-1',
    kind: 'morning-reset',
    responses: [{ questionId: 'q-rate', response: { kind: 'rating', value: 3 } }],
  };
}

describe('JournalSection', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const baseMarkup =
    '<section class="section"><details><summary><div class="summary-header"></div></summary>' +
    '<div class="q" data-qid="q-text" data-kind="text">' +
    '<input type="text" data-action="input:onTextInput" data-qid="q-text" />' +
    '</div>' +
    '<div class="q" data-qid="q-rate" data-kind="rating">' +
    '<input type="range" data-action="input:onRatingInput" data-qid="q-rate" />' +
    '<span class="rating-label" data-qid="q-rate"></span>' +
    '</div>' +
    '</details></section>';

  test('renders rating label from response', () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const label = el.shadowRoot?.querySelector<HTMLElement>('.rating-label[data-qid="q-rate"]');
    expect(label?.textContent).toBe('OK');
  });

  test('emits section-answer on text input', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="text"][data-qid="q-text"]',
    );
    expect(input).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    input!.value = 'Hello';
    input!.dispatchEvent(new Event('input', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.questionId).toBe('q-text');
    expect(evt.detail.value).toEqual({ kind: 'text', value: 'Hello' });

    const stored = el.props.state.responses.find((r) => r.questionId === 'q-text');
    expect(stored?.response).toEqual({ kind: 'text', value: 'Hello' });
  });

  test('emits section-opened when details toggles open', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const details = el.shadowRoot?.querySelector<HTMLDetailsElement>('details');
    expect(details).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-opened', (evt) => resolve(evt));
    });

    details!.open = true;
    details!.dispatchEvent(new Event('toggle'));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.sectionKind).toBe('morning-reset');
  });

  test('handles number input', async () => {
    const markup = baseMarkup + '<div class="q" data-qid="q-num"><input type="number" data-action="input:onNumberInput" data-qid="q-num" /></div>';
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = {
      ...buildTemplate(),
      questions: [...buildTemplate().questions, { id: 'q-num', kind: 'number', promptKey: 'q.num' }],
    };
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = markup;
    document.body.appendChild(el);
    el.render();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="number"][data-qid="q-num"]');
    expect(input).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    input!.value = '42';
    input!.dispatchEvent(new Event('input', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.value).toEqual({ kind: 'number', value: 42 });
  });

  test('handles boolean radio input', async () => {
    const markup = baseMarkup + '<div class="q" data-qid="q-bool"><input type="radio" value="true" data-action="change:onBooleanChange" data-qid="q-bool" /><input type="radio" value="false" data-action="change:onBooleanChange" data-qid="q-bool" /></div>';
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = {
      ...buildTemplate(),
      questions: [...buildTemplate().questions, { id: 'q-bool', kind: 'boolean', promptKey: 'q.bool' }],
    };
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = markup;
    document.body.appendChild(el);
    el.render();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="radio"][value="true"][data-qid="q-bool"]');
    expect(input).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    input!.checked = true;
    input!.dispatchEvent(new Event('change', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.value).toEqual({ kind: 'boolean', value: true });
  });

  test('handles single-select dropdown', async () => {
    const markup = baseMarkup + '<div class="q" data-qid="q-select"><select data-action="change:onSingleSelectChange" data-qid="q-select"><option value="">Choose</option><option value="opt1">Option 1</option></select></div>';
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = {
      ...buildTemplate(),
      questions: [...buildTemplate().questions, { id: 'q-select', kind: 'single-select', promptKey: 'q.select', options: [{ id: 'opt1', labelKey: 'opt1.label' }] }],
    };
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = markup;
    document.body.appendChild(el);
    el.render();

    const select = el.shadowRoot?.querySelector<HTMLSelectElement>('select[data-qid="q-select"]');
    expect(select).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    select!.value = 'opt1';
    select!.dispatchEvent(new Event('change', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.value).toEqual({ kind: 'single-select', value: 'opt1' });
  });

  test('handles multi-select checkboxes', async () => {
    const markup = baseMarkup + '<div class="q" data-qid="q-multi"><input type="checkbox" value="a" data-action="change:onMultiSelectChange" data-qid="q-multi" /><input type="checkbox" value="b" data-action="change:onMultiSelectChange" data-qid="q-multi" /></div>';
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = {
      ...buildTemplate(),
      questions: [...buildTemplate().questions, { id: 'q-multi', kind: 'multi-select', promptKey: 'q.multi', options: [{ id: 'a', labelKey: 'a.label' }, { id: 'b', labelKey: 'b.label' }] }],
    };
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = markup;
    document.body.appendChild(el);
    el.render();

    const inputs = el.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-qid="q-multi"]');
    expect(inputs?.length).toBe(2);

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    inputs![0].checked = true;
    inputs![1].checked = true;
    inputs![0].dispatchEvent(new Event('change', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.value).toEqual({ kind: 'multi-select', value: ['a', 'b'] });
  });

  test('handles rating slider input', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"][data-qid="q-rate"]');
    expect(input).not.toBeNull();

    const eventPromise = new Promise((resolve) => {
      el.addEventListener('section-answer', (evt) => resolve(evt));
    });

    input!.value = '4';
    input!.dispatchEvent(new Event('input', { bubbles: true }));

    const evt = (await eventPromise) as CustomEvent;
    expect(evt.detail.value).toEqual({ kind: 'rating', value: 4 });
  });

  test('setOpen controls details element', () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const details = el.shadowRoot?.querySelector<HTMLDetailsElement>('details');
    expect(details?.open).toBeFalsy();

    el.setOpen(true);
    expect(details?.open).toBe(true);

    el.setOpen(false);
    expect(details?.open).toBe(false);
  });

  test('respects readonly mode', () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalSection>;
    el.props.template = buildTemplate();
    el.props.state = buildState();
    el.props.i18n = i18n;
    el.props.readonly = true;
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="text"][data-qid="q-text"]');
    expect(input?.readOnly).toBe(true);
  });
});
