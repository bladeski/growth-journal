import { BaseFormComponent } from '../BaseFormComponent';
import IndexedDbDataService from '../../data/IndexedDbDataService';
import type { IWeeklyReviewData } from '../../interfaces';
import type { WeeklyReviewProps, WeeklyReviewEvents } from '../../models';
import styles from 'bundle-text:./WeeklyReview.css';
import templateHtml from 'bundle-text:./WeeklyReview.pug';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

export class WeeklyReview extends BaseFormComponent<WeeklyReviewProps, WeeklyReviewEvents> {
  private hasExistingReview = false;
  private currentWeekStart = '';
  private _renderTimeout: number | null = null;

  private readonly fieldMappings = [
    { selector: '#skill-focused', propName: 'skill_focused_on' },
    { selector: '#empathy-rating', propName: 'empathy_self_rating' },
    { selector: '.rating-value', propName: 'empathy_self_rating' },
  ];

  constructor() {
    // Calculate current week start (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToMonday);
    const weekStartString = weekStart.toISOString().split('T')[0];

    super(
      () => templateHtml,
      {
        week_of: weekStartString,
        skill_focused_on: '',
        situation_handled_better: '',
        situation_old_patterns: '',
        what_triggered_me: '',
        try_differently_next_week: '',
        accountability_partner_feedback: '',
        empathy_self_rating: '5',
        errorMessage: '',
        successMessage: '',
        isLoading: false,
        submitButtonText: 'Save Weekly Review',
        loadingClass: '',
      },
      [styles],
    );

    this.currentWeekStart = weekStartString;
    this.loadReview();
  }

  render(): void {
    super.render();
    this.updateFormValues(this.fieldMappings);
    // schedule header update on next tick and keep the timeout id so we can clear on disconnect
    this._renderTimeout = window.setTimeout(() => {
      this.updateHeaderValues('#weekly-header', {
        title: 'Weekly Review',
        description: 'Reflect on your growth and patterns from this week',
        metadata: `Week of: <strong>${this.props.week_of}</strong>`,
      });
    }, 0);
  }

  protected updateSubmitButton(): void {
    this.props.submitButtonText = this.props.isLoading ? 'Saving...' : 'Save Weekly Review';
    this.props.loadingClass = this.props.isLoading ? 'loading' : '';
    super.updateSubmitButton();
  }

  updateSkillFocusedOn = this.createFieldUpdater('skill_focused_on');
  updateSituationHandledBetter = this.createFieldUpdater('situation_handled_better');
  updateSituationOldPatterns = this.createFieldUpdater('situation_old_patterns');
  updateWhatTriggeredMe = this.createFieldUpdater('what_triggered_me');
  updateTryDifferentlyNextWeek = this.createFieldUpdater('try_differently_next_week');
  updateAccountabilityPartnerFeedback = this.createFieldUpdater('accountability_partner_feedback');
  updateEmpathySelfRating = this.createFieldUpdater('empathy_self_rating');

  private async loadReview(week?: string): Promise<void> {
    try {
      const wk = week || this.currentWeekStart;
      const idb = new IndexedDbDataService();
      const response = await idb.getWeeklyReview(wk);

      const exists = !!response;

      if (exists && response && typeof response === 'object') {
        const data = response as unknown as Record<string, unknown>;
        this.hasExistingReview = true;
        this.props.week_of = (data.week_of as string) || this.currentWeekStart;
        this.props.skill_focused_on = (data.skill_focused_on as string) || '';
        this.props.situation_handled_better = (data.situation_handled_better as string) || '';
        this.props.situation_old_patterns = (data.situation_old_patterns as string) || '';
        this.props.what_triggered_me = (data.what_triggered_me as string) || '';
        this.props.try_differently_next_week = (data.try_differently_next_week as string) || '';
        this.props.accountability_partner_feedback =
          (data.accountability_partner_feedback as string) || '';
        this.props.empathy_self_rating =
          (data.empathy_self_rating as unknown as number)?.toString() || '5';
        this.render();
      } else {
        // getCurrentWeeklyReview may return exists:false with week_of supplied
        // in alternative response shapes — check multiple places for week_of
        const weekOf =
          (response as unknown as Record<string, unknown>)?.week_of ||
          ((response as unknown as Record<string, unknown>)?.data as Record<string, unknown>)
            ?.week_of ||
          this.currentWeekStart;
        this.props.week_of = weekOf as string;
        this.render();
      }
    } catch (error) {
      logger.error('Error loading weekly review', { error, week });
    }
  }

  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.props.isLoading) return;

    // Check HTML5 form validation
    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Validate required fields
    if (!this.props.skill_focused_on?.trim()) {
      this.props.errorMessage = 'Please fill in the skill you focused on most.';
      this.updateMessages();
      return;
    }

    this.props.isLoading = true;
    this.updateSubmitButton();
    this.clearMessages();

    const data: IWeeklyReviewData = {
      week_of: this.props.week_of,
      skill_focused_on: this.props.skill_focused_on,
      situation_handled_better: this.props.situation_handled_better,
      situation_old_patterns: this.props.situation_old_patterns,
      what_triggered_me: this.props.what_triggered_me,
      try_differently_next_week: this.props.try_differently_next_week,
      accountability_partner_feedback: this.props.accountability_partner_feedback,
      empathy_self_rating: parseInt(this.props.empathy_self_rating),
    };

    try {
      this.hasExistingReview = true;
      this.props.successMessage = 'Weekly review saved successfully!';
      this.updateMessages();

      // Dispatch event for parent components
      this.emit('submit', data);
    } catch (error) {
      logger.error('Error saving weekly review', { error });
      this.props.errorMessage = 'Network error. Please try again.';
      this.updateMessages();
    } finally {
      this.props.isLoading = false;
      this.updateSubmitButton();
    }
  }

  cancel(): void {
    this.emit('cancel', undefined);
  }

  protected onDisconnect(): void {
    if (this._renderTimeout != null) {
      clearTimeout(this._renderTimeout);
      this._renderTimeout = null;
    }
  }
}

customElements.define('weekly-review', WeeklyReview);
