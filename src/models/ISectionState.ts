import { IQuestionResponse } from './IQuestion.ts';
import { SectionKind } from './SectionKind.ts';

export interface ISectionState {
  templateId: string; // which template this follows
  kind: SectionKind;
  responses: IQuestionResponse[];
  startedAt?: string; // ISO
  completedAt?: string; // ISO
}
