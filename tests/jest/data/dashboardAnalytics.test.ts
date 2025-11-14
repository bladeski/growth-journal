import IndexedDbDataService from '../../../src/data/IndexedDbDataService';
import { installMockServiceWorker } from '../helpers/mockServiceWorker';

describe('IndexedDbDataService.getDashboardAnalytics', () => {
  afterEach(() => {
    if ((global as any).navigator && (global as any).navigator.serviceWorker) {
      (global as any).navigator.serviceWorker = undefined;
    }
  });

  test('computes counts and recent activity when checkins exist', async () => {
    // Simulate morning checkins for the last 3 days, midday for last 2, evening for last 1
    const today = new Date();
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);
    const recentDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return isoDate(d);
    });

    const morningSet = new Set(recentDates.slice(0, 3));
    const middaySet = new Set(recentDates.slice(0, 2));
    const eveningSet = new Set(recentDates.slice(0, 1));

    const uninstall = installMockServiceWorker((type, payload) => {
      // Return presence-only arrays for GetMorningCheckin/GetMiddayCheckin/GetEveningReflection
      if (type === 'IDB:GetMorningCheckin') {
        const date = payload as string;
        if (morningSet.has(date)) return { success: true, items: [{ date, check_date: date, intention: 'x' }] };
        return { success: true, items: [] };
      }
      if (type === 'IDB:GetMiddayCheckin') {
        const date = payload as string;
        if (middaySet.has(date)) return { success: true, items: [{ date, check_date: date }] };
        return { success: true, items: [] };
      }
      if (type === 'IDB:GetEveningReflection') {
        const date = payload as string;
        if (eveningSet.has(date)) return { success: true, items: [{ date, check_date: date, summary: 'ok' }] };
        return { success: true, items: [] };
      }

      // Weekly/monthly reviews return nothing
      if (type === 'IDB:GetWeeklyReview' || type === 'IDB:GetMonthlyReview') return { success: true, items: [] };

      return { success: false, error: 'unexpected' };
    });

    const svc = new IndexedDbDataService();
    const analytics = await svc.getDashboardAnalytics();

    expect(analytics.counts.recent_morning).toBe(3);
    expect(analytics.counts.recent_midday).toBe(2);
    expect(analytics.counts.recent_evening).toBe(1);
    expect(Array.isArray(analytics.recent_activity.morning)).toBe(true);
    expect(Array.isArray(analytics.recent_activity.evening)).toBe(true);

    uninstall();
  });
});
