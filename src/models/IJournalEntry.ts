import { ISectionState, ValueChallengePair } from './index.ts';

export interface IJournalEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  createdAt: string;
  updatedAt: string;
  log?: string;
  morningIntention?: ISectionState;
  middayCheckin?: ISectionState;
  eveningReflection?: ISectionState;
  accountability?: ISectionState;
  tags?: string[];
  valueChallenge?: ValueChallengePair;
}
