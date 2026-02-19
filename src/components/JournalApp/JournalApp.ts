import { I18n } from '../../i18n/i18n.ts';
import { defaultI18n, loadRuntimeI18n } from '../../i18n/runtime.ts';
import {
  IJournalEntry,
  ResponseValue,
  SectionKind,
  ValueChallengePair,
} from '../../models/index.ts';
import { JournalService } from '../../services/journal.service.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./JournalApp.pug';
import styles from 'bundle-text:./JournalApp.css';
import { JournalDay } from '../index.ts';
import { getGrowthAreas, getJournalDayTemplates } from '../../helpers/helpers.ts';
import { JournalDB } from '../../storage/indexeddb.ts';
import DataService from '../../services/data.service.ts';

export interface JournalAppProps {
  date: string;
  entry?: IJournalEntry;
  i18n: I18n;
  loading: boolean;
  error?: string;
  [key: string]: unknown;
}

export class JournalApp extends BaseComponent<JournalAppProps> {
  static tag = 'journal-app';
  private service = new JournalService();
  private today = new Date().toISOString().slice(0, 10);
  private SETTINGS_KEY = 'settings:growthArea';
  private db: JournalDB | null = null;
  private dataService = DataService.getInstance();

  private logSaveTimer: number | undefined;
  observedAttributes = ['date', 'entry', 'i18n', 'loading', 'error'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, undefined, [styles]);

