import { I18n, t } from '../../i18n/i18n.ts';
import { IJournalEntry } from '../../models/IJournalEntry.ts';
import {
  IPropTypes,
  ISectionState,
  ISectionTemplate,
  ValueChallengePair,
} from '../../models/index.ts';
import { emptySectionState } from '../../models/logic.ts';
import { nextMicrotask, whenUpgraded } from '../../utils/elements.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./JournalDay.pug';
import styles from 'bundle-text:./JournalDay.css';
import { JournalSection } from '../JournalSection/JournalSection.ts';
import {
  getDayLabels,
  getDayEntryAriaLabel,
  getJournalDayTemplates,
} from '../../helpers/helpers.ts';
import DataService from '../../services/data.service.ts';

export interface JournalDayProps extends IPropTypes {
  entry: IJournalEntry;
  i18n: I18n;
  date?: string;
  readonly?: boolean;
  growthArea?: string;
  // Translated UI strings (set before render)
  entryAriaLabel?: string;
  focusAriaLabel?: string;
  questionsAriaLabel?: string;
  valueLabelPrefix?: string;
  challengeLabelPrefix?: string;
  valueText?: string;
  challengeText?: string;
}

export class JournalDay extends BaseComponent<JournalDayProps> {
  static tag = 'journal-day';
  static requiredProps = ['entry', 'i18n', 'valueChallenge'];

  private sectionOpenedBound = false;
  private valueChallenge: ValueChallengePair | undefined;

