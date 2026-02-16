import { TemplateQuestion } from './TemplateQuestion.ts';

export interface TemplateSection {
  id: string;
  kind: string;
  titleKey: string;
  descriptionKey?: string;
  version: number;
  questions: TemplateQuestion[];
  value?: string;
  challenge?: string;
}
