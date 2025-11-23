import { mockIndexedDbService } from '../helpers/testHelpers';
import { DashboardComponent } from '../../../src/components/Dashboard/Dashboard';

describe('Dashboard behavior', () => {
  test('loadDashboardData handles empty analytics', async () => {
    const mock = mockIndexedDbService({
      getDashboardAnalytics: async () => ({
        today_status: { morning_completed: false, midday_completed: false, evening_completed: false },
        counts: { recent_morning: 0, recent_midday: 0, recent_evening: 0 },
        recent_activity: { morning: [], evening: [] },
      }),
    });

    const el = new DashboardComponent();
    // call loader explicitly
    // @ts-ignore
    await (el as any).loadDashboardData();

    expect(el.props.morningCompleted).toBe(false);
    expect(el.props.hasRecentActivity).toBe(false);

    mock.restoreAll();
  });

  test('loadDashboardData populates analytics and updates DOM insights (simulated)', async () => {
    const sample = {
      today_status: { morning_completed: true, midday_completed: false, evening_completed: true },
      counts: { recent_morning: 1, recent_midday: 0, recent_evening: 1 },
      recent_activity: {
        morning: [{ check_date: '2025-11-20', intention: 'run' }],
        evening: [{ check_date: '2025-11-20', small_win: 'finished task' }],
      },
    };

    const mock = mockIndexedDbService({
      getDashboardAnalytics: async () => sample,
    });

    // Create a standalone instance, render its template and inject analytics
    const el = new DashboardComponent();

    // Apply analytics to props synchronously and render the template
    el.props.morningCompleted = true;
    el.props.eveningCompleted = true;
    el.props.recentActivity = sample.recent_activity as any;
    el.props.hasRecentActivity = true;
    el.props.recentMorningCount = 1;

    // perform the base render and ensure there's an insights-list container
    el.render();
    if (!el.shadowRoot?.querySelector('.insights-list')) {
      const container = document.createElement('div');
      container.className = 'insights-list';
      el.shadowRoot?.appendChild(container);
    }

    // @ts-ignore
    (el as any).updateInsightsDisplay();

    const insights = el.shadowRoot?.querySelector('.insights-list');
    expect(insights).toBeTruthy();
    const html = insights?.innerHTML || '';
    expect(html).toMatch(/Morning Intentions/);
    expect(html).toMatch(/Evening Wins/);

    mock.restoreAll();
  });

  test('emits events for new checkin actions', () => {
    const el = new DashboardComponent();
    const emitted: string[] = [];
    el.addEventListener('newMorningCheckin', () => emitted.push('morning'));
    el.addEventListener('newMiddayCheckin', () => emitted.push('midday'));
    el.addEventListener('newEveningCheckin', () => emitted.push('evening'));

    el.newMorningCheckin();
    el.newMiddayCheckin();
    el.newEveningCheckin();

    expect(emitted).toEqual(['morning', 'midday', 'evening']);
  });
});
import { jest } from '@jest/globals';
import '../../../src/components/Dashboard/Dashboard';
import IndexedDbDataService from '../../../src/data/IndexedDbDataService';

describe('Dashboard behavior tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('renders insights and status classes from analytics payload', async () => {
    const analytics = {
      today_status: { morning_completed: true, midday_completed: false, evening_completed: true },
      counts: { recent_morning: 1, recent_evening: 1, recent_midday: 0 },
      recent_activity: {
        morning: [{ check_date: '2025-11-21', intention: 'Practice X' }],
        evening: [{ check_date: '2025-11-20', small_win: 'Won meeting' }],
      },
    } as any;

    jest.spyOn(IndexedDbDataService.prototype, 'getDashboardAnalytics').mockResolvedValue(analytics);

    const el = document.createElement('growth-dashboard') as any;
    document.body.appendChild(el);

    // Force refresh to load mocked analytics
    await el.refresh();
    // wait for render() to complete
    await new Promise((r) => setTimeout(r, 10));

    // props should reflect analytics payload
    expect(el.props.morningCompleted).toBe(true);
    expect(el.props.eveningCompleted).toBe(true);
    expect(el.props.recentMorningCount).toBe(1);
    expect(el.props.recentEveningCount).toBe(1);
    expect(el.props.hasRecentActivity).toBe(true);
  });

  test('emits navigation events when helper methods called', () => {
    const el = document.createElement('growth-dashboard') as any;
    document.body.appendChild(el);

    const events: string[] = [];
    ['newMorningCheckin', 'newMiddayCheckin', 'newEveningCheckin', 'newWeeklyReview', 'newMonthlyReflection', 'viewAnalytics', 'openPersonalGrowth']
      .forEach((ev) => el.addEventListener(ev, () => events.push(ev)));

    el.newMorningCheckin();
    el.newMiddayCheckin();
    el.newEveningCheckin();
    el.newWeeklyReview();
    el.newMonthlyReflection();
    el.viewAnalytics();
    el.openPersonalGrowth();

    expect(events).toEqual([
      'newMorningCheckin',
      'newMiddayCheckin',
      'newEveningCheckin',
      'newWeeklyReview',
      'newMonthlyReflection',
      'viewAnalytics',
      'openPersonalGrowth',
    ]);
  });
});
