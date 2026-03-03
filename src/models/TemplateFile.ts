import { TemplateSection } from './TemplateSection.ts';

export type TemplateFile = {
  morning: TemplateSection;
  midday: TemplateSection;
  evening: TemplateSection;
  accountability: TemplateSection;
  'journal-entry'?: TemplateSection;
};
