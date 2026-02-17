import type { IJournalEntry, ISectionTemplate, ISectionState } from '../models/index.ts';
import type { I18n } from '../i18n/i18n.ts';

declare global {
  interface HTMLJournalDayElement extends HTMLElement {
    entry?: IJournalEntry;
    i18n?: I18n;
    readonly?: boolean;
  }

  interface HTMLJournalLogElement extends HTMLElement {
    log?: string;
    i18n?: I18n;
    readonly?: boolean;
  }

  interface HTMLJournalSectionElement extends HTMLElement {
    i18n?: I18n;
    template?: ISectionTemplate;
    state?: ISectionState;
    readonly?: boolean;
  }

  interface HTMLElementTagNameMap {
    'journal-day': HTMLJournalDayElement;
    'journal-log': HTMLJournalLogElement;
    'journal-section': HTMLJournalSectionElement;
  }
}

export {};
