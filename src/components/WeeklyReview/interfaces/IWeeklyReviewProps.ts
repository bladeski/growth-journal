import type { IFormProps } from '../../Base/BaseFormComponent.ts';

export interface IWeeklyReviewProps extends IFormProps {
  week_of?: string;
  skill_focused_on?: string;
  situation_handled_better?: string;
  situation_old_patterns?: string;
  what_triggered_me?: string;
  try_differently_next_week?: string;
  accountability_partner_feedback?: string;
  empathy_self_rating?: string;
  daysSinceLastReview?: number;
}
