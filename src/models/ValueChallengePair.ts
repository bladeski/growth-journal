import { ISectionTemplate } from './ISectionTemplate.ts';

export type ValueChallengePair = { value: string; challenge: string };

export type JournalDayTemplates = {
  morning: ISectionTemplate;
  midday: ISectionTemplate;
  evening: ISectionTemplate;
  accountability: ISectionTemplate;
};
