import { IEveningCheckinData } from './IEveningCheckinData';

export interface IGrowthIntentionData {
  core_value: string;
  intention: string;
  reflection: string;
  midday_question: string;
  evening_questions: IEveningCheckinData;
  week_theme: string;
  focus: string;
}
