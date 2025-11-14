import { BaseFormComponent } from '../Base/BaseFormComponent.ts';
import type { IMorningCheckinData } from '../../interfaces/index.ts';
import type { IMorningCheckinProps } from './interfaces/IMorningCheckinProps.ts';
import type { IMorningCheckinEvents } from './interfaces/IMorningCheckinEvents.ts';
import styles from 'bundle-text:./MorningCheckin.css';
import templateHtml from 'bundle-text:./MorningCheckin.pug';
import { LoggingService } from '@bladeski/logger';
import IndexedDbDataService from '../../data/IndexedDbDataService.ts';

const logger = LoggingService.getInstance();

export class MorningCheckin extends BaseFormComponent<IMorningCheckinProps, IMorningCheckinEvents> {
  private hasExistingCheckin = false;
  private existingData: IMorningCheckinData | null = null;
  private targetDate: string | null = null;

  private readonly fieldMappings = [
    { selector: '#practice-intention', propName: 'intention' },
    { selector: '#core-value', propName: 'core_value' },
  ];

  constructor() {
    super(
      () => templateHtml,
      {
        intention: '',
        core_value: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        submitButtonText: 'Save Morning Intentions',
        loadingClass: '',
      },
      [styles],
    );

    // Load today's checkin (or prefill) on creation
    this.loadCheckin();
  }

  render(): void {
    super.render();
    this.updateFormValues(this.fieldMappings);
    this.updateHeaderValues('#morning-header', {
      title: 'Morning Intentions',
      description: 'Set your intentions and focus for the day ahead',
    });
  }

  protected updateSubmitButton(): void {
    this.props.submitButtonText = this.props.isLoading ? 'Saving...' : 'Save Morning Intentions';
    super.updateSubmitButton();
  }

  updatePracticeIntention = this.createFieldUpdater('intention');
  updateCoreValueFocus = this.createFieldUpdater('core_value');

  private async loadCheckin(date?: string): Promise<void> {
    try {
      const when = date || new Date().toISOString().split('T')[0];
      const idb = new IndexedDbDataService();

      // Try to load an explicit morning checkin for the date
      const existing = await idb.getMorningCheckin(when);
      if (existing) {
        this.hasExistingCheckin = true;
        this.existingData = {
          intention: existing.intention,
          core_value: existing.core_value,
        };
        this.props.intention = existing.intention || '';
        this.props.core_value = existing.core_value || '';
        this.updateFormValues(this.fieldMappings);
      } else {
        // If no morning checkin, try to load a growth intention prefill for that date
        try {
          const growthPrefill = await idb.getGrowthIntention(when);
          if (growthPrefill) {
            this.props.intention = String(growthPrefill.intention || '');
            this.props.core_value = String(growthPrefill.core_value || '');
            this.updateFormValues(this.fieldMappings);
            this.hasExistingCheckin = !!(
              (this.props.intention && String(this.props.intention).trim()) ||
              (this.props.core_value && String(this.props.core_value).trim())
            );
          }
        } catch (growthError) {
          logger.info('No prefilled data available', { error: growthError });
        }
      }

      // Update header (if a specific date was passed, format it)
      this.updateHeaderValues('#morning-header', {
        title: 'Morning Intentions',
        description: `Set your intentions and focus for ${this.formatDate(when)}`,
        metadata: `<div class="date-label">${this.formatDate(when)}</div>`,
      });
    } catch (error) {
      logger.error('Error loading morning check-in', { error, date });
    }
  }

  async handleSubmit(event: Event): Promise<void> {
    const validator = () => {
      const data = {
        practice_intention: this.props.intention,
        core_value: this.props.core_value,
      };

      if (!data.practice_intention?.trim() || !data.core_value?.trim()) {
        return 'Please fill in both fields before saving.';
      }
      return null;
    };

    const dataBuilder = (): IMorningCheckinData => ({
      intention: String(this.props.intention || ''),
      core_value: String(this.props.core_value || ''),
    });

    const apiCall = async (data: IMorningCheckinData) => {
      let result;

      // If we have a target date that's not today, save to the intentions store
      const idb = new IndexedDbDataService();
      if (this.targetDate && this.targetDate !== new Date().toISOString().split('T')[0]) {
        const intentionData = {
          entry_date: this.targetDate,
          morning_intention: data.intention,
          core_value: data.core_value,
          date: this.targetDate,
        } as Record<string, unknown>;
        result = await idb.addGrowthIntention(intentionData);
      } else {
        // Otherwise save today's morning checkin
        result = await idb.setMorningCheckin(data);
      }

      this.hasExistingCheckin = true;
      this.existingData = data;
      this.props.intention = data.intention;
      this.props.core_value = data.core_value;
      return result;
    };

    await this.handleFormSubmit(
      event,
      validator,
      dataBuilder,
      apiCall,
      'Morning intentions saved successfully!',
      'morning check-in',
    );
  }

  loadData(data: Partial<IMorningCheckinData>): void {
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

customElements.define('morning-checkin', MorningCheckin);
