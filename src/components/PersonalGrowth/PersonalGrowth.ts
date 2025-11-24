import { BaseComponent } from '../Base/BaseComponent.ts';
import IndexedDbDataService from '../../data/IndexedDbDataService.ts';
import template from 'bundle-text:./PersonalGrowth.pug';
import styles from 'bundle-text:./PersonalGrowth.css';
import { CheckinHeader } from '../CheckinHeader/CheckinHeader.ts';
import { MessageComponent } from '../MessageComponent/MessageComponent.ts';
import type { IPersonalGrowthProps } from './interfaces/IPersonalGrowthProps.ts';
import type {
  IGrowthIntentionData,
  IMiddayCheckinData,
  IEveningCheckinData,
} from '../../interfaces/index.ts';
import { LoggingService } from '@bladeski/logger';
import type { IPersonalGrowthEvents } from './interfaces/IPersonalGrowthEvents.ts';

const logger = LoggingService.getInstance();

export class PersonalGrowth extends BaseComponent<IPersonalGrowthProps, IPersonalGrowthEvents> {
  private selectedDate: string;
  private intentionData: Partial<IGrowthIntentionData> = {};
  private middayData: Partial<IMiddayCheckinData> = {};
  private reflectionData: Partial<IEveningCheckinData> = {};
  private progressData: Record<string, unknown> = {};
  private dynamicQuestions: Record<string, string> = {};
  private isUpdatingDatePicker = false; // Flag to prevent double-triggering
  private isLoadingData = false; // Flag to prevent concurrent data loads
  private listenersSetup = false; // Flag to prevent duplicate event listeners
  private _mountTimeout: number | null = null;
  private _messageTimeout: number | null = null;
  private _hasSavedMorning = false;

  constructor() {
    const templateFn = () => template;
    super(templateFn, {}, [styles]);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.selectedDate = `${year}-${month}-${day}`;
  }

  protected async onMount(): Promise<void> {
    this.setupHeader();
    await this.loadTodayData();
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Wait for next tick to ensure DOM is rendered
    this._mountTimeout = window.setTimeout(() => {
      this.onMount();
    }, 0);
  }

  private setupHeader(): void {
    const header = this.shadowRoot?.querySelector('#personal-growth-header') as CheckinHeader;
    if (header) {
      header.setAttribute('data-prop:title', 'Personal Growth Journal');
      header.setAttribute('data-prop:date', this.selectedDate);

      header.addEventListener('cancel', () => {
        this.handleClose();
      });

      header.addEventListener('dateChange', ((e: CustomEvent) => {
        this.selectedDate = e.detail.date;
        this.loadDataForDate(this.selectedDate);
      }) as EventListener);
    }
  }

  private handleClose(): void {
    this.emit('cancel', undefined);
  }

  private setupEventListeners(): void {
    if (this.listenersSetup) return; // Prevent duplicate listeners
    this.listenersSetup = true;

    // Date picker
    const datePicker = this.shadowRoot?.querySelector('#journal-date') as HTMLInputElement;
    if (datePicker) {
      datePicker.addEventListener('change', () => {
        // Ignore programmatic changes from updateDatePicker
        if (this.isUpdatingDatePicker) return;

        this.selectedDate = datePicker.value;
        this.loadDataForDate(this.selectedDate);
      });
    }
  }

  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public async goToToday(): Promise<void> {
    if (this.isLoadingData) return;
    this.selectedDate = this.formatDateToISO(new Date());
    this.updateDatePicker();
    await this.loadDataForDate(this.selectedDate);
  }

  public async goToPrevious(): Promise<void> {
    if (this.isLoadingData) return;
    // Parse the date as local date (YYYY-MM-DD)
    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    this.selectedDate = this.formatDateToISO(date);
    this.updateDatePicker();
    await this.loadDataForDate(this.selectedDate);
  }

  public async goToNext(): Promise<void> {
    if (this.isLoadingData) return;
    // Parse the date as local date (YYYY-MM-DD)
    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    this.selectedDate = this.formatDateToISO(date);
    this.updateDatePicker();
    await this.loadDataForDate(this.selectedDate);
  }

  private updateDatePicker(): void {
    const datePicker = this.shadowRoot?.querySelector('#journal-date') as HTMLInputElement;
    if (datePicker) {
      this.isUpdatingDatePicker = true;
      datePicker.value = this.selectedDate;
      this.isUpdatingDatePicker = false;
    }
    this.updateHeader();
  }

