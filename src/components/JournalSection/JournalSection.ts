import { I18n, t } from '../../i18n/i18n.ts';
import { IPropTypes, ISectionState, ISectionTemplate, ResponseValue } from '../../models/index.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import shellTemplate from 'bundle-text:./JournalSection.pug';
import styles from 'bundle-text:./JournalSection.css';

export interface JournalSectionProps extends IPropTypes {
  template: ISectionTemplate;
  state: ISectionState;
  i18n: I18n;
  readonly?: boolean;
}

export interface SectionAnswerEventDetail {
  sectionKind: ISectionTemplate['kind'];
  questionId: string;
  value: ResponseValue;
}

export interface JournalSectionEvents {
  'section-answer': SectionAnswerEventDetail;
  'section-opened': { sectionKind: ISectionTemplate['kind'] };
}

function getResponseFor(state: ISectionState, qid: string): ResponseValue | undefined {
  return state.responses.find((r) => r.questionId === qid)?.response;
}

export class JournalSection extends BaseComponent<JournalSectionProps, JournalSectionEvents> {
  static tag = 'journal-section';
  static requiredProps = ['template', 'state', 'i18n'];

  private detailsToggleBound = false;

  constructor() {
    super(
      // templateFn
      ({ props } = { props: this.props }) => {
        const { template, i18n } = props;
        const title = t(i18n, template.titleKey);
        const desc = template.descriptionKey ? t(i18n, template.descriptionKey) : '';
        const descHtml = desc ? `<div class="desc">${desc}</div>` : '';

        const qHtml = template.questions
          .map((q) => {
            const id = `q_${q.id}`;
            const name = id;
            const helpId = q.helpTextKey ? `${id}_help` : '';
            const prompt = t(i18n, q.promptKey);
            const help = q.helpTextKey ? t(i18n, q.helpTextKey) : '';
            const labelId = `${id}_label`;
            const label = `<label id="${labelId}" for="${id}"${q.required ? ' class="required"' : ''}>
              ${prompt}
              ${
                q.helpTextKey
                  ? `<span class="help-icon" id="${helpId}" role="note" aria-live="polite" tabindex="0" data-help="${help}">
                    🛈
                </span>`
                  : ''
              }
            </label>`;

            // Compose aria attributes for accessibility
            let ariaAttrs = `aria-labelledby="${labelId}"`;
            if (q.helpTextKey) ariaAttrs += ` aria-describedby="${helpId}"`;

            switch (q.kind) {
              case 'text':
              case 'long-text': {
                const placeholder = q.placeholderKey ? t(i18n, q.placeholderKey) : '';
                const multiline = q.kind === 'long-text' || q.multiline;
                const input = multiline
                  ? `<textarea id="${id}" name="${name}" rows="4" placeholder="${placeholder}" data-action="input:onTextInput" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'readonly' : ''}></textarea>`
                  : `<input id="${id}" name="${name}" type="text" placeholder="${placeholder}" data-action="input:onTextInput" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'readonly' : ''}/>`;
                return `<div class="q" data-qid="${q.id}" data-kind="${q.kind}">${label}${input}</div>`;
              }
              case 'number': {
                return `<div class="q" data-qid="${q.id}" data-kind="number">${label}<input id="${id}" name="${name}" type="number" ${q.min != null ? `min="${q.min}"` : ''} ${q.max != null ? `max="${q.max}"` : ''} step="${q.step ?? 1}" data-action="input:onNumberInput" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'readonly' : ''}/></div>`;
              }
              case 'boolean': {
                const yes = t(i18n, q.trueLabelKey ?? 'yes');
                const no = t(i18n, q.falseLabelKey ?? 'no');
                return `<div class="q" data-qid="${q.id}" data-kind="boolean">${label}
                  <label for="${id}_true" id="${id}_true_label"><input id="${id}_true" name="${name}" type="radio" value="true" data-action="change:onBooleanChange" data-qid="${q.id}" aria-labelledby="${id}_true_label" ${q.helpTextKey ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}> ${yes}</label>
                  <label for="${id}_false" id="${id}_false_label"><input id="${id}_false" name="${name}" type="radio" value="false" data-action="change:onBooleanChange" data-qid="${q.id}" aria-labelledby="${id}_false_label" ${q.helpTextKey ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}> ${no}</label>
                </div>`;
              }
              case 'single-select': {
                const choose = t(i18n, 'generic.choose');
                const options = q.options
                  .map((o) => `<option value="${o.id}">${t(i18n, o.labelKey)}</option>`)
                  .join('');
                return `<div class="q" data-qid="${q.id}" data-kind="single-select">${label}<select id="${id}" name="${name}" data-action="change:onSingleSelectChange" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'disabled' : ''}><option value="">${choose}</option>${options}</select></div>`;
              }
              case 'multi-select': {
                const boxes = q.options
                  .map(
                    (o) =>
                      `<label for="${id}_${o.id}" id="${id}_${o.id}_label"><input id="${id}_${o.id}" name="${name}" type="checkbox" value="${o.id}" data-action="change:onMultiSelectChange" data-qid="${q.id}" aria-labelledby="${id}_${o.id}_label" ${q.helpTextKey ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}>${t(i18n, o.labelKey)}</label>`
                  )
                  .join('');
                return `<div class="q" data-qid="${q.id}" data-kind="multi-select">${label}<div class="checks">${boxes}</div></div>`;
              }
              case 'rating': {
                const min = q.scaleMin ?? 1;
                const max = q.scaleMax ?? 5;
                return `<div class="q" data-qid="${q.id}" data-kind="rating">${label}<input id="${id}" name="${name}" type="range" min="${min}" max="${max}" data-action="input:onRatingInput" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'disabled' : ''}><span class="rating-label" data-qid="${q.id}"></span></div>`;
              }
              default:
                return '';
            }
          })
          .join('');

        return shellTemplate
          .replace('__GJ_TITLE__', title)
          .replace('__GJ_DESC__', descHtml)
          .replace('__GJ_QUESTIONS__', qHtml);
      },
      undefined,
      [styles]
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** After base render, sync initial values for inputs (value/checked/labels). */
  override render(): void {
    super.render();
    this.syncFormControls();
    this.bindDetailsToggle();
  }

  /** Allow parent components to programmatically open/close this section. */
  setOpen(open: boolean): void {
    const details = this.shadowRoot?.querySelector<HTMLDetailsElement>('details');
    if (details) details.open = open;
  }

  private bindDetailsToggle(): void {
    if (this.detailsToggleBound) return;
    const details = this.shadowRoot?.querySelector<HTMLDetailsElement>('details');
    if (!details) return;

    details.addEventListener('toggle', () => {
      if (details.open) {
        this.emit('section-opened', { sectionKind: this.props.template.kind });
      }
    });

    this.detailsToggleBound = true;
  }

  override updateBindings(_key?: keyof JournalSectionProps & string): void {
    super.updateBindings(_key);
    // keep inputs in sync when state changes programmatically
    this.syncFormControls();
  }

  private syncFormControls() {
    const root = this.shadowRoot;
    if (!root) return;
    const { template, state, i18n } = this.props;

    for (const q of template.questions) {
      const r = getResponseFor(state, q.id);

      if (q.kind === 'text' || q.kind === 'long-text') {
        const el = root.querySelector<HTMLElement>(
          `[data-qid="${q.id}"][data-action*="onTextInput"]`
        );
        const input = el as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) {
          input.value = (r?.kind === q.kind ? r.value : '') as string;
          input.readOnly = !!this.props.readonly;
        }
      }

      if (q.kind === 'number') {
        const input = root.querySelector<HTMLInputElement>(
          `input[type="number"][data-qid="${q.id}"][data-action*="onNumberInput"]`
        );
        if (input) {
          input.value = r?.kind === 'number' ? String(r.value) : '';
          input.readOnly = !!this.props.readonly;
        }
      }

      if (q.kind === 'boolean') {
        const trueInp = root.querySelector<HTMLInputElement>(
          `input[type="radio"][data-qid="${q.id}"][value="true"][data-action*="onBooleanInput"]`
        );
        const falseInp = root.querySelector<HTMLInputElement>(
          `input[type="radio"][data-qid="${q.id}"][value="false"][data-action*="onBooleanInput"]`
        );
        const val = r?.kind === 'boolean' ? r.value : false;
        if (trueInp && falseInp) {
          trueInp.checked = !!val;
          falseInp.checked = !val;
          trueInp.readOnly = !!this.props.readonly;
          falseInp.readOnly = !!this.props.readonly;
        }
      }

      if (q.kind === 'single-select') {
        const select = root.querySelector<HTMLSelectElement>(
          `select[data-qid="${q.id}"][data-action*="onSingleSelectChange"]`
        );
        if (select) {
          select.value = r?.kind === 'single-select' ? r.value : '';
          select.disabled = !!this.props.readonly;
        }
      }

      if (q.kind === 'multi-select') {
        const selected = new Set(r?.kind === 'multi-select' ? r.value : []);
        const boxes = root.querySelectorAll<HTMLInputElement>(
          `input[type="checkbox"][data-qid="${q.id}"][data-action*="onMultiSelectChange"]`
        );
        boxes.forEach((b) => {
          b.checked = selected.has(b.value);
          b.disabled = !!this.props.readonly;
        });
      }

      if (q.kind === 'rating') {
        const range = root.querySelector<HTMLInputElement>(
          `input[type="range"][data-qid="${q.id}"][data-action*="onRatingInput"]`
        );
        const label = root.querySelector<HTMLElement>(`.rating-label[data-qid="${q.id}"]`);
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        const val = r?.kind === 'rating' ? r.value : Math.round((min + max) / 2);
        if (range) {
          range.value = String(val);
          range.readOnly = !!this.props.readonly;
        }
        if (label) {
          const key = q.labelKeys?.[val];
          label.textContent = key ? t(i18n, key) : String(val);
        }
      }
    }
  }

  private renderLabel(
    q: ISectionTemplate['questions'][number],
    r: ResponseValue | undefined
  ): string {
    const { i18n } = this.props;

    if (q.kind === 'rating' && r?.kind === 'rating') {
      const key = q.labelKeys?.[r.value];
      return key ? t(i18n, key) : String(r.value);
    }
    return `<label ${q.required ? 'class="required"' : ''}>
      ${t(i18n, q.promptKey)}
      ${
        q.helpTextKey
          ? `
        <span class="help-icon" data-help="${t(i18n, q.helpTextKey)}">
          🛈
        </span>`
          : ''
      }</label>`;
  }

  private onTextInput(e: Event): void {
    const tgt = e.target as HTMLInputElement | HTMLTextAreaElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const response: ResponseValue = { kind: 'text', value: tgt.value };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  private onNumberInput(e: Event): void {
    const tgt = e.target as HTMLInputElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const num = Number(tgt.value);
    if (isNaN(num)) return;
    const response: ResponseValue = { kind: 'number', value: num };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  private onBooleanChange(e: Event): void {
    const tgt = e.target as HTMLInputElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const val = tgt.value === 'true';
    const response: ResponseValue = { kind: 'boolean', value: val };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  private onSingleSelectChange(e: Event): void {
    const tgt = e.target as HTMLSelectElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const response: ResponseValue = { kind: 'single-select', value: tgt.value };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  private onMultiSelectChange(e: Event): void {
    const tgt = e.target as HTMLInputElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const checkboxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][data-qid="${qid}"]`
    );
    if (!checkboxes) return;
    const selected = Array.from(checkboxes)
      .filter((b) => b.checked)
      .map((b) => b.value);
    const response: ResponseValue = { kind: 'multi-select', value: selected };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  private onRatingInput(e: Event): void {
    const tgt = e.target as HTMLInputElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const num = Number(tgt.value);
    if (isNaN(num)) return;
    const response: ResponseValue = { kind: 'rating', value: num };
    this.updateLocalState(qid, response);
    this.emit('section-answer', {
      sectionKind: this.props.template.kind,
      questionId: qid,
      value: response
    });
  }

  // Keep local props.state aligned so UI feels instant
  private updateLocalState(questionId: string, response: ResponseValue) {
    const state = this.props.state;
    const idx = state.responses.findIndex((r) => r.questionId === questionId);
    const now = new Date().toISOString();
    const next = { questionId, response, updatedAt: now };
    if (idx >= 0) state.responses[idx] = next;
    else state.responses.push(next);
    // trigger any bindings (inputs are manual-synced)
    this.setProp('state', { ...state });
  }
}

customElements.define(JournalSection.tag, JournalSection);
