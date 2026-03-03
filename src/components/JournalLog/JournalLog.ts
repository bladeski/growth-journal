import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./JournalLog.pug';
import styles from 'bundle-text:./JournalLog.css';
import { IPropTypes } from '../../models/index.ts';
import { I18n, t } from '../../i18n/i18n.ts';
import { nextMicrotask, whenUpgraded } from '../../utils/elements.ts';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.ts';

export interface JournalLogProps extends IPropTypes {
  log: string;
  i18n: I18n;
  journalLogLegend?: string;
  addEntryLabel?: string;
  addEntryAria?: string;
  label?: string; // optional override
  placeholder?: string; // optional override
  readonly?: boolean;
}

export interface JournalLogEvents {
  'log-change': { value: string };
}

export class JournalLog extends BaseComponent<JournalLogProps, JournalLogEvents> {
  static tag = 'journal-log';
  static requiredProps = ['log', 'i18n'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, undefined, [styles]);
    // defaults
    this.props.log = this.props.log ?? '';
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** Keep textarea in sync with props.log */
  override render(): void {
    const strings = this.getLocalizedStrings();
    this.props.journalLogLegend = strings.legendText;
    this.props.addEntryLabel = strings.addEntryLabel;
    this.props.addEntryAria = strings.addEntryAria;

    super.render();
    this.syncStrings();
    const ta = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
    if (ta && ta.value !== (this.props.log ?? '')) {
      ta.value = this.props.log ?? '';
    }
    if (ta) ta.readOnly = !!this.props.readonly;
    this.hydrateChildren();
  }

  private async hydrateChildren() {
    if (!this.shadowRoot) return;
    const { log } = this.props;

    // Give the browser a microtask to upgrade child custom elements
    await nextMicrotask();

    const richTextEditor = this.shadowRoot.querySelector('#richTextEditor') as RichTextEditor;
    if (richTextEditor) {
      await whenUpgraded(richTextEditor, 'rich-text-editor');
      richTextEditor.props.log = log ?? '';
      richTextEditor.props.readonly = this.props.readonly;
      richTextEditor.props.label = this.props.label ?? 'Log';
      richTextEditor.props.placeholder =
        this.props.placeholder ?? 'Write your journal entry here...';

      // Listen for log-change events from RichTextEditor and re-emit
      richTextEditor.addEventListener('log-change', (evt) => {
        const detail = (evt as CustomEvent<{ value: string }>).detail;
        this.setProp('log', detail.value);
        this.emit('log-change', detail);
      });

      richTextEditor.render();
    }
  }

  override updateBindings(key?: keyof JournalLogProps & string): void {
    super.updateBindings(key);
    if (!this.shadowRoot) return;
    if (!key || key === 'label' || key === 'placeholder') {
      this.syncStrings();
    }
  }

  private syncStrings(): void {
    if (!this.shadowRoot) return;
    const strings = this.getLocalizedStrings();
    const label = this.props.label ?? 'Log';
    const placeholder = this.props.placeholder ?? strings.placeholder;

    // Update RichTextEditor label
    const richTextEditor = this.shadowRoot.querySelector('#richTextEditor') as RichTextEditor;
    if (richTextEditor && richTextEditor.props) {
      richTextEditor.props.label = label;
      richTextEditor.props.placeholder = placeholder;
    }
  }

  private getLocalizedStrings(): {
    legendText: string;
    addEntryLabel: string;
    addEntryAria: string;
    placeholder: string;
  } {
    const i18n = this.props.i18n;
    const tr = (key: string, fallback: string): string => {
      if (!i18n) return fallback;
      const translated = t(i18n, key);
      return translated === key ? fallback : translated;
    };

    return {
      legendText: tr(
        'journal.log.legend',
        tr('sec.feedface-1234-5678-9abc-def0000000010.title', 'Journal Log'),
      ),
      addEntryLabel: tr('journal.log.addEntry', 'Add Entry'),
      addEntryAria: tr('journal.log.addEntryAria', 'Add new journal entry'),
      placeholder: tr('q.feedface-text.prompt', 'Write your journal entry here...'),
    };
  }

  private onFocus() {
    const time = this.getTime();
    if (!this.props.readonly) {
      const existing = this.props.log ?? '';

      // Replace trailing timestamp line [hh:mm] if present, otherwise append a new timestamp block
      const lines = existing.split(/\r?\n/);
      // find last non-empty line
      let lastIdx = lines.length - 1;
      while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--;

      const timeTokenRegex = /^\[\d{1,2}:\d{2}(?:\s?[APMapm]{2})?\]$/;
      let next = '';

      if (lastIdx >= 0 && timeTokenRegex.test(lines[lastIdx].trim())) {
        // replace the last timestamp line with the updated time (keep single trailing space)
        lines[lastIdx] = `[${time}] `;
        next = lines.join('\n');
      } else if (existing.trim() === '') {
        next = `[${time}] `;
      } else {
        next = `${existing}\n\n[${time}] `;
      }

      this.setProp('log', next);
      this.updateBindings('log');
    }
  }

  private onInput(evt: Event) {
    const value = (evt.target as HTMLTextAreaElement).value;
    this.setProp('log', value);
    this.emit('log-change', { value });
  }

  private onAddJournalEntry() {
    const domParser = new DOMParser();
    const hasExistingContent =
      domParser.parseFromString(this.props.log ?? '', 'text/html').body.textContent.length > 0;
    const existing = this.props.log ?? '';
    const time = this.getTime();
    const entryTemplate = `${hasExistingContent ? '<hr>' : ''}<strong><em>[${time}]</em></strong><span style="">&nbsp;</span>`;
    const next = hasExistingContent ? `${existing}${entryTemplate}` : `${entryTemplate}`;
    const editor = this.shadowRoot?.querySelector<RichTextEditor>('rich-text-editor');
    if (editor) {
      editor.updateContent(next);
    } else {
      this.setProp('log', next);
      this.updateBindings('log');
    }
  }

  private getTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

customElements.define(JournalLog.tag, JournalLog);
