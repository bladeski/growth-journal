import { IEveningCheckinData } from './IEveningCheckinData.ts';

export interface IEveningQuestionsData extends IEveningCheckinData {
  core_value: string;
  intention: string;
}
