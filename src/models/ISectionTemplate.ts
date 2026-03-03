import { Question } from './Question.ts';
import { SectionKind } from './SectionKind.ts';

export interface ISectionTemplate {
  id: string; // e.g., "morning-v1"
  kind: SectionKind;
  title: string;
  description?: string;
  questions: Question[];
  version: number;
  value?: string;
  challenge?: string;
}
