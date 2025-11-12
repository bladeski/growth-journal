import type {
  IGrowthIntentionData,
  IDashboardAnalytics,
  IMiddayQuestionsData,
  IEveningCheckinData,
  IMiddayCheckinData,
  IWeeklyReviewData,
  IMorningCheckinData,
  IMonthlyReflectionData,
  IDataService,
  IEveningQuestionsData,
} from '../interfaces';

type IdbResponse<T> = { success: true; items?: T } | { success: false; error: string };

/**
 * IndexedDbDataService
 * Communicates with the service worker via postMessage + MessageChannel to read/write
 * data in an IndexedDB instance managed by the service worker.
 */
export class IndexedDbDataService implements IDataService {
  private static ensureSW(): ServiceWorker | null {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return null;
    return navigator.serviceWorker.controller;
  }

  private static postMessage<TResult = unknown>(
    type: string,
    payload?: unknown,
  ): Promise<IdbResponse<TResult>> {
    return new Promise((resolve) => {
      const sw = IndexedDbDataService.ensureSW();
      if (!sw) return resolve({ success: false, error: 'No active service worker' });

      const channel = new MessageChannel();
      channel.port1.onmessage = (ev) => {
        const data = ev.data.payload as IdbResponse<TResult>;
        resolve(data);
      };
      // Use the ensured ServiceWorker (sw) to post the message; it implements postMessage
      try {
        sw.postMessage({ type, payload }, [channel.port2]);
      } catch (err) {
        // if postMessage isn't available for some reason, fail gracefully
        resolve({ success: false, error: String(err) });
      }
    });
  }

  // -- IDataService implementation (instance methods) --
  async getGrowthIntentions(): Promise<IGrowthIntentionData[]> {
    const resp =
      await IndexedDbDataService.postMessage<IGrowthIntentionData[]>('IDB:GetGrowthIntentions');
    if (!resp.success) return [];
    return (resp as { success: true; items?: IGrowthIntentionData[] }).items || [];
  }