  constructor() {
    const templateFn = () => template;
    super(templateFn, undefined, [styles]);

    this.props.entry = this.props.entry as unknown as IJournalEntry; // keep proxy intact
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.sectionOpenedBound) {
      this.addEventListener('section-opened', this.onSectionOpened as EventListener);
      this.sectionOpenedBound = true;
    }
  }

  private onSectionOpened = (evt: Event): void => {
    if (!this.shadowRoot) return;
    const path = typeof evt.composedPath === 'function' ? evt.composedPath() : [];
    const opened = path.find(
      (n) => n instanceof HTMLElement && n.tagName.toLowerCase() === 'journal-section',
    ) as HTMLElement | undefined;
    if (!opened) return;

    // The log section operates independently of the accordion
    const logEl = this.shadowRoot.querySelector('#sec-log');
    if (opened === logEl) return;

    const sections = Array.from(this.shadowRoot.querySelectorAll('journal-section'));
    for (const sec of sections) {
      if (sec === opened || sec === logEl) continue;
      const controllable = sec as unknown as { setOpen?: (open: boolean) => void };
      controllable.setOpen?.(false);
    }
  };

  override render(): void {
    // If core data isn't ready yet, let the base render structure and stop.
    if (!this.props?.entry || !this.props?.i18n) {
      super.render();
      return;
    }

    const i18n = this.props.i18n;

    // Update the date binding before calling super (so {{date}} resolves)
    this.props.date = this.props.entry.date;

    // Spread translated labels into props — translation logic lives in helpers
    Object.assign(this.props, getDayLabels(i18n));
    this.props.entryAriaLabel = getDayEntryAriaLabel(i18n, this.props.date);

    super.render();
    // Hydrate after structural render
    this.hydrateChildren()
      .then(() => {
        if (this.valueChallenge) {
          this.props.valueText = t(this.props.i18n, this.valueChallenge.value ?? '');
          this.props.challengeText = t(this.props.i18n, this.valueChallenge.challenge ?? '');
        }
      })
      .catch(() => {
        // swallow errors to avoid breaking render loop
      });
  }

  private async hydrateChildren() {
    if (!this.shadowRoot) return;
    const { entry, i18n } = this.props;

    // Give the browser a microtask to upgrade child custom elements
    await nextMicrotask();

    // Use valueChallenge from entry if present, otherwise undefined
    const valueChallengeToUse = entry.valueChallenge;
    let isNewValueChallenge = false;
    if (!valueChallengeToUse) {
      isNewValueChallenge = true;
    }
    // Determine allowed values for value-challenge selection from the passed-in growthArea prop
    let allowedValues: string[] | undefined;
    const dataService = DataService.getInstance();
    const areaValueMap = await dataService.getAreaValueMap();
    const area: keyof typeof areaValueMap = (this.props.growthArea ??
      (typeof localStorage !== 'undefined'
        ? (localStorage.getItem('settings:growthArea') ?? 'area-none')
        : 'area-none')) as keyof typeof areaValueMap;
    if (area && areaValueMap[area]) {
      const vals = areaValueMap[area];
      if (Array.isArray(vals)) allowedValues = vals as string[];
    }

    const built = await getJournalDayTemplates(this.props.i18n, valueChallengeToUse, allowedValues);
    if (!built) return;
    this.valueChallenge = built.valueChallenge;

    // If a new valueChallenge was generated, persist it (but only if not readonly)
    if (!this.props.readonly && isNewValueChallenge && this.valueChallenge) {
      entry.valueChallenge = this.valueChallenge;
      this.dispatchEvent(
        new CustomEvent('value-challenge-change', {
          detail: { valueChallenge: this.valueChallenge },
          bubbles: true,
          composed: true,
        }),
      );
    }

    const { morning, midday, evening, accountability, log: logTemplate } = built.templates;

    // Build a synthetic ISectionState for the log from entry.log (string)
    const logQuestionId = logTemplate.questions[0]?.id ?? 'journal-entry-text';
    const logState: ISectionState = entry.journalLog ?? {
      templateId: logTemplate.id,
      kind: logTemplate.kind,
      responses: [
        {
          questionId: logQuestionId,
          ...(entry.log ? { response: { kind: 'rich-text' as const, value: entry.log } } : {}),
        },
      ],
    };

    const rows: Array<{
      selector: string;
      template: ISectionTemplate;
      getState: () => ISectionState | undefined;
      setState: (s: ISectionState) => void;
    }> = [
      {
        selector: '#sec-morning',
        template: morning,
        getState: () => entry.morningIntention,
        setState: (s) => {
          entry.morningIntention = s;
        },
      },
      {
        selector: '#sec-midday',
        template: midday,
        getState: () => entry.middayCheckin,
        setState: (s) => {
          entry.middayCheckin = s;
        },
      },
      {
        selector: '#sec-evening',
        template: evening,
        getState: () => entry.eveningReflection,
        setState: (s) => {
          entry.eveningReflection = s;
        },
      },
      {
        selector: '#sec-accountability',
        template: accountability,
        getState: () => entry.accountability,
        setState: (s) => {
          entry.accountability = s;
        },
      },
      {
        selector: '#sec-log',
        template: logTemplate,
        getState: () => logState,
        setState: (s) => {
          entry.journalLog = s;
          // Also keep entry.log in sync for backward compatibility
          const logResponse = s.responses.find((r) => r.questionId === logQuestionId);
          if (logResponse?.response?.kind === 'rich-text') {
            entry.log = logResponse.response.value;
          }
        },
      },
    ];

    for (const row of rows) {
      const el = this.shadowRoot.querySelector(row.selector);
      if (!el) continue;
      await whenUpgraded(el, 'journal-section');

      const state = row.getState() ?? emptySectionState(row.template);
      row.setState(state);

      const journalSection = el as JournalSection;
      journalSection.props.i18n = i18n;
      journalSection.props.template = row.template;
      journalSection.props.state = state;
      journalSection.props.readonly = this.props.readonly;
      journalSection.render();
    }

    // Default the log section to open
    const logSection = this.shadowRoot.querySelector('#sec-log') as JournalSection | null;
    if (logSection) {
      logSection.setOpen(true);
    }
  }
}

customElements.define(JournalDay.tag, JournalDay);
