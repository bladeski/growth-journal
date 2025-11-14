import type { IFormProps } from '../../Base/BaseFormComponent.ts';

export interface IMorningCheckinProps extends IFormProps {
  intention: string;
  core_value: string;
}
