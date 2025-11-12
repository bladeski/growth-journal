export interface IDashboardAnalytics {
  today_status: {
    morning_completed: boolean;
    midday_completed: boolean;
    evening_completed: boolean;
  };
  counts: {
    recent_morning?: number;
    recent_midday?: number;
    recent_evening?: number;
    this_week_weekly?: number;
    this_month_monthly?: number;
    [key: string]: number | undefined;
  };
  recent_activity: {
    morning: Array<{
      check_date?: string;
      date?: string;
      intention?: string;
      core_focus?: string;
    }>;
    evening: Array<{
      check_date?: string;
      date?: string;
      what_went_well?: string;
      summary?: string;
      small_win?: string;
      small_win_text?: string;
    }>;
  };
}
