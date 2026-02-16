import { MsgKey } from '../i18n/i18n.ts';
import { Question } from './Question.ts';
import { SectionKind } from './SectionKind.ts';

export interface ISectionTemplate {
  id: string; // e.g., "morning-v1"
  kind: SectionKind;
  titleKey: MsgKey; // e.g., 'sec.morning.title'
  descriptionKey?: MsgKey;
  questions: Question[];
  version: number;
}
