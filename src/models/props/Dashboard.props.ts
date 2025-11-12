export type RecentActivity = {
  morning: Array<{
    check_date: string;
    practice_intention: string;
    core_value_focus: string;
  }>;
  evening: Array<{
    check_date: string;
    what_went_well: string;
    small_win: string;
  }>;
};

export type DashboardProps = {
  morningCompleted: boolean;
  middayCompleted: boolean;
  eveningCompleted: boolean;
  morningStatusText: string;
  middayStatusText: string;
  eveningStatusText: string;
  recentMorningCount: number;
  recentMiddayCount: number;
  recentEveningCount: number;
  weeklyCount: number;
  monthlyCount: number;
  hasRecentActivity: boolean;
  recentActivity: RecentActivity;
  isLoading: boolean;
  completionPercentage: number;
};
