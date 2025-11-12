import { BaseFormComponent } from '../BaseFormComponent';
import type { FieldMapping } from '../BaseFormComponent';
import IndexedDbDataService from '../../data/IndexedDbDataService';
import type { IEveningCheckinData } from '../../interfaces';
import type { EveningCheckinProps, EveningCheckinEvents } from '../../models';
import styles from 'bundle-text:./EveningCheckin.css';
import templateHtml from 'bundle-text:./EveningCheckin.pug';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

export class EveningCheckin extends BaseFormComponent<EveningCheckinProps, EveningCheckinEvents> {
  private hasExistingCheckin = false;
  private existingData: IEveningCheckinData | null = null;
  private targetDate: string | null = null;

  private readonly fieldMappings = [
    { selector: '#what-went-well', propName: 'what_went_well' },
    { selector: '#defensive-moments', propName: 'defensive_moments' },
    { selector: '#better-response', propName: 'better_response' },
    { selector: '#empathy-practice', propName: 'empathy_practice' },
    { selector: '#small-win', propName: 'small_win' },
  ];

  constructor() {
    super(
      () => templateHtml,
      {
        what_went_well: '',
        defensive_moments: '',
        better_response: '',
        empathy_practice: '',
        small_win: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        submitButtonText: 'Save Evening Reflection',
        loadingClass: '',
        whatWentWellQuestion: 'What went well today?',
        defensiveMomentsQuestion: 'When did I feel defensive, superior or dismissive?',
        empathyPracticeQuestion: 'How did I practice empathy today?',
        smallWinQuestion: 'One small win I want to celebrate',
        coreValue: '',
        coreValueLower: '',
        intention: '',
      },
      [styles],
    );

    // Load today's questions and reflection on mount
    this.loadCheckin();
  }

  render(): void {
    super.render();
    this.updateFormValues(this.fieldMappings);
    this.updateHeaderValues('#evening-header', {
      title: 'Evening Integration',
      description: 'Reflect on your day and integrate your learnings',
      coreValue: this.props.coreValue,
      intention: this.props.intention,
    });
    this.updateTipsContent();
  }

  private updateTipsContent(): void {
    if (!this.shadowRoot) return;

    // Update the list items in the reflection tips
    const tips = this.shadowRoot.querySelector('reflection-tips');
    if (!tips) return;

    const listItems = tips.querySelectorAll('li');
    if (listItems.length < 5) return;

    // Update specific list items with the core value
    const coreValue = this.props.coreValueLower || this.props.coreValue.toLowerCase();
    if (!coreValue) return;

    // First item: "End your day by acknowledging your growth in {coreValue}"
    listItems[0].textContent = `End your day by acknowledging your growth in ${coreValue}`;

    // Third item: "Tomorrow is a fresh opportunity to practice {coreValue}"
    listItems[2].textContent = `Tomorrow is a fresh opportunity to practice ${coreValue}`;
  }

  protected updateFormValues(fieldMappings: FieldMapping[]): void {
    // Call parent implementation
    super.updateFormValues(fieldMappings);
  }

  protected updateSubmitButton(): void {
    this.props.submitButtonText = this.props.isLoading ? 'Saving...' : 'Save Evening Reflection';
    super.updateSubmitButton();
  }

  updateWhatWentWell = this.createFieldUpdater('what_went_well');
  updateDefensiveMoments = this.createFieldUpdater('defensive_moments');
  updateBetterResponse = this.createFieldUpdater('better_response');
  updateEmpathyPractice = this.createFieldUpdater('empathy_practice');
  updateSmallWin = this.createFieldUpdater('small_win');

  private async loadCheckin(date?: string): Promise<void> {
    try {
      const when = date || new Date().toISOString().split('T')[0];
      const idb = new IndexedDbDataService();

      // Load questions for that date first from IDB
      const questionsData = await idb.getEveningQuestions(when);
      const qObj = (questionsData as Record<string, string> | null) || null;
      this.props.whatWentWellQuestion = qObj?.what_went_well || 'What went well today?';
      this.props.defensiveMomentsQuestion =
        qObj?.defensive_moments || 'When did I feel defensive, superior or dismissive?';
      this.props.empathyPracticeQuestion =
        qObj?.empathy_practice || 'How did I practice empathy today?';
      this.props.smallWinQuestion = qObj?.small_win || 'One small win I want to celebrate';
      this.props.coreValue = qObj?.core_value || this.props.coreValue;
      this.props.coreValueLower = this.props.coreValue.toLowerCase();
      this.props.intention = qObj?.intention || this.props.intention;

      // Then try loading an existing evening reflection for the date
      const data = await idb.getEveningReflection(when);
      if (data) {
        const d = data;
        this.hasExistingCheckin = true;
        this.existingData = {
          what_went_well: d.what_went_well,
          defensive_moments: d.defensive_moments,
          better_response: d.better_response,
          empathy_practice: d.empathy_practice,
          small_win: d.small_win,
        };
        this.props.what_went_well = d.what_went_well || '';
        this.props.defensive_moments = d.defensive_moments || '';
        this.props.better_response = d.better_response || '';
        this.props.empathy_practice = d.empathy_practice || '';
        this.props.small_win = d.small_win || '';
        this.updateFormValues(this.fieldMappings);
      }

      // Update header with date
      this.updateHeaderValues('#evening-header', {
        title: 'Evening Integration',
        description: `Reflect and integrate your learnings from ${this.formatDate(when)}`,
        coreValue: this.props.coreValue,
        intention: this.props.intention,
        metadata: `<div class="date-label">${this.formatDate(when)}</div>`,
      });

      this.render();
    } catch (error) {
      logger.error('Error loading evening check-in', { error, date });
    }
  }

