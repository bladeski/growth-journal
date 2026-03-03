import { ISectionState, ValueChallengePair } from './index.ts';

export interface IJournalEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  createdAt: string;
  updatedAt: string;
  log?: string;
  journalLog?: ISectionState;
  morningIntention?: ISectionState;
  middayCheckin?: ISectionState;
  eveningReflection?: ISectionState;
  accountability?: ISectionState;
  tags?: string[];
  valueChallenge?: ValueChallengePair;
}