  async setGrowthIntentions(intentions: IGrowthIntentionData[]): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:SetGrowthIntentions', intentions);
    return resp.success;
  }

  async getGrowthIntention(date: string): Promise<IGrowthIntentionData | null> {
    const resp =
      await IndexedDbDataService.postMessage<IGrowthIntentionData[]>('IDB:GetGrowthIntentions');
    if (!resp.success) return null;
    const dayOfMonth = new Date(date)?.getDate() - 1;
    const items = (resp as { success: true; items?: IGrowthIntentionData[] }).items || [];
    return items.length > 0 && items[dayOfMonth] ? items[dayOfMonth] : null;
  }

  async getMorningIntention(date: string): Promise<IGrowthIntentionData[]> {
    const resp = await IndexedDbDataService.postMessage<IGrowthIntentionData[]>(
      'IDB:GetMorningIntention',
      date,
    );
    if (!resp.success) return [];
    return (resp as { success: true; items?: IGrowthIntentionData[] }).items || [];
  }

  async setMorningCheckin(data: IMorningCheckinData): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddMorningCheckin', data);
    return resp.success;
  }

  async getMorningCheckin(date: string): Promise<IMorningCheckinData | null> {
    const resp = await IndexedDbDataService.postMessage<IMorningCheckinData[]>(
      'IDB:GetMorningCheckin',
      date,
    );
    if (!resp.success) return null;
    const items =
      (
        resp as {
          success: true;
          items?: IMorningCheckinData[];
        }
      ).items || [];
    return items.length > 0 ? items[0] : null;
  }

  async getMiddayQuestions(date: string): Promise<IMiddayQuestionsData | null> {
    const resp = await this.getGrowthIntention(date);
    if (!resp) return null;
    return {
      midday_question: resp.midday_question,
      core_value: resp.core_value,
      intention: resp.intention,
    };
  }

  async setMiddayCheckin(data: IMiddayCheckinData): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddMiddayCheckin', data);
    return resp.success;
  }

  async getMiddayCheckin(date: string): Promise<IMiddayCheckinData | null> {
    const resp = await IndexedDbDataService.postMessage<IMiddayCheckinData[]>(
      'IDB:GetMiddayCheckin',
      date,
    );
    if (!resp.success) return null;
    const items =
      (
        resp as {
          success: true;
          items?: IMiddayCheckinData[];
        }
      ).items || [];
    return items.length > 0 ? items[0] : null;
  }

  async getEveningQuestions(date: string): Promise<IEveningQuestionsData | null> {
    const resp = await this.getGrowthIntention(date);
    if (!resp) return null;
    return {
      ...resp.evening_questions,
      core_value: resp.core_value,
      intention: resp.intention,
    };
  }

  async setEveningReflection(data: IEveningCheckinData): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddEveningReflection', data);
    return resp.success;
  }

  async getEveningReflection(date: string): Promise<IEveningCheckinData | null> {
    const resp = await IndexedDbDataService.postMessage<IEveningCheckinData[]>(
      'IDB:GetEveningReflection',
      date,
    );
    if (!resp.success) return null;
    const items =
      (
        resp as {
          success: true;
          items?: IEveningCheckinData[];
        }
      ).items || [];
    return items.length > 0 ? items[0] : null;
  }

  async setWeeklyReview(data: IWeeklyReviewData): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddWeeklyReview', data);
    return resp.success;
  }

  async getWeeklyReview(date: string): Promise<IWeeklyReviewData | null> {
    const resp = await IndexedDbDataService.postMessage<IWeeklyReviewData[]>(
      'IDB:GetWeeklyReview',
      date,
    );
    if (!resp.success) return null;
    const items =
      (
        resp as {
          success: true;
          items?: IWeeklyReviewData[];
        }
      ).items || [];
    return items.length > 0 ? items[0] : null;
  }

  async setMonthlyReview(data: IMonthlyReflectionData): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddMonthlyReview', data);
    return resp.success;
  }

  async getMonthlyReview(date: string): Promise<IMonthlyReflectionData | null> {
    const resp = await IndexedDbDataService.postMessage<IMonthlyReflectionData[]>(
      'IDB:GetMonthlyReview',
      date,
    );
    if (!resp.success) return null;
    const items =
      (
        resp as {
          success: true;
          items?: IMonthlyReflectionData[];
        }
      ).items || [];
    return items.length > 0 ? items[0] : null;
  }

  async addGrowthIntention(data: Record<string, unknown>): Promise<boolean> {
    const resp = await IndexedDbDataService.postMessage('IDB:AddGrowthIntention', data);
    return resp.success;
  }

  async getDashboardAnalytics(): Promise<IDashboardAnalytics> {
    const days = 7;
    const today = new Date();
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const todayKey = isoDate(today);

    // helper to build array of recent date keys
    const recentDates = Array.from({ length: days }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return isoDate(d);
    });

    // Today status
    const [morningToday, middayToday, eveningToday] = await Promise.all([
      this.getMorningCheckin(todayKey),
      this.getMiddayCheckin(todayKey),
      this.getEveningReflection(todayKey),
    ]);

    // Recent counts
    const recentChecks = await Promise.all(
      recentDates.map(async (d) => ({
        date: d,
        morning: !!(await this.getMorningCheckin(d)),
        midday: !!(await this.getMiddayCheckin(d)),
        evening: !!(await this.getEveningReflection(d)),
      })),
    );

    const counts = {
      recent_morning: recentChecks.filter((c) => c.morning).length,
      recent_midday: recentChecks.filter((c) => c.midday).length,
      recent_evening: recentChecks.filter((c) => c.evening).length,
    } as Record<string, number | undefined>;

    // Weekly and monthly counts (best-effort using week_of / month keys)
    // week key: YYYY-WW (ISO week)
    const getISOWeekKey = (d: Date) => {
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      // Thursday in current week decides the year.
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${tmp.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
    };

    const weekKey = getISOWeekKey(today);
    const monthKey = today.toISOString().slice(0, 7); // YYYY-MM

    const [weeklyReview, monthlyReview] = await Promise.all([
      this.getWeeklyReview(weekKey),
      this.getMonthlyReview(monthKey),
    ]);

    if (weeklyReview) counts.this_week_weekly = 1;
    if (monthlyReview) counts.this_month_monthly = 1;

    // Recent activity arrays
    const recent_activity = {
      morning: [] as IDashboardAnalytics['recent_activity']['morning'],
      evening: [] as IDashboardAnalytics['recent_activity']['evening'],
    };

    type MaybeRecord = Record<string, unknown> | undefined | null;
    const asString = (v: unknown) => (typeof v === 'string' ? v : undefined);

    for (const d of recentDates) {
      const m = await this.getMorningCheckin(d);
      const mr = m as MaybeRecord;
      if (mr) {
        recent_activity.morning.push({
          check_date: asString(mr.check_date),
          date: asString(mr.date),
          practice_intention: asString(mr.practice_intention) || asString(mr.morning_intention),
          morning_intention: asString(mr.morning_intention) || undefined,
          core_value_focus: asString(mr.core_value_focus) || undefined,
          core_value: asString(mr.core_value) || undefined,
        });
      }
      const e = await this.getEveningReflection(d);
      const er = e as MaybeRecord;
      if (er) {
        recent_activity.evening.push({
          check_date: asString(er.check_date),
          date: asString(er.date),
          what_went_well: asString(er.what_went_well) || asString(er.summary),
          summary: asString(er.summary) || undefined,
          small_win: asString(er.small_win) || asString(er.small_win_text) || undefined,
          small_win_text: asString(er.small_win_text) || undefined,
        });
      }
    }

    const analytics: IDashboardAnalytics = {
      today_status: {
        morning_completed: !!morningToday,
        midday_completed: !!middayToday,
        evening_completed: !!eveningToday,
      },
      counts,
      recent_activity,
    };

    return analytics;
  }
}

export default IndexedDbDataService;
