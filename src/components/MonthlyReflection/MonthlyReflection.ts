import { BaseFormComponent } from '../Base/BaseFormComponent.ts';
import IndexedDbDataService from '../../data/IndexedDbDataService.ts';
import type { IMonthlyReflectionData } from '../../interfaces/index.ts';
import type { IMonthlyReflectionProps } from './interfaces/IMonthlyReflectionProps.ts';
import type { IMonthlyReflectionEvents } from './interfaces/IMonthlyReflectionEvents.ts';
import styles from 'bundle-text:./MonthlyReflection.css';
import templateHtml from 'bundle-text:./MonthlyReflection.pug';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

export class MonthlyReflection extends BaseFormComponent<
  IMonthlyReflectionProps,
  IMonthlyReflectionEvents
> {
  private hasExistingReflection = false;
  private currentMonth = '';
  private _renderTimeout: number | null = null;

  private readonly fieldMappings = [
    { selector: '#apologies-given', propName: 'genuine_apologies_given' },
    { selector: '#paused-reactions', propName: 'times_paused_before_reacting' },
    { selector: '#partner-score', propName: 'accountability_partner_feedback_score' },
    { selector: '.rating-value', propName: 'accountability_partner_feedback_score' },
  ];

  constructor() {
    // Calculate current month
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthYearCode = now.toISOString().slice(0, 7); // YYYY-MM format

    super(
      () => templateHtml,
      {
        month_year: monthYear,
        genuine_apologies_given: '0',
        times_paused_before_reacting: '0',
        accountability_partner_feedback_score: '5',
        biggest_growth_moment: '',
        biggest_challenge: '',
        new_goal_next_month: '',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        submitButtonText: 'Save Monthly Reflection',
        loadingClass: '',
      },
      [styles],
    );

    this.currentMonth = monthYearCode;
    this.loadReflection();
  }

  render(): void {
    super.render();
    this.updateFormValues(this.fieldMappings);
    this._renderTimeout = window.setTimeout(() => {
      this.updateHeaderValues('#monthly-header', {
        title: 'Monthly Reflection',
        description: 'Deep dive into your growth patterns and progress',
        metadata: `Month: <strong>${this.props.month_year}</strong>`,
      });
    }, 0);
  }

  protected onDisconnect(): void {
    if (this._renderTimeout != null) {
      clearTimeout(this._renderTimeout);
      this._renderTimeout = null;
    }
  }

  protected updateSubmitButton(): void {
    this.props.submitButtonText = this.props.isLoading ? 'Saving...' : 'Save Monthly Reflection';
    this.props.loadingClass = this.props.isLoading ? 'loading' : '';
    super.updateSubmitButton();
  }

  updateGenuineApologiesGiven = this.createFieldUpdater('genuine_apologies_given');
  updateTimesPausedBeforeReacting = this.createFieldUpdater('times_paused_before_reacting');
  updateAccountabilityPartnerFeedbackScore = this.createFieldUpdater(
    'accountability_partner_feedback_score',
  );
  updateBiggestGrowthMoment = this.createFieldUpdater('biggest_growth_moment');
  updateBiggestChallenge = this.createFieldUpdater('biggest_challenge');
  updateNewGoalNextMonth = this.createFieldUpdater('new_goal_next_month');

  private async loadReflection(month?: string): Promise<void> {
    try {
      const m = month || this.currentMonth;
      const idb = new IndexedDbDataService();
      const response = await idb.getMonthlyReview(m);

      const exists = !!response;

      if (exists && response && typeof response === 'object') {
        const data = response as unknown as Record<string, unknown>;
        this.hasExistingReflection = true;

        // Map canonical fields directly from the response to props.
        // Coerce numbers/other values to strings where the component expects string props.
        const mapString = (val: unknown) => (val == null ? '' : String(val));

        this.props.month_year = mapString(data.month_year ?? this.currentMonth);
        this.props.genuine_apologies_given = mapString(data.genuine_apologies_given ?? '0');
        this.props.times_paused_before_reacting = mapString(
          data.times_paused_before_reacting ?? '0',
        );
        this.props.accountability_partner_feedback_score = mapString(
          data.accountability_partner_feedback_score ?? '5',
        );
        this.props.biggest_growth_moment = mapString(data.biggest_growth_moment ?? '');
        this.props.biggest_challenge = mapString(data.biggest_challenge ?? '');
        this.props.new_goal_next_month = mapString(data.new_goal_next_month ?? '');

        this.render();
      } else {
        // No data - default to the computed month string
        this.props.month_year = m;
        this.render();
      }
    } catch (error) {
      logger.error('Error loading monthly reflection', { error, month });
    }
  }

  async handleSubmit(event: Event): Promise<void> {
    await this.handleFormSubmit(
      event,
      null, // No custom validation needed beyond HTML5
      () => ({
        month_year: this.currentMonth, // Use YYYY-MM format for API
        genuine_apologies_given: parseInt(this.props.genuine_apologies_given || '0') || 0,
        times_paused_before_reacting: parseInt(this.props.times_paused_before_reacting || '0') || 0,
        accountability_partner_feedback_score:
          parseInt(this.props.accountability_partner_feedback_score || '5') || undefined,
        biggest_growth_moment: (this.props.biggest_growth_moment || '').trim(),
        biggest_challenge: (this.props.biggest_challenge || '').trim(),
        new_goal_next_month: (this.props.new_goal_next_month || '').trim(),
      }),
      (data: IMonthlyReflectionData) => {
        const idb = new IndexedDbDataService();
        return idb.setMonthlyReview(data);
      },
      'Monthly reflection saved successfully!',
      'monthly reflection',
    );

    // Dispatch event for parent components if successful
    if (this.props.successMessage) {
      const data: IMonthlyReflectionData = {
        month_year: this.currentMonth,
        genuine_apologies_given: parseInt(this.props.genuine_apologies_given || '0') || 0,
        times_paused_before_reacting: parseInt(this.props.times_paused_before_reacting || '0') || 0,
        accountability_partner_feedback_score:
          parseInt(this.props.accountability_partner_feedback_score || '5') || undefined,
        biggest_growth_moment: (this.props.biggest_growth_moment || '').trim(),
        biggest_challenge: (this.props.biggest_challenge || '').trim(),
        new_goal_next_month: (this.props.new_goal_next_month || '').trim(),
      };
      this.hasExistingReflection = true;
      this.emit('submit', data);
    }
  }

  cancel(): void {
    this.emit('cancel', undefined);
  }

  loadData(data: Partial<IMonthlyReflectionData>): void {
    this.loadFormData(data, this.fieldMappings);
  }
}

customElements.define('monthly-reflection', MonthlyReflection);
