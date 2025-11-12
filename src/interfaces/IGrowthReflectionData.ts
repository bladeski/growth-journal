import type { IProgressMetrics } from './IProgressMetrics';

export interface IGrowthReflectionData {
  id?: number;
  date: string; // ISO date

  // reflection fields used by UI
  what_went_well?: string;
  defensive_moments?: string;
  defensive_thoughts?: string;
  healthier_reframe?: string;
  better_response?: string; // Evening checkin field
  empathy_practice?: string;
  // Prefer the plural `small_wins`. Older records used `small_win` — if you need
  // to migrate existing DB entries, convert `small_win` -> `small_wins`.
  small_wins?: string;
  trigger_analysis?: string;
  tomorrow_goal?: string;

  // aggregated metrics
  progress_metrics?: IProgressMetrics;

  // legacy/alternative
  reflection_text?: string;
  insights?: string;
  behaviour_change_notes?: string;
}
