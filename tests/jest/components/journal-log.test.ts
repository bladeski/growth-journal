import { jest } from '@jest/globals';
import type { I18n } from '../../../src/i18n/i18n.ts';

jest.unstable_mockModule('bundle-text:./JournalLog.pug', () => ({ default: '' }));
jest.unstable_mockModule('bundle-text:./JournalLog.css', () => ({ default: '' }));

let JournalLog: typeof import('../../../src/components/JournalLog/JournalLog.ts').JournalLog;

const tag = 'journal-log';

beforeAll(async () => {
  ({ JournalLog } = await import('../../../src/components/JournalLog/JournalLog.ts'));
  if (!customElements.get(tag)) customElements.define(tag, JournalLog as CustomElementConstructor);
});

const i18n: I18n = {
  locale: 'en',
  resources: {
    Log: 'Log',
    'Write your journal entry here...': 'Write your journal entry here...',
  },
  fallback: null,
};

describe('JournalLog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  const baseMarkup =
    '<section class="section"><fieldset><legend>Journal Log</legend><label id="journal-log-label" data-js="label"></label><textarea id="journal-log-textarea" name="log" data-q="log" rows="5" data-action="input:onInput; focus:onFocus" aria-labelledby="journal-log-label"></textarea></fieldset></section>';

  test('renders label and placeholder from i18n', () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = 'hello';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const label = el.shadowRoot?.querySelector('[data-js="label"]');
    const textarea = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');

    expect(label?.textContent).toBe('Log');
    expect(textarea?.placeholder).toBe('Write your journal entry here...');
  });

  test('emits log-change on input', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = '';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const textarea = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
    expect(textarea).not.toBeNull();

    const eventPromise = new Promise<string>((resolve) => {
      el.addEventListener('log-change', (evt) => {
        resolve((evt as CustomEvent<{ value: string }>).detail.value);
      });
    });

    textarea!.value = 'updated';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));

    await expect(eventPromise).resolves.toBe('updated');
  });

  test('onFocus appends a timestamp block', () => {
    const timeSpy = jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('10:30');

    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = '';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const textarea = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
    expect(textarea).not.toBeNull();

    textarea!.dispatchEvent(new Event('focus', { bubbles: true }));

    expect(el.props.log.startsWith('[10:30]')).toBe(true);
    expect(textarea!.value).toBe(el.props.log);
    timeSpy.mockRestore();
  });
});