  private updateHeader(): void {
    const header = this.shadowRoot?.querySelector('#personal-growth-header') as CheckinHeader;
    if (header) {
      header.setAttribute('data-prop:date', this.selectedDate);
    }
  }

  private async loadTodayData(): Promise<void> {
    const today = this.formatDateToISO(new Date());
    await this.loadDataForDate(today);
  }

  private async loadDataForDate(date: string): Promise<void> {
    if (this.isLoadingData) {
      logger.warning('Data load already in progress, skipping');
      return;
    }

    this.isLoadingData = true;

    try {
      // Clear old data first to prevent stale data from showing
      this.intentionData = {};
      this.middayData = {};
      this.reflectionData = {};
      this.progressData = {};
      this.dynamicQuestions = {};

      // Intentions (from IndexedDB)
      try {
        const idb = new IndexedDbDataService();
        const intent = await idb.getGrowthIntention(date);
        this.intentionData = intent || {};
      } catch (err) {
        logger.warning('Failed to load intentions from IDB', { err });
        this.intentionData = {};
      }

      // Midday Check-in
      try {
        const idb = new IndexedDbDataService();
        const midday = await idb.getMiddayCheckin(date);
        this.middayData = midday || {};

        // Try to load any dynamic question stored alongside midday entries
        const middayQResp = await idb.getMiddayQuestions(date);
        const mqObj = (middayQResp as Record<string, string> | null) || null;
        if (mqObj && mqObj.midday_question)
          this.dynamicQuestions.midday_question = mqObj.midday_question;
      } catch (err) {
        logger.warning('Failed to load midday data/questions from IDB', { err });
      }

      // Evening Check-in
      try {
        const idb = new IndexedDbDataService();
        const evening = await idb.getEveningReflection(date);
        this.reflectionData = evening || {};

        // load any dynamic questions stored with evening entries
        const eveningQResp = await idb.getEveningQuestions(date);
        const eqObj = (eveningQResp as Record<string, string> | null) || null;
        if (eqObj) {
          this.dynamicQuestions.what_went_well =
            typeof eqObj.what_went_well === 'string'
              ? eqObj.what_went_well
              : 'What went well today?';
          this.dynamicQuestions.defensive_moments =
            typeof eqObj.defensive_moments === 'string'
              ? eqObj.defensive_moments
              : 'When did I feel defensive, superior or dismissive?';
          this.dynamicQuestions.empathy_practice =
            typeof eqObj.empathy_practice === 'string'
              ? eqObj.empathy_practice
              : 'How did I practice empathy today?';
          this.dynamicQuestions.small_win =
            typeof eqObj.small_win === 'string'
              ? eqObj.small_win
              : 'One small win I want to celebrate';
        }
      } catch (err) {
        logger.warning('Failed to load evening data/questions from IDB', { err });
      }

      // Check if there's a saved morning checkin for this date (actual submitted checkin)
      try {
        const idb2 = new IndexedDbDataService();
        const morningRec = await idb2.getMorningCheckin(date);
        this._hasSavedMorning = !!morningRec;
      } catch (e) {
        this._hasSavedMorning = false;
      }

      // Debug: log the loaded payloads so we can see why entries may appear present
      logger.debug('[DEBUG] PersonalGrowth loadDataForDate:', {
        date,
        intentionData: this.intentionData,
        middayData: this.middayData,
        reflectionData: this.reflectionData,
      });

      // Update header with contextual metadata once intention data is loaded
      this.updateHeaderContent();

      this.displayEntries();
    } catch (error) {
      logger.error('Error loading data', { error });
    } finally {
      this.isLoadingData = false;
    }
  }

  private hasAnyData(obj: Record<string, unknown> | undefined): boolean {
    if (!obj) return false;

    const isMeaningful = (v: unknown): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (typeof v === 'number') return true;
      if (Array.isArray(v)) return v.length > 0 && v.some(isMeaningful);
      if (typeof v === 'object') {
        // check object has any meaningful nested field
        const r = v as Record<string, unknown>;
        return Object.keys(r).some((k) => isMeaningful(r[k]));
      }
      return false;
    };

