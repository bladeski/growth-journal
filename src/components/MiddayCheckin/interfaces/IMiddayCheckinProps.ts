import { IFormProps } from '../../Base/BaseFormComponent.ts';

export interface IMiddayCheckinProps extends IFormProps {
  defensive_moment?: string;
  initial_thought?: string;
  healthier_reframe?: string;
  // UI-specific helpers used by the component
  daySpecificQuestion?: string;
  coreValue?: string;
  coreValueLower?: string;
  intention?: string;
}