  async handleSubmit(event: Event): Promise<void> {
    const validationChecker = () => {
      const data = {
        what_went_well: this.props.what_went_well,
        empathy_practice: this.props.empathy_practice,
        small_win: this.props.small_win,
      };
      return !data.what_went_well?.trim() ||
        !data.empathy_practice?.trim() ||
        !data.small_win?.trim()
        ? 'Please fill in all required fields (marked with *)'
        : null;
    };

    const dataBuilder = (): IEveningCheckinData => ({
      what_went_well: this.props.what_went_well,
      defensive_moments: this.props.defensive_moments,
      better_response: this.props.better_response,
      empathy_practice: this.props.empathy_practice,
      small_win: this.props.small_win,
    });

    const apiCall = async (data: IEveningCheckinData) => {
      // Check if we're saving to a historic date
      const today = new Date().toISOString().split('T')[0];
      const idb = new IndexedDbDataService();
      if (this.targetDate && this.targetDate !== today) {
        // For historic dates, include check_date in the evening checkin data
        const dateAwareData = { ...data, check_date: this.targetDate } as unknown as
          | IEveningCheckinData
          | (IEveningCheckinData & { check_date: string });
        return await idb.setEveningReflection(dateAwareData);
      } else {
        // For today, use the regular evening checkin endpoint without check_date
        return await idb.setEveningReflection(data);
      }
    };

    await this.handleFormSubmit(
      event,
      validationChecker,
      dataBuilder,
      apiCall,
      'Evening reflection saved successfully!',
      'evening check-in',
    );

    // Update tracking state after successful submission
    if (this.props.successMessage) {
      this.hasExistingCheckin = true;
      this.existingData = {
        what_went_well: this.props.what_went_well,
        defensive_moments: this.props.defensive_moments,
        better_response: this.props.better_response,
        empathy_practice: this.props.empathy_practice,
        small_win: this.props.small_win,
      };
      const eventData: IEveningCheckinData = {
        ...this.existingData,
      } as IEveningCheckinData;
      this.emit('submit', eventData);
    }
  }

  cancel(): void {
    this.emit('cancel', undefined);
  }

  loadData(data: Partial<IEveningCheckinData>): void {
    this.loadFormData(data, this.fieldMappings);
  }

  public setDate(date: string): void {
    this.targetDate = date;
    this.loadCheckin(date);
  }

  private async loadCheckinForDate(date: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load questions for that date first from IDB
      const idb = new IndexedDbDataService();
      const questionsData = await idb.getEveningQuestions(date);
      const qObj = (questionsData as Record<string, string> | null) || null;
      this.props.whatWentWellQuestion = qObj?.what_went_well || 'What went well today?';
      this.props.defensiveMomentsQuestion =
        qObj?.defensive_moments || 'When did I feel defensive, superior or dismissive?';
      this.props.empathyPracticeQuestion =
        qObj?.empathy_practice || 'How did I practice empathy today?';
      this.props.smallWinQuestion = qObj?.small_win || 'One small win I want to celebrate';
      this.props.coreValue = qObj?.core_value || this.props.coreValue;
      this.props.coreValueLower = this.props.coreValue.toLowerCase();
      this.props.intention = qObj?.intention || this.props.intention;

      if (date === today) {
        // For today, load today's evening reflection from IDB
        const data = await idb.getEveningReflection(today);
        if (data) {
          const d = data;
          this.props.what_went_well = d.what_went_well || '';
          this.props.defensive_moments = d.defensive_moments || '';
          this.props.better_response = d.better_response || '';
          this.props.empathy_practice = d.empathy_practice || '';
          this.props.small_win = d.small_win || '';
          this.hasExistingCheckin = true;
          this.updateFormValues(this.fieldMappings);
        }
      } else {
        // For other dates, try to load the evening reflection from IDB
        const eveningData = await idb.getEveningReflection(date);
        if (eveningData) {
          const d = eveningData;
          this.props.what_went_well = d.what_went_well || '';
          this.props.defensive_moments = d.defensive_moments || '';
          this.props.better_response = d.better_response || '';
          this.props.empathy_practice = d.empathy_practice || '';
          this.props.small_win = d.small_win || '';
          this.hasExistingCheckin = true;
          this.updateFormValues(this.fieldMappings);
        }
      }

      // Update header with date
      this.updateHeaderValues('#evening-header', {
        title: 'Evening Integration',
        description: `Reflect and integrate your learnings from ${this.formatDate(date)}`,
        coreValue: this.props.coreValue,
        intention: this.props.intention,
        metadata: `<div class="date-label">${this.formatDate(date)}</div>`,
      });

      this.render();
    } catch (error) {
      logger.error('Error loading check-in for date', { error, date });
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];

    if (dateStr === today) {
      return 'Today';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

customElements.define('evening-checkin', EveningCheckin);
