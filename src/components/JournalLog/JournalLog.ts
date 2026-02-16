import { I18n, t } from '../../i18n/i18n.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./JournalLog.pug';
import styles from 'bundle-text:./JournalLog.css';
import { IPropTypes } from '../../models/index.ts';

export interface JournalLogProps extends IPropTypes {
  log: string;
  i18n: I18n;
  labelKey?: string; // optional override
  placeholderKey?: string; // optional override
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
    this.setProp('log', this.props.log ?? '');
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** Keep textarea in sync with props.log */
  override render(): void {
    super.render();
    this.syncStrings();
    const ta = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
    if (ta && ta.value !== (this.props.log ?? '')) {
      ta.value = this.props.log ?? '';
    }
    if (ta) ta.readOnly = !!this.props.readonly;
  }

  override updateBindings(key?: keyof JournalLogProps & string): void {
    super.updateBindings(key);
    if (!this.shadowRoot) return;
    if (!key || key === 'i18n' || key === 'labelKey' || key === 'placeholderKey') {
      this.syncStrings();
    }
    if (!key || key === 'log') {
      const ta = this.shadowRoot.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
      if (ta && ta.value !== (this.props.log ?? '')) {
        ta.value = this.props.log ?? '';
      }
      if (ta) ta.readOnly = !!this.props.readonly;
    }
  }

  private syncStrings(): void {
    if (!this.shadowRoot) return;
    const label = t(this.props.i18n, this.props.labelKey ?? 'Log');
    const placeholder = t(
      this.props.i18n,
      this.props.placeholderKey ?? 'Write your journal entry here...',
    );

    const labelEl = this.shadowRoot.querySelector<HTMLElement>('[data-js="label"]');
    if (labelEl) labelEl.textContent = label;

    const ta = this.shadowRoot.querySelector<HTMLTextAreaElement>('textarea[data-q="log"]');
    if (ta) ta.placeholder = placeholder;
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

  private getTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

customElements.define(JournalLog.tag, JournalLog);
