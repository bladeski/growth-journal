import type { IGrowthIntentionData, IGrowthReflectionData } from '../../interfaces';

export interface PersonalGrowthEvents {
  submit: {
    type: 'intention' | 'reflection';
    data:
      | IGrowthIntentionData
      | IGrowthReflectionData
      | { reflection?: IGrowthReflectionData; metrics?: Record<string, unknown> }
      | unknown;
  };
  cancel: void;
  editMorning: { date: string };
  editMidday: { date: string };
  editEvening: { date: string };
}