    return Object.values(obj).some(isMeaningful);
  }

  private displayEntries(): void {
    // Consider the morning 'Complete' only if a saved morning checkin exists.
    // The presence of intention/template data alone does not imply the user
    // submitted the morning checkin for that date.
    const hasIntention = !!this._hasSavedMorning;
    const hasMidday = this.hasAnyData(this.middayData);
    const hasReflection = this.hasAnyData(this.reflectionData);
    const hasMetrics = this.progressData && Object.keys(this.progressData).length > 0;

    // Update summary status
    const morningStatus = this.shadowRoot?.querySelector('#morning-status');
    if (morningStatus) {
      morningStatus.textContent = hasIntention ? 'Complete' : 'Not set';
      morningStatus.classList.toggle('has-entry', !!hasIntention);
    }

    const middayStatus = this.shadowRoot?.querySelector('#midday-status');
    if (middayStatus) {
      middayStatus.textContent = hasMidday ? 'Complete' : 'Not set';
      middayStatus.classList.toggle('has-entry', !!hasMidday);
    }

    const eveningStatus = this.shadowRoot?.querySelector('#evening-status');
    if (eveningStatus) {
      eveningStatus.textContent = hasReflection ? 'Complete' : 'Not set';
      eveningStatus.classList.toggle('has-entry', !!hasReflection);
    }

    // Show/hide sections
    const emptyState = this.shadowRoot?.querySelector('#empty-state');
    const intentionSection = this.shadowRoot?.querySelector('#intention-section');
    const middaySection = this.shadowRoot?.querySelector('#midday-section');
    const reflectionSection = this.shadowRoot?.querySelector('#reflection-section');
    const metricsSection = this.shadowRoot?.querySelector('#metrics-section');

    if (!hasIntention && !hasMidday && !hasReflection) {
      emptyState?.classList.add('active');
      intentionSection?.classList.add('hidden');
      middaySection?.classList.add('hidden');
      reflectionSection?.classList.add('hidden');
      metricsSection?.classList.add('hidden');
    } else {
      emptyState?.classList.remove('active');

      if (hasIntention) {
        intentionSection?.classList.remove('hidden');
        this.displayIntentionData();
      } else {
        intentionSection?.classList.add('hidden');
      }

      if (hasMidday) {
        middaySection?.classList.remove('hidden');
        this.displayMiddayData();
      } else {
        middaySection?.classList.add('hidden');
      }

      if (hasReflection) {
        reflectionSection?.classList.remove('hidden');
        this.displayReflectionData();
      } else {
        reflectionSection?.classList.add('hidden');
      }

      if (hasMetrics) {
        metricsSection?.classList.remove('hidden');
        this.displayMetrics();
      } else {
        metricsSection?.classList.add('hidden');
      }
    }
  }

  private displayIntentionData(): void {
    const date = this.formatDate(this.selectedDate);
    this.setText('#intention-date', date);
    this.setText('#core-value-display', this.intentionData.core_value || '—');
    this.setText('#morning-intention-display', this.intentionData.intention || '—');
    this.setText(
      '#micro-practice-display',
      this.formatMicroPractice(this.intentionData.focus) || '—',
    );
    this.setText(
      '#affirmation-display',
      String(((this.intentionData as Record<string, unknown>).affirmation as string) || '—'),
    );
  }

  private updateHeaderContent(): void {
    const header = this.shadowRoot?.querySelector('#personal-growth-header') as CheckinHeader;
    if (!header) return;
    const metadataHtml = `<div class="header-meta"><span class="date-label">${this.formatDate(this.selectedDate)}</span></div>`;
    header.updateHeader({
      title: 'Personal Growth Journal',
      description:
        'Review your morning intention, midday reflection and evening integration entries.',
      coreValue: this.intentionData.core_value || '',
      intention: this.intentionData.intention || '',
      metadata: metadataHtml,
    });
  }

  private displayMiddayData(): void {
    const date = this.formatDate(this.selectedDate);
    this.setText('#midday-date', date);
    this.setText('#defensive-moment-display', this.middayData.defensive_moment || '—');
    this.setText('#initial-thought-display', this.middayData.initial_thought || '—');
    this.setText('#healthier-reframe-midday-display', this.middayData.healthier_reframe || '—');
  }

  private displayReflectionData(): void {
    const date = this.formatDate(this.selectedDate);
    this.setText('#reflection-date', date);
    this.setText(
      '#what-went-well-question',
      this.dynamicQuestions.what_went_well || 'What went well today?',
    );
    this.setText('#what-went-well-display', this.reflectionData.what_went_well || '—');
    this.setText(
      '#defensive-moments-question',
      this.dynamicQuestions.defensive_moments ||
        'When did I feel defensive, superior or dismissive?',
    );
    this.setText('#defensive-moments-display', this.reflectionData.defensive_moments || '—');
    this.setText('#better-response-display', this.reflectionData.better_response || '—');
    this.setText(
      '#empathy-practice-question',
      this.dynamicQuestions.empathy_practice || 'How did I practice empathy today?',
    );
    this.setText('#empathy-practice-display', this.reflectionData.empathy_practice || '—');
    this.setText(
      '#small-win-question',
      this.dynamicQuestions.small_win || 'One small win I want to celebrate',
    );
    this.setText('#small-win-display', this.reflectionData.small_win || '—');
  }

  // Remove scaffold-only values so completion logic only counts real user content
  private filterReflectionForActualData(): Record<string, unknown> {
    const data = { ...this.reflectionData } as Record<string, unknown>;
    delete data.entry_date; // not content
    const questionPrompts = [
      this.dynamicQuestions.what_went_well,
      this.dynamicQuestions.defensive_moments,
      this.dynamicQuestions.empathy_practice,
      this.dynamicQuestions.small_win,
    ].filter(Boolean);
    const promptSet = new Set(questionPrompts.map((p) => (p || '').trim()));
    Object.keys(data).forEach((key) => {
      const raw = data[key] || '';
      const val = String(raw).toString().trim();
      if (!val || promptSet.has(val)) {
        delete data[key];
      }
    });
    return data;
  }

  private displayMetrics(): void {
    this.setText('#apologies-display', String(this.progressData.apologies_given || 0));
    this.setText('#pauses-display', String(this.progressData.pauses_before_reacting || 0));
    this.setText('#empathy-moments-display', String(this.progressData.empathy_moments || 0));
    this.setText(
      '#defensive-reactions-display',
      String(this.progressData.defensive_reactions || 0),
    );
    this.setText('#vulnerability-display', String(this.progressData.vulnerability_shared || 0));
    this.setText('#empathy-rating-display', `${this.progressData.self_rating_empathy || 5}/10`);
    this.setText(
      '#responsibility-rating-display',
      `${this.progressData.self_rating_responsibility || 5}/10`,
    );
  }

  private setText(selector: string, text: string): void {
    const element = this.shadowRoot?.querySelector(selector);
    if (element) {
      element.textContent = text;
      element.classList.toggle('empty', text === '—' || !text);
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatMicroPractice(value: string | undefined): string {
    if (!value) return '—';

    const practices: Record<string, string> = {
      pause_3_breaths: 'Pause for 3 breaths before responding',
      ask_question: 'Ask a clarifying question instead of defending',
      acknowledge_feelings: "Acknowledge the other person's feelings first",
      say_sorry: "Apologize when I'm wrong",
      share_vulnerability: 'Share a moment of vulnerability',
    };

    return practices[value] || value;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageId = type === 'success' ? '#success-message' : '#error-message';
    const messageEl = this.shadowRoot?.querySelector(messageId) as MessageComponent;
    if (messageEl) {
      messageEl.setAttribute('data-prop:message', message);
      messageEl.setAttribute('data-prop:visible', 'true');

      if (this._messageTimeout != null) clearTimeout(this._messageTimeout);
      this._messageTimeout = window.setTimeout(() => {
        messageEl.setAttribute('data-prop:visible', 'false');
        this._messageTimeout = null;
      }, 3000);
    }
  }

  protected onDisconnect(): void {
    if (this._mountTimeout != null) {
      clearTimeout(this._mountTimeout);
      this._mountTimeout = null;
    }
    if (this._messageTimeout != null) {
      clearTimeout(this._messageTimeout);
      this._messageTimeout = null;
    }
  }

  public render(): void {
    super.render();

    if (!this.shadowRoot || !this.shadowRoot.innerHTML) return;

    this.setupEventListeners();
    this.updateDatePicker();
    this.displayEntries();
  }

  public getCurrentData() {
    return {
      intention: this.intentionData,
      midday: this.middayData,
      reflection: this.reflectionData,
      progress: this.progressData,
      dynamicQuestions: this.dynamicQuestions,
      date: this.selectedDate,
    };
  }

  public setDate(date: string): void {
    this.selectedDate = date;
    this.updateDatePicker();
    this.loadDataForDate(date);
  }

  public editMorningCheckin(): void {
    this.emit('editMorning', { date: this.selectedDate });
  }

  public editMiddayCheckin(): void {
    this.emit('editMidday', { date: this.selectedDate });
  }

  public editEveningCheckin(): void {
    this.emit('editEvening', { date: this.selectedDate });
  }
}

customElements.define('personal-growth', PersonalGrowth);
