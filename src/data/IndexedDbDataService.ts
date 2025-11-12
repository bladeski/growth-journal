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
} from '../interfaces/index';

type IdbResponse<T> = { success: true; items?: T } | { success: false; error: string };

/**
 * IndexedDbDataService
 * Communicates with the service worker via postMessage + MessageChannel to read/write
 * data in an IndexedDB instance managed by the service worker.
 */
export class IndexedDbDataService implements IDataService {
  private static ensureSW(): ServiceWorker | null {
    // If the current page is controlled by a service worker, return its controller.
    // In deployed environments the page may not be immediately controlled after registration;
    // callers should use postMessage which also attempts to use the active registration when needed.
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      return navigator.serviceWorker.controller;
    }
    return null;
  }

  private static async postMessage<TResult = unknown>(
    type: string,
    payload?: unknown,
  ): Promise<IdbResponse<TResult>> {
    // Try to use the controller first. If none, wait for the service worker to be ready
    // and use the active worker from the registration. This handles deployed pages that
    // registered the SW but are not yet controlled.
    let sw: ServiceWorker | null = IndexedDbDataService.ensureSW();

    if (!sw && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          sw = registration.active || registration.installing || registration.waiting || null;
        } else {
          sw = null;
        }
      } catch (e) {
        // ignore and fall through to error reply below
      }
    }

    if (!sw) return { success: false, error: 'No active service worker' };

    return await new Promise<IdbResponse<TResult>>((resolve) => {
      const channel = new MessageChannel();
      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) resolve({ success: false, error: 'Service worker response timeout' });
      }, 5000);

      channel.port1.onmessage = (ev: MessageEvent) => {
        responded = true;
        clearTimeout(timeout);
        const data =
          (ev.data && (ev.data.payload as IdbResponse<TResult>)) ||
          (ev.data as IdbResponse<TResult> | undefined);
        if (data) return resolve(data);
        return resolve({ success: false, error: 'Invalid response from service worker' });
      };

      try {
        sw.postMessage({ type, payload }, [channel.port2]);
      } catch (err) {
        clearTimeout(timeout);
        if (!responded) resolve({ success: false, error: String(err) });
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
          // normalize legacy fields into canonical names used by UI/components
          intention:
            asString(mr.practice_intention) ||
            asString(mr.morning_intention) ||
            asString(mr.intention) ||
            undefined,
          core_focus:
            asString(mr.core_value_focus) ||
            asString(mr.core_value) ||
            asString(mr.focus) ||
            undefined,
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
