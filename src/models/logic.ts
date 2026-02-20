import { makeId } from '../utils/id.ts';
import { IJournalEntry } from './index.ts';
import { IQuestionResponse } from './IQuestion.ts';
import { ISectionState } from './ISectionState.ts';
import { ISectionTemplate } from './ISectionTemplate.ts';

export function emptySectionState(tpl: ISectionTemplate): ISectionState {
  return {
    templateId: tpl.id,
    kind: tpl.kind,
    responses: tpl.questions.map((q) => ({ questionId: q.id }))
  };
}

export function createJournalEntry(dateISO: string): IJournalEntry {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    date: dateISO.slice(0, 10),
    createdAt: now,
    updatedAt: now
  };
}

export function upsertResponse(section: ISectionState, response: IQuestionResponse): ISectionState {
  const idx = section.responses.findIndex((r) => r.questionId === response.questionId);
  const now = new Date().toISOString();
  const next = [...section.responses];
  if (idx >= 0) next[idx] = { ...next[idx], ...response, updatedAt: now };
  else next.push({ ...response, updatedAt: now });
  return { ...section, responses: next };
}
