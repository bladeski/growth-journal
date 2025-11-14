import { IEveningCheckinData } from '../../../interfaces/index.ts';

export interface IEveningCheckinEvents {
  submit: IEveningCheckinData;
  cancel: void;
}
