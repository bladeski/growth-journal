import { IFormProps } from '../../Base/BaseFormComponent.ts';

export interface IMonthlyReflectionProps extends IFormProps {
  month_year?: string;
  genuine_apologies_given?: string;
  times_paused_before_reacting?: string;
  accountability_partner_feedback_score?: string;
  biggest_growth_moment?: string;
  biggest_challenge?: string;
  new_goal_next_month?: string;
}
