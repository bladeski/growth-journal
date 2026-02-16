import { TemplateChoiceOption } from './TemplateChoiceOption.ts';

export interface TemplateQuestion {
  id: string;
  kind: string;
  promptKey: string;
  required?: boolean;
  placeholderKey?: string;
  helpTextKey?: string;
  options?: TemplateChoiceOption[];
}
