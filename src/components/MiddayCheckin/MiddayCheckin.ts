import { BaseFormComponent } from '../BaseFormComponent';
import IndexedDbDataService from '../../data/IndexedDbDataService';
import type { IMiddayCheckinData } from '../../interfaces';
import type { MiddayCheckinProps, MiddayCheckinEvents } from '../../models';
import styles from 'bundle-text:./MiddayCheckin.css';
import templateHtml from 'bundle-text:./MiddayCheckin.pug';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

export class MiddayCheckin extends BaseFormComponent<MiddayCheckinProps, MiddayCheckinEvents> {
  private hasExistingCheckin = false;
  private existingData: IMiddayCheckinData | null = null;
  private targetDate: string | null = null;
  private daySpecificQuestion = '';
  private coreValue = '';
  private intention = '';

  private readonly fieldMappings = [
    { selector: '#defensive-moment', propName: 'defensive_moment' },
    { selector: '#initial-thought', propName: 'initial_thought' },
    { selector: '#healthier-reframe', propName: 'healthier_reframe' },
  ];

  constructor() {
    super(
      () => templateHtml,
      {
        defensive_moment: '',
        initial_thought: '',
        healthier_reframe: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        submitButtonText: 'Save Midday Reflection',
        loadingClass: '',
        daySpecificQuestion: '',
        coreValue: '',
        coreValueLower: '',
        intention: '',
      },
      [styles],
    );

    // Load today's checkin/questions on mount
    this.loadCheckin();
  }

  render(): void {
    super.render();
    this.updateFormValues(this.fieldMappings);
    this.updateHeaderValues('#midday-header', {
      title: 'Midday Reflection',
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

    // Second item: "Your intention for today is about {coreValue}"
    listItems[1].textContent = `Your intention for today is about ${coreValue}`;

    // Fourth item: "Ask yourself: "How can I practice {coreValue} in this moment?""
    listItems[3].textContent = `Ask yourself: "How can I practice ${coreValue} in this moment?"`;
  }

  protected updateSubmitButton(): void {
    this.props.submitButtonText = this.props.isLoading ? 'Saving...' : 'Save Midday Reflection';
    super.updateSubmitButton();
  }

  updateDefensiveMoment = this.createFieldUpdater('defensive_moment');
  updateInitialThought = this.createFieldUpdater('initial_thought');
  updateHealthierReframe = this.createFieldUpdater('healthier_reframe');

  private async loadCheckin(date?: string): Promise<void> {
    try {
      const when = date || new Date().toISOString().split('T')[0];
      const idb = new IndexedDbDataService();

      // Load day-specific questions first (may be stored with midday entries)
      const questionsRaw = await idb.getMiddayQuestions(when);
      const qObj = (questionsRaw as Record<string, string> | null) || null;
      const midday_question = qObj?.midday_question || this.props.daySpecificQuestion || '';
      const core_value = qObj?.core_value || this.props.coreValue || '';
      const intention = qObj?.intention || this.props.intention || '';

      this.props.daySpecificQuestion = midday_question;
      this.props.coreValue = core_value;
      this.props.coreValueLower = core_value.toLowerCase();
      this.props.intention = intention;
      this.render();

      // Then try to load an existing midday checkin for the date
      const checkin = await idb.getMiddayCheckin(when);
      if (checkin) {
        this.hasExistingCheckin = true;
        this.existingData = checkin;
        this.props.defensive_moment = checkin.defensive_moment || '';
        this.props.initial_thought = checkin.initial_thought || '';
        this.props.healthier_reframe = checkin.healthier_reframe || '';
        this.updateFormValues(this.fieldMappings);
      }

      // Update header with date and contextual values
      this.updateHeaderValues('#midday-header', {
        title: 'Midday Reflection',
        description: `Pause and reflect on ${this.formatDate(when)}`,
        coreValue: this.props.coreValue,
        intention: this.props.intention,
        metadata: `<div class="date-label">${this.formatDate(when)}</div>`,
      });
    } catch (error) {
      logger.error('Error loading midday check-in', { error, date });
    }
  }

  async handleSubmit(event: Event): Promise<void> {
    const dataBuilder = (): IMiddayCheckinData => ({
      defensive_moment: this.props.defensive_moment,
      initial_thought: this.props.initial_thought,
      healthier_reframe: this.props.healthier_reframe,
    });

    const apiCall = async (data: IMiddayCheckinData) => {
      // Check if we're saving to a historic date
      const today = new Date().toISOString().split('T')[0];
      const idb = new IndexedDbDataService();
      if (this.targetDate && this.targetDate !== today) {
        // For historic dates, include check_date in the midday checkin data
        const dateAwareData = {
          ...data,
          check_date: this.targetDate,
        } as unknown as IMiddayCheckinData & { check_date: string };
        const result = await idb.setMiddayCheckin(dateAwareData);
        this.hasExistingCheckin = true;
        this.existingData = data;
        this.props.defensive_moment = data.defensive_moment;
        this.props.initial_thought = data.initial_thought;
        this.props.healthier_reframe = data.healthier_reframe;
        return result;
      } else {
        // For today, use the regular midday checkin endpoint without check_date
        const result = await idb.setMiddayCheckin(data);
        this.hasExistingCheckin = true;
        this.existingData = data;
        this.props.defensive_moment = data.defensive_moment;
        this.props.initial_thought = data.initial_thought;
        this.props.healthier_reframe = data.healthier_reframe;
        return result;
      }
    };

    await this.handleFormSubmit(
      event,
      null,
      dataBuilder,
      apiCall,
      'Midday reflection saved successfully!',
      'midday check-in',
    );
  }

  loadData(data: Partial<IMiddayCheckinData>): void {
    this.loadFormData(data, this.fieldMappings);
  }

  public setDate(date: string): void {
    this.targetDate = date;
    this.loadCheckin(date);
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

customElements.define('midday-checkin', MiddayCheckin);
