import { IEveningCheckinData } from './IEveningCheckinData';

export interface IEveningQuestionsData extends IEveningCheckinData {
  core_value: string;
  intention: string;
}
