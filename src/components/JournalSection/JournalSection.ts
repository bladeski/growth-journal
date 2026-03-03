import { I18n, t } from '../../i18n/i18n.ts';
import { IPropTypes, ISectionState, ISectionTemplate, ResponseValue } from '../../models/index.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import shellTemplate from 'bundle-text:./JournalSection.pug';
import styles from 'bundle-text:./JournalSection.css';
import { nextMicrotask, whenUpgraded } from '../../utils/elements.ts';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.ts';

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
        const { template } = props;
        const title = template.title;
        const desc = template.description || '';
        const descHtml = desc ? `<div class="desc">${desc}</div>` : '';

        const qHtml = template.questions
          .map((q) => {
            const id = `q_${q.id}`;
            const name = id;
            const helpId = q.helpText ? `${id}_help` : '';
            const prompt = q.prompt;
            const help = q.helpText || '';
            const labelId = `${id}_label`;
            const label = `<label id="${labelId}" for="${id}"${q.required ? ' class="required"' : ''}>
              ${prompt}
              ${
                q.helpText
                  ? `<span class="help-icon" id="${helpId}" role="note" aria-live="polite" tabindex="0" data-tooltip="${help}">
                    🛈
                </span>`
                  : ''
              }
            </label>`;

            // Compose aria attributes for accessibility
            let ariaAttrs = `aria-labelledby="${labelId}"`;
            if (q.helpText) ariaAttrs += ` aria-describedby="${helpId}"`;

            switch (q.kind) {
              case 'text':
              case 'long-text': {
                const placeholder = q.placeholder || '';
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
                const yes = q.trueLabel ?? 'yes';
                const no = q.falseLabel ?? 'no';
                return `<div class="q" data-qid="${q.id}" data-kind="boolean">${label}
                  <label for="${id}_true" id="${id}_true_label"><input id="${id}_true" name="${name}" type="radio" value="true" data-action="change:onBooleanChange" data-qid="${q.id}" aria-labelledby="${id}_true_label" ${q.helpText ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}> ${yes}</label>
                  <label for="${id}_false" id="${id}_false_label"><input id="${id}_false" name="${name}" type="radio" value="false" data-action="change:onBooleanChange" data-qid="${q.id}" aria-labelledby="${id}_false_label" ${q.helpText ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}> ${no}</label>
                </div>`;
              }
              case 'single-select': {
                const choose = this.props.i18n ? t(this.props.i18n, 'generic.choose') : 'Choose';
                const options = q.options
                  .map((o) => `<option value="${o.id}">${o.label}</option>`)
                  .join('');
                return `<div class="q" data-qid="${q.id}" data-kind="single-select">${label}<select id="${id}" name="${name}" data-action="change:onSingleSelectChange" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'disabled' : ''}><option value="">${choose}</option>${options}</select></div>`;
              }
              case 'multi-select': {
                const boxes = q.options
                  .map(
                    (o) =>
                      `<label for="${id}_${o.id}" id="${id}_${o.id}_label"><input id="${id}_${o.id}" name="${name}" type="checkbox" value="${o.id}" data-action="change:onMultiSelectChange" data-qid="${q.id}" aria-labelledby="${id}_${o.id}_label" ${q.helpText ? `aria-describedby="${helpId}"` : ''} ${this.props.readonly ? 'disabled' : ''}>${o.label}</label>`,
                  )
                  .join('');
                return `<div class="q" data-qid="${q.id}" data-kind="multi-select">${label}<div class="checks">${boxes}</div></div>`;
              }
              case 'rating': {
                const min = q.scaleMin ?? 1;
                const max = q.scaleMax ?? 5;
                return `<div class="q" data-qid="${q.id}" data-kind="rating">${label}<input id="${id}" name="${name}" type="range" min="${min}" max="${max}" data-action="input:onRatingInput" data-qid="${q.id}" ${ariaAttrs} ${this.props.readonly ? 'disabled' : ''}><span class="rating-label" data-qid="${q.id}"></span></div>`;
              }
              case 'rich-text': {
                const addEntryLabel = this.props.i18n
                  ? t(this.props.i18n, 'journal.log.addEntry')
                  : 'Add Entry';
                const addEntryAria = this.props.i18n
                  ? t(this.props.i18n, 'journal.log.addEntryAria')
                  : 'Add new journal entry';
                const resolvedAddEntryLabel =
                  addEntryLabel === 'journal.log.addEntry' ? 'Add Entry' : addEntryLabel;
                const resolvedAddEntryAria =
                  addEntryAria === 'journal.log.addEntryAria'
                    ? 'Add new journal entry'
                    : addEntryAria;
                return `<div class="q rich-text-q" data-qid="${q.id}" data-kind="rich-text">
                  <button class="add-entry" type="button" data-action="click:onAddJournalEntry" data-qid="${q.id}" aria-label="${resolvedAddEntryAria}" ${this.props.readonly ? 'disabled' : ''}>+ ${resolvedAddEntryLabel}</button>
                  <rich-text-editor id="rte_${q.id}" data-qid="${q.id}"></rich-text-editor>
                </div>`;
              }
              default:
                return '';
            }
          })
          .join('');

        return shellTemplate
          .replaceAll('__GJ_TITLE__', title)
          .replaceAll('__GJ_DESC__', descHtml)
          .replaceAll('__GJ_QUESTIONS__', qHtml);
      },
      undefined,
      [styles],
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
    this.hydrateRichTextEditors();
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
    const { template, state } = this.props;

    for (const q of template.questions) {
      const r = getResponseFor(state, q.id);

      if (q.kind === 'text' || q.kind === 'long-text') {
        const el = root.querySelector<HTMLElement>(
          `[data-qid="${q.id}"][data-action*="onTextInput"]`,
        );
        const input = el as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) {
          input.value = (r?.kind === q.kind ? r.value : '') as string;
          input.readOnly = !!this.props.readonly;
        }
      }

      if (q.kind === 'number') {
        const input = root.querySelector<HTMLInputElement>(
          `input[type="number"][data-qid="${q.id}"][data-action*="onNumberInput"]`,
        );
        if (input) {
          input.value = r?.kind === 'number' ? String(r.value) : '';
          input.readOnly = !!this.props.readonly;
        }
      }

      if (q.kind === 'boolean') {
        const trueInp = root.querySelector<HTMLInputElement>(
          `input[type="radio"][data-qid="${q.id}"][value="true"][data-action*="onBooleanInput"]`,
        );
        const falseInp = root.querySelector<HTMLInputElement>(
          `input[type="radio"][data-qid="${q.id}"][value="false"][data-action*="onBooleanInput"]`,
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
          `select[data-qid="${q.id}"][data-action*="onSingleSelectChange"]`,
        );
        if (select) {
          select.value = r?.kind === 'single-select' ? r.value : '';
          select.disabled = !!this.props.readonly;
        }
      }

      if (q.kind === 'multi-select') {
        const selected = new Set(r?.kind === 'multi-select' ? r.value : []);
        const boxes = root.querySelectorAll<HTMLInputElement>(
          `input[type="checkbox"][data-qid="${q.id}"][data-action*="onMultiSelectChange"]`,
        );
        boxes.forEach((b) => {
          b.checked = selected.has(b.value);
          b.disabled = !!this.props.readonly;
        });
      }

      if (q.kind === 'rating') {
        const range = root.querySelector<HTMLInputElement>(
          `input[type="range"][data-qid="${q.id}"][data-action*="onRatingInput"]`,
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
          const key = q.labels?.[val];
          label.textContent = key ?? String(val);
        }
      }

      if (q.kind === 'rich-text') {
        const rte = root.querySelector<RichTextEditor>(`rich-text-editor[data-qid="${q.id}"]`);
        if (rte && rte.props) {
          const val = r?.kind === 'rich-text' ? r.value : '';
          if (rte.props.log !== val) rte.props.log = val;
          rte.props.readonly = !!this.props.readonly;
          rte.props.label = q.prompt;
          rte.props.placeholder = q.placeholder || '';
        }
      }
    }
  }

  private renderLabel(
    q: ISectionTemplate['questions'][number],
    r: ResponseValue | undefined,
  ): string {
    if (q.kind === 'rating' && r?.kind === 'rating') {
      const key = q.labels?.[r.value];
      return key ?? String(r.value);
    }
    return `<label ${q.required ? 'class="required"' : ''}>
      ${q.prompt}
      ${
        q.helpText
          ? `
        <span class="help-icon" data-tooltip="${q.helpText}">
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
      value: response,
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
      value: response,
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
      value: response,
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
      value: response,
    });
  }

  private onMultiSelectChange(e: Event): void {
    const tgt = e.target as HTMLInputElement;
    const qid = tgt.dataset.qid;
    if (!qid) return;
    const checkboxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][data-qid="${qid}"]`,
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
      value: response,
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
      value: response,
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

  private richTextBound = new Set<string>();

  private async hydrateRichTextEditors() {
    if (!this.shadowRoot) return;
    const { template, state } = this.props;

    await nextMicrotask();

    for (const q of template.questions) {
      if (q.kind !== 'rich-text') continue;
      if (this.richTextBound.has(q.id)) continue;

      const rte = this.shadowRoot.querySelector<RichTextEditor>(
        `rich-text-editor[data-qid="${q.id}"]`,
      );
      if (!rte) continue;

      await whenUpgraded(rte, 'rich-text-editor');

      const r = getResponseFor(state, q.id);
      rte.props.log = r?.kind === 'rich-text' ? r.value : '';
      rte.props.readonly = !!this.props.readonly;
      rte.props.label = q.prompt;
      rte.props.placeholder = q.placeholder || '';
      rte.props.i18n = this.props.i18n;
      rte.render();

      rte.addEventListener('log-change', (evt) => {
        const detail = (evt as CustomEvent<{ value: string }>).detail;
        const response: ResponseValue = { kind: 'rich-text', value: detail.value };
        this.updateLocalState(q.id, response);
        this.emit('section-answer', {
          sectionKind: this.props.template.kind,
          questionId: q.id,
          value: response,
        });
      });

      this.richTextBound.add(q.id);
    }
  }

  private onAddJournalEntry(e: Event) {
    const tgt = e.target as HTMLElement;
    const qid = tgt.dataset.qid;
    if (!qid || !this.shadowRoot) return;

    const state = this.props.state;
    const r = getResponseFor(state, qid);
    const existing = r?.kind === 'rich-text' ? r.value : '';

    const domParser = new DOMParser();
    const hasExistingContent =
      domParser.parseFromString(existing, 'text/html').body.textContent!.length > 0;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entryTemplate = `${hasExistingContent ? '<hr>' : ''}<strong><em>[${time}]</em></strong><span style="">&nbsp;</span>`;
    const next = hasExistingContent ? `${existing}${entryTemplate}` : `${entryTemplate}`;

    const rte = this.shadowRoot.querySelector<RichTextEditor>(
      `rich-text-editor[data-qid="${qid}"]`,
    );
    if (rte) {
      rte.updateContent(next);
    } else {
      const response: ResponseValue = { kind: 'rich-text', value: next };
      this.updateLocalState(qid, response);
      this.emit('section-answer', {
        sectionKind: this.props.template.kind,
        questionId: qid,
        value: response,
      });
    }
  }
}

customElements.define(JournalSection.tag, JournalSection);
