import { BaseComponent } from '../Base/BaseComponent.ts';
import type { IDashboardAnalytics } from '../../interfaces/IDashboardAnalytics.ts';
import styles from 'bundle-text:./Dashboard.css';
import templateHtml from 'bundle-text:./Dashboard.pug';
import IndexedDbDataService from '../../data/IndexedDbDataService.ts';
import type { IDashboardProps } from './interfaces/IDashboardProps.ts';
import type { IDashboardEvents } from './interfaces/IDashboardEvents.ts';
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

export class DashboardComponent extends BaseComponent<IDashboardProps, IDashboardEvents> {
  constructor() {
    super(
      () => templateHtml,
      {
        morningCompleted: false,
        middayCompleted: false,
        eveningCompleted: false,
        morningStatusText: 'Pending',
        middayStatusText: 'Pending',
        eveningStatusText: 'Pending',
        recentMorningCount: 0,
        recentMiddayCount: 0,
        recentEveningCount: 0,
        weeklyCount: 0,
        monthlyCount: 0,
        hasRecentActivity: false,
        recentActivity: { morning: [], evening: [] },
        isLoading: true,
        completionPercentage: 0,
      },
      [styles],
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Temporary debug marker: helps confirm the component mounted in the browser
    try {
      // visible light-DOM marker so it's obvious without inspecting shadowRoot
      const dbg = document.createElement('div');
      dbg.textContent = 'DASHBOARD MOUNTED (debug)';
      dbg.style.cssText =
        'padding:6px;background:#fffbdd;border:1px solid #ffd966;color:#333;font-weight:600;margin:6px 0';
      this.appendChild(dbg);
      // console marker
      logger.debug('[DEBUG] growth-dashboard connected');
    } catch (e) {
      // ignore host DOM debug failures
    }

    this.loadDashboardData();
  }

  render(): void {
    super.render();
    // After the base render, update classes based on data-status attributes
    this.updateStatusClasses();
    this.updateProgressBar();
    this.updateInsightsDisplay();
  }

  private updateProgressBar(): void {
    if (!this.shadowRoot) return;

    // Update header progress bar
    const headerProgressFill = this.shadowRoot.querySelector(
      '.header-progress-fill',
    ) as HTMLElement;
    if (headerProgressFill) {
      headerProgressFill.style.width = `${this.props.completionPercentage}%`;
    }
  }

  private updateInsightsDisplay(): void {
    if (!this.shadowRoot) return;

    const insightsList = this.shadowRoot.querySelector('.insights-list');
    if (!insightsList) return;

    // Clear existing content
    insightsList.innerHTML = '';

    if (!this.props.hasRecentActivity) {
      const noInsights = document.createElement('div');
      noInsights.className = 'no-insights';
      noInsights.textContent = 'Start your first check-in to see insights here!';
      insightsList.appendChild(noInsights);
      return;
    }

    // Display morning intentions
    if (this.props.recentActivity.morning.length > 0) {
      const morningHeading = document.createElement('h3');
      morningHeading.textContent = 'Morning Intentions';
      insightsList.appendChild(morningHeading);

      this.props.recentActivity.morning.forEach((item) => {
        const insightItem = document.createElement('div');
        insightItem.className = 'insight-item';

        const insightDate = document.createElement('div');
        insightDate.className = 'insight-date';
        insightDate.textContent = String(item.check_date || '');

        const insightText = document.createElement('div');
        insightText.className = 'insight-text';

        const strong = document.createElement('strong');
        strong.textContent = 'Practice: ';
        const span = document.createElement('span');
        span.textContent = item.intention || '';

        insightText.appendChild(strong);
        insightText.appendChild(span);

        insightItem.appendChild(insightDate);
        insightItem.appendChild(insightText);
        insightsList.appendChild(insightItem);
      });
    }

    // Display evening wins
    if (this.props.recentActivity.evening.length > 0) {
      const eveningHeading = document.createElement('h3');
      eveningHeading.textContent = 'Evening Wins';
      insightsList.appendChild(eveningHeading);

      this.props.recentActivity.evening.forEach((item) => {
        const insightItem = document.createElement('div');
        insightItem.className = 'insight-item';

        const insightDate = document.createElement('div');
        insightDate.className = 'insight-date';
        insightDate.textContent = String(item.check_date || '');

        const insightText = document.createElement('div');
        insightText.className = 'insight-text';

        const strong = document.createElement('strong');
        strong.textContent = 'Win: ';
        const span = document.createElement('span');
        span.textContent = item.small_win || '';

        insightText.appendChild(strong);
        insightText.appendChild(span);

        insightItem.appendChild(insightDate);
        insightItem.appendChild(insightText);
        insightsList.appendChild(insightItem);
      });
    }
  }

  private updateStatusClasses(): void {
    if (!this.shadowRoot) return;

    // Update morning status
    const morningItem = this.shadowRoot.querySelector('.morning-item');
    if (morningItem) {
      morningItem.classList.remove('completed', 'pending');
      morningItem.classList.add(this.props.morningCompleted ? 'completed' : 'pending');
    }

    // Update midday status
    const middayItem = this.shadowRoot.querySelector('.midday-item');
    if (middayItem) {
      middayItem.classList.remove('completed', 'pending');
      middayItem.classList.add(this.props.middayCompleted ? 'completed' : 'pending');
    }

    // Update evening status
    const eveningItem = this.shadowRoot.querySelector('.evening-item');
    if (eveningItem) {
      eveningItem.classList.remove('completed', 'pending');
      eveningItem.classList.add(this.props.eveningCompleted ? 'completed' : 'pending');
    }
  }

  async loadDashboardData(): Promise<void> {
    this.props.isLoading = true;

    try {
      const idb = new IndexedDbDataService();
      const analytics = (await idb.getDashboardAnalytics()) as IDashboardAnalytics | undefined;
      // Debug: log the raw analytics payload so we can inspect why statuses may
      // be reported as completed unexpectedly (useful while diagnosing SW/IDB data).
      try {
        logger.debug('[DEBUG] getDashboardAnalytics ->', { analytics });
      } catch (e) {
        // Logging should never break functionality; swallow logging errors
      }

      const todayStatus = analytics?.today_status || {
        morning_completed: false,
        midday_completed: false,
        evening_completed: false,
      };

      // Debug: show the todayStatus mapping applied to the dashboard
      try {
        logger.debug('[DEBUG] todayStatus resolved ->', { todayStatus });
      } catch (e) {
        // swallow
      }

      this.props.morningCompleted = !!todayStatus.morning_completed;
      this.props.middayCompleted = !!todayStatus.midday_completed;
      this.props.eveningCompleted = !!todayStatus.evening_completed;

      this.updateStatusProperties();

      const counts = analytics?.counts || {};
      this.props.recentMorningCount = (counts as Record<string, number>).recent_morning || 0;
      this.props.recentMiddayCount = (counts as Record<string, number>).recent_midday || 0;
      this.props.recentEveningCount = (counts as Record<string, number>).recent_evening || 0;
      this.props.weeklyCount = (counts as Record<string, number>).this_week_weekly || 0;
      this.props.monthlyCount = (counts as Record<string, number>).this_month_monthly || 0;

      const recent = analytics?.recent_activity || { morning: [], evening: [] };
      this.props.recentActivity = recent as unknown as typeof this.props.recentActivity;
      this.props.hasRecentActivity =
        this.props.recentActivity.morning.length > 0 ||
        this.props.recentActivity.evening.length > 0;

      this.render();
    } catch (error) {
      // ignore errors
    } finally {
      this.props.isLoading = false;
    }
  }

  private updateStatusProperties(): void {
    this.props.morningStatusText = this.props.morningCompleted ? 'Complete' : 'Pending';
    this.props.middayStatusText = this.props.middayCompleted ? 'Complete' : 'Pending';
    this.props.eveningStatusText = this.props.eveningCompleted ? 'Complete' : 'Pending';

    // Update the CSS classes after props change
    this.updateStatusClasses();
    // Update the progress bar after status changes
    this.updateProgressBar();
  }

  newMorningCheckin(): void {
    this.emit('newMorningCheckin', undefined);
  }

  newMiddayCheckin(): void {
    this.emit('newMiddayCheckin', undefined);
  }

  newEveningCheckin(): void {
    this.emit('newEveningCheckin', undefined);
  }

  newWeeklyReview(): void {
    this.emit('newWeeklyReview', undefined);
  }

  newMonthlyReflection(): void {
    this.emit('newMonthlyReflection', undefined);
  }

  viewAnalytics(): void {
    this.emit('viewAnalytics', undefined);
  }

  openPersonalGrowth(): void {
    this.emit('openPersonalGrowth', undefined);
  }

  // Public method to refresh dashboard. Return the underlying promise so callers
  // (and tests) can await completion.
  refresh(): Promise<void> {
    return this.loadDashboardData();
  }
}

customElements.define('growth-dashboard', DashboardComponent);
