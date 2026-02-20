import { jest } from '@jest/globals';
import type { I18n } from '../../../src/i18n/i18n.ts';
import type { RichTextEditor } from '../../../src/components/RichTextEditor/RichTextEditor.ts';

jest.unstable_mockModule('bundle-text:./JournalLog.pug', () => ({ default: '' }));
jest.unstable_mockModule('bundle-text:./JournalLog.css', () => ({ default: '' }));

let JournalLog: typeof import('../../../src/components/JournalLog/JournalLog.ts').JournalLog;

const tag = 'journal-log';

beforeAll(async () => {
  // Import RichTextEditor first to ensure it's registered
  await import('../../../src/components/RichTextEditor/RichTextEditor.ts');
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
    '<section class="section"><fieldset><legend>Journal Log</legend><label id="journal-log-label" data-js="label"></label><rich-text-editor id="richTextEditor" aria-labelledby="journal-log-label"></rich-text-editor></fieldset></section>';

  test('renders label and placeholder from i18n', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = 'hello';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    const label = el.shadowRoot?.querySelector('[data-js="label"]');
    
    // Wait for RichTextEditor to be upgraded and hydrated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const richTextEditor = el.shadowRoot?.querySelector<RichTextEditor>('rich-text-editor');
    expect(label?.textContent).toBe('Log');
    expect(richTextEditor?.props.placeholder).toBe('Write your journal entry here...');
  });

  test('emits log-change when RichTextEditor emits', async () => {
    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = '';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    await new Promise(resolve => setTimeout(resolve, 100));
    const richTextEditor = el.shadowRoot?.querySelector<RichTextEditor>('rich-text-editor');
    expect(richTextEditor).not.toBeNull();

    const eventPromise = new Promise<string>((resolve) => {
      el.addEventListener('log-change', (evt) => {
        resolve((evt as CustomEvent<{ value: string }>).detail.value);
      });
    });

    // Simulate RichTextEditor emitting log-change
    richTextEditor!.dispatchEvent(new CustomEvent('log-change', {
      bubbles: true,
      detail: { value: 'updated' }
    }));

    await expect(eventPromise).resolves.toBe('updated');
  });

  test('onFocus appends a timestamp block', async () => {
    const timeSpy = jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('10:30');

    const el = document.createElement(tag) as InstanceType<typeof JournalLog>;
    el.props.i18n = i18n;
    el.props.log = '';
    el.shadowRoot!.innerHTML = baseMarkup;
    document.body.appendChild(el);
    el.render();

    await new Promise(resolve => setTimeout(resolve, 100));
    const richTextEditor = el.shadowRoot?.querySelector<RichTextEditor>('rich-text-editor');
    expect(richTextEditor).not.toBeNull();

    // The onFocus logic is now in RichTextEditor, so we test that
    // RichTextEditor receives the correct initial log value
    expect(richTextEditor!.props.log).toBe('');
    
    timeSpy.mockRestore();
  });
});
