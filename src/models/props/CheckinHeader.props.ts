import { PropTypes } from '..';

export interface CheckinHeaderProps extends PropTypes {
  title: string;
  description?: string;
  showDailyFocus?: boolean;
  coreValue?: string;
  intention?: string;
  metadata?: string; // For week_of or month_year display
}
