import type { IFormProps } from '../../Base/BaseFormComponent.ts';

export interface IEveningCheckinProps extends IFormProps {
  what_went_well: string;
  defensive_moments: string;
  better_response: string;
  empathy_practice: string;
  small_win: string;
  errorMessage: string;
  successMessage: string;
  isLoading: boolean;
  submitButtonText: string;
  loadingClass: string;
  whatWentWellQuestion?: string;
  defensiveMomentsQuestion?: string;
  empathyPracticeQuestion?: string;
  smallWinQuestion?: string;
  coreValue?: string;
  coreValueLower?: string;
  intention?: string;
}