    this.props.date = new Date().toISOString().slice(0, 10);
    this.props.loading = true;
    // Default quickly; we'll swap to runtime (IDB/fetched) dictionary on connect.
    this.props.i18n = defaultI18n;
  }

  connectedCallback() {
    super.connectedCallback();
    this.start();
  }

  private async start() {
    // Load best dictionary for browser language and cache in IndexedDB.
    // Do not block app entirely if this fails.
    try {
      const runtime = await loadRuntimeI18n();
      this.setProp('i18n', runtime);
    } catch {
      // ignore i18n load errors
    }
    // Try to initialize optional JournalDB for storing small app settings
    try {
      const db = new JournalDB();
      await db.init();
      this.db = db;
    } catch {
      this.db = null;
    }

    await this.bootstrap();
  }

  private async bootstrap() {
    try {
      const entry = await this.service.ensureDay(this.props.date);

      // 🔥 SET PROPS BEFORE ANY RENDER CALL
      this.setProp('entry', entry);
      this.setProp('loading', false);
      const readonly = this.props.date < this.today;
      this.props.readonly = readonly;

      const growthAreas = await getGrowthAreas(this.props.i18n);
      this.shadowRoot?.querySelector('#setting-growth-area')?.replaceChildren(
        ...growthAreas.map((area) => {
          const option = document.createElement('option');
          option.value = area.id;
          option.textContent = area.label;
          return option;
        }),
      );
      // Restore persisted growth area selection, prefer IndexedDB when available
      const settingEl = this.shadowRoot?.querySelector(
        '#setting-growth-area',
      ) as HTMLSelectElement | null;
      let savedGrowthArea: string | null = null;
      if (this.db) {
        try {
          const val = await this.db.getSetting(this.SETTINGS_KEY);
          savedGrowthArea = typeof val === 'string' ? val : null;
        } catch {
          savedGrowthArea = null;
        }
      }
      if (!savedGrowthArea && typeof localStorage !== 'undefined') {
        savedGrowthArea = localStorage.getItem(this.SETTINGS_KEY);
      }
      if (settingEl && savedGrowthArea) settingEl.value = savedGrowthArea;

      this.showContent();

      // hydrate <journal-day>
      const day = this.shadowRoot?.querySelector('#day') as JournalDay | null;
      if (day && this.props.entry) {
        day.props.entry = this.props.entry;
        day.props.i18n = this.props.i18n;
        // pass growth area (default to 'area-none' when unset)
        const growthAreaToPass = savedGrowthArea ?? 'area-none';
        day.props.growthArea = growthAreaToPass;
        day.props.readonly = readonly;
        day.render();

        day.addEventListener('log-change', (evt: Event) => {
          const e = evt as CustomEvent<{ value: string }>;
          const updated: IJournalEntry = {
            ...this.props.entry!,
            log: e.detail.value,
          };
          this.setProp('entry', updated);
          if (this.logSaveTimer) window.clearTimeout(this.logSaveTimer);
          this.logSaveTimer = window.setTimeout(async () => {
            await this.service.save(updated);
          }, 500);
        });

        day.addEventListener('value-challenge-change', (evt: Event) => {
          const e = evt as CustomEvent<{ valueChallenge: ValueChallengePair }>;
          const updated: IJournalEntry = {
            ...this.props.entry!,
            valueChallenge: e.detail.valueChallenge,
          };
          this.setProp('entry', updated);
          if (this.logSaveTimer) window.clearTimeout(this.logSaveTimer);
          this.logSaveTimer = window.setTimeout(async () => {
            await this.service.save(updated);
          }, 500);
        });

        day.addEventListener('section-answer', async (evt: Event) => {
          const e = evt as CustomEvent<{
            sectionKind: SectionKind;
            questionId: string;
            value: ResponseValue;
          }>;
          const updated = await this.service.applyAnswer(this.props.entry!, e.detail);
          this.setProp('entry', updated);
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.setProp('error', message);
      this.setProp('loading', false);
      this.updateErrorVisibility();
    }
  }

  private updateErrorVisibility() {
    if (!this.shadowRoot) return;
    const hasError = !!this.props.error;
    this.shadowRoot.querySelector('#error')?.classList.toggle('hidden', !hasError);
  }

  private showContent() {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelector('#loading')?.classList.add('hidden');
    this.shadowRoot.querySelector('#content')?.classList.remove('hidden');
  }

  override render() {
    super.render();

    this.updateErrorVisibility();

    // ensure content is shown whenever loading = false
    if (!this.props.loading) this.showContent();

    // Date picker logic
    if (this.shadowRoot) {
      const dateInput = this.shadowRoot.querySelector('#date-picker') as HTMLInputElement | null;
      const prevBtn = this.shadowRoot.querySelector('#prev-day') as HTMLButtonElement | null;
      const nextBtn = this.shadowRoot.querySelector('#next-day') as HTMLButtonElement | null;
      if (dateInput) {
        // never allow selecting a date beyond today
        dateInput.max = this.today;
        dateInput.value = this.props.date;
        dateInput.onchange = async () => {
          const newDate = dateInput.value;
          if (newDate && newDate !== this.props.date) {
            // clamp to today
            const clamped = newDate > this.today ? this.today : newDate;
            this.setProp('loading', true);
            this.setProp('date', clamped);
            // Set readonly prop for journal-day (use clamped value)
            const readonly = clamped < this.today;
            const day = this.shadowRoot?.querySelector('#day') as JournalDay | null;
            if (day) day.props.readonly = readonly;
            // immediately reflect the clamped value in the input and buttons
            dateInput.value = clamped;
            if (nextBtn) nextBtn.disabled = clamped >= this.today;
            if (prevBtn) prevBtn.disabled = false;
            await this.bootstrap();
          }
        };
        // update next/prev button disabled state
        if (nextBtn) nextBtn.disabled = dateInput.value >= this.today;
        if (prevBtn) prevBtn.disabled = false;
      }

      if (prevBtn) {
        prevBtn.onclick = async () => {
          const current = this.props.date || this.today;
          const dt = new Date(current + 'T00:00:00');
          dt.setDate(dt.getDate() - 1);
          const newDate = dt.toISOString().slice(0, 10);
          this.setProp('loading', true);
          this.setProp('date', newDate);
          const day = this.shadowRoot?.querySelector('#day') as JournalDay | null;
          if (day) day.props.readonly = newDate < this.today;
          // update UI immediately
          if (dateInput) dateInput.value = newDate;
          if (nextBtn) nextBtn.disabled = newDate >= this.today ? true : false;
          if (prevBtn) prevBtn.disabled = false;
          await this.bootstrap();
        };
      }

      if (nextBtn) {
        nextBtn.onclick = async () => {
          const current = this.props.date || this.today;
          const dt = new Date(current + 'T00:00:00');
          dt.setDate(dt.getDate() + 1);
          let newDate = dt.toISOString().slice(0, 10);
          // clamp to today
          if (newDate > this.today) newDate = this.today;
          // if unchanged, do nothing
          if (newDate === this.props.date) return;
          this.setProp('loading', true);
          this.setProp('date', newDate);
          const day = this.shadowRoot?.querySelector('#day') as JournalDay | null;
          if (day) day.props.readonly = newDate < this.today;
          // update UI immediately
          if (dateInput) dateInput.value = newDate;
          if (nextBtn) nextBtn.disabled = newDate >= this.today;
          if (prevBtn) prevBtn.disabled = false;
          await this.bootstrap();
        };
      }
    }
  }

  private openSettings() {
    (this.shadowRoot?.getElementById('settings') as HTMLDialogElement)?.showModal();
  }

  private closeSettings() {
    (this.shadowRoot?.getElementById('settings') as HTMLDialogElement)?.close();
  }

  private async onSettingChange(e: Event) {
    const sel = e.target as HTMLSelectElement | null;
    if (!sel) return;
    const areaValueMap = await this.dataService.getAreaValueMap();
    // Prefer IndexedDB settings store when available, fallback to localStorage
    const applySettingAndMaybeUpdate = async (
      value: keyof typeof areaValueMap,
      persistToLocal = false,
    ) => {
      const day = this.shadowRoot?.querySelector('#day') as JournalDay | null;
      if (day) day.props.growthArea = value;
      if (day) day.render();

      // If current day is today, ensure the entry's valueChallenge is valid for the selected area
      if (this.props.date === this.today && this.props.entry) {
        const allowed = areaValueMap[value];
        const allowedValues: string[] | undefined = Array.isArray(allowed)
          ? (allowed as string[])
          : undefined;
        const currentValue = this.props.entry.valueChallenge?.value;
        if (allowedValues && (!currentValue || !allowedValues.includes(currentValue))) {
          const built = await getJournalDayTemplates(this.props.i18n, undefined, allowedValues);
          if (built?.valueChallenge) {
            const updated: IJournalEntry = {
              ...this.props.entry!,
              valueChallenge: built.valueChallenge,
            };
            this.setProp('entry', updated);
            if (day) day.props.entry = updated;
            try {
              await this.service.save(updated);
            } catch {
              // ignore save errors
            }
          }
        }
      }

      if (persistToLocal) {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(this.SETTINGS_KEY, value);
        } catch {
          // ignore
        }
      }
    };

    if (this.db) {
      try {
        await this.db.putSetting(this.SETTINGS_KEY, sel.value);
        await applySettingAndMaybeUpdate(sel.value as keyof typeof areaValueMap);
        return;
      } catch {
        // fall through to localStorage fallback
      }
    }

    // Fallback: persist to localStorage and apply setting
    await applySettingAndMaybeUpdate(sel.value as keyof typeof areaValueMap, true);
  }
}

customElements.define(JournalApp.tag, JournalApp);
