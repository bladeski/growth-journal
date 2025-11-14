import type { IPropTypes } from '../../Base/interfaces/IPropTypes.ts';

/** A single recent activity item used in dashboard insights */
export interface IRecentActivityItem {
  check_date: string; // ISO date (YYYY-MM-DD) or display string
  intention?: string; // morning intention text
  small_win?: string; // evening small win text
  [key: string]: unknown; // allow other fields (legacy shapes)
}

export interface IDashboardProps extends IPropTypes {
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
  // recentActivity contains arrays of recent items with a known shape
  recentActivity: {
    morning: IRecentActivityItem[];
    evening: IRecentActivityItem[];
  };
  isLoading: boolean;
  completionPercentage: number; // 0-100
}
